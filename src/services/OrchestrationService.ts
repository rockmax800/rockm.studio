// IMPORTANT:
// All state changes MUST go through OrchestrationService.
// Direct prisma update of state field is forbidden.

import { validateTransition, type EntityType, type TransitionContext } from "@/guards";
import { ConcurrencyError } from "@/guards/ConcurrencyError";

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

      // 5. Emit activity event
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

      return updated;
    }, { isolationLevel: "Serializable" });
  }
}
