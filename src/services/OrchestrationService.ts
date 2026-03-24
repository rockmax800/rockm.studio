// IMPORTANT:
// All state changes MUST go through OrchestrationService.
// Direct prisma update of state field is forbidden.

import { validateTransition, type EntityType, type TransitionContext } from "@/guards";
import { ConcurrencyError } from "@/guards/ConcurrencyError";
import { taskStateToZone } from "@/lib/officeZones";

interface PrismaTransactionClient {
  [key: string]: {
    findUniqueOrThrow: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    updateMany: (args: any) => Promise<{ count: number }>;
    create: (args: any) => Promise<any>;
  };
}

interface PrismaLike {
  $transaction: <T>(fn: (tx: PrismaTransactionClient) => Promise<T>, options?: any) => Promise<T>;
}

type ActorType = "founder" | "system" | "agent_role";

interface TransitionParams {
  entityType: EntityType;
  entityId: string;
  toState: string;
  actorType: ActorType;
  actorRoleId?: string | null;
  projectId: string;
  metadata?: Record<string, unknown>;
  guardContext?: TransitionContext;
}

const ENTITY_TABLE_MAP: Record<EntityType, string> = {
  project: "projects",
  task: "tasks",
  run: "runs",
  artifact: "artifacts",
  review: "reviews",
  approval: "approvals",
};

export class OrchestrationService {
  private prisma: PrismaLike;

  constructor(prisma: PrismaLike) {
    this.prisma = prisma;
  }

  async transitionEntity({
    entityType,
    entityId,
    toState,
    actorType,
    actorRoleId = null,
    projectId,
    metadata = {},
    guardContext = {},
  }: TransitionParams) {
    const tableName = ENTITY_TABLE_MAP[entityType];
    if (!tableName) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Reload entity inside transaction (fail-fast on invalid state)
      const entity = await (tx as any)[tableName].findUniqueOrThrow({
        where: { id: entityId },
      });

      const fromState = entity.state as string;
      const currentVersion = entity.version as number;

      // 2. Validate transition via guard layer
      await validateTransition({
        entityType,
        entityId,
        fromState,
        toState,
        context: {
          ...guardContext,
          entity,
          projectId,
        },
      });

      // 3. Optimistic locking: update only if version matches
      const now = new Date().toISOString();
      const updateResult = await (tx as any)[tableName].updateMany({
        where: { id: entityId, version: currentVersion },
        data: {
          state: toState,
          version: currentVersion + 1,
          updated_at: now,
        },
      });

      if (updateResult.count === 0) {
        throw new ConcurrencyError({
          message: `Concurrency conflict: ${entityType} "${entityId}" was modified by another process (expected version ${currentVersion})`,
          entityType,
          entityId,
        });
      }

      // 4. Re-fetch updated entity
      const updated = await (tx as any)[tableName].findUniqueOrThrow({
        where: { id: entityId },
      });

      // 5. Write canonical event_log (append-only, authoritative)
      const eventIdempotencyKey = metadata?.idempotency_key
        ? `${metadata.idempotency_key}:${entityType}.${toState}`
        : `${entityId}:v${currentVersion + 1}:${toState}`;

      const eventPayload = {
        ...metadata,
        from_state: fromState,
        to_state: toState,
        from_version: currentVersion,
        to_version: currentVersion + 1,
      };

      try {
        await (tx as any).event_log.create({
          data: {
            event_type: `${entityType}.${toState}`,
            aggregate_type: entityType,
            aggregate_id: entityId,
            payload_json: eventPayload,
            correlation_id: (metadata?.correlation_id as string) ?? null,
            causation_id: (metadata?.causation_id as string) ?? null,
            actor_type: actorType,
            actor_ref: actorRoleId ?? null,
            idempotency_key: eventIdempotencyKey,
          },
        });
      } catch {
        // Best-effort — event_log table may not exist yet
      }

      // 6. Emit activity event (projection — kept for backward-compatible reads)
      await (tx as any).activity_events.create({
        data: {
          entity_type: entityType,
          entity_id: entityId,
          event_type: `${entityType}.${toState}`,
          project_id: projectId,
          actor_type: actorType,
          actor_role_id: actorRoleId,
          event_payload: { ...metadata, from_version: currentVersion, to_version: currentVersion + 1 },
        },
      });

      // 7. Write outbox event (delivery channel — NOT authoritative)
      try {
        await (tx as any).outbox_events.create({
          data: {
            aggregate_type: entityType,
            aggregate_id: entityId,
            event_type: `${entityType}.${toState}`,
            payload_json: {
              ...eventPayload,
              project_id: projectId,
              actor_type: actorType,
              actor_role_id: actorRoleId,
            },
            correlation_id: (metadata?.correlation_id as string) ?? null,
            causation_id: (metadata?.causation_id as string) ?? null,
            idempotency_key: eventIdempotencyKey,
            status: "pending",
          },
        });
      } catch {
        // Best-effort — outbox_events table may not exist yet
      }

      // 7. Emit OfficeEvent for task transitions (PART 4)
      if (entityType === "task") {
        const fromZone = taskStateToZone(fromState);
        const toZone = taskStateToZone(toState);
        try {
          await (tx as any).office_events.create({
            data: {
              project_id: projectId,
              entity_type: "task",
              entity_id: entityId,
              event_type: `task.${fromState}_to_${toState}`,
              from_zone: fromZone,
              to_zone: toZone,
              actor_role_id: actorRoleId,
              timestamp: now,
            },
          });
        } catch {
          // Best-effort — office_events table may not exist yet
        }
      }

      return updated;
    }, { isolationLevel: "Serializable" });
  }
}
