// IMPORTANT:
// All state changes MUST go through OrchestrationService.
// Direct prisma update of state field is forbidden.

import { validateTransition, type EntityType, type TransitionContext } from "@/guards";
// PrismaClient type will be available once Prisma is configured in the project.
// For now we use a minimal interface to avoid build errors in the Lovable preview.
interface PrismaTransactionClient {
  [key: string]: {
    findUniqueOrThrow: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
  };
}

interface PrismaLike {
  $transaction: <T>(fn: (tx: PrismaTransactionClient) => Promise<T>) => Promise<T>;
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
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
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
      // 1. Load current entity
      const entity = await (tx as any)[tableName].findUniqueOrThrow({
        where: { id: entityId },
      });

      const fromState = entity.state as string;

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

      // 3. Update entity state
      const now = new Date().toISOString();
      const updated = await (tx as any)[tableName].update({
        where: { id: entityId },
        data: {
          state: toState,
          updated_at: now,
        },
      });

      // 4. Emit activity event
      await (tx as any).activity_events.create({
        data: {
          entity_type: entityType,
          entity_id: entityId,
          event_type: `${entityType}.${toState}`,
          project_id: projectId,
          actor_type: actorType,
          actor_role_id: actorRoleId,
          event_payload: metadata,
        },
      });

      return updated;
    });
  }
}
