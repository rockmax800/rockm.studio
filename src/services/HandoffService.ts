// Handoff Service — First-class domain entity for role-to-role collaboration
// All handoff lifecycle changes emit ActivityEvents for audit trail.

import { GuardError } from "@/guards/GuardError";

interface PrismaTransactionClient {
  [key: string]: {
    findUniqueOrThrow: (args: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    count: (args: any) => Promise<number>;
  };
}

interface PrismaLike {
  $transaction: <T>(fn: (tx: PrismaTransactionClient) => Promise<T>, options?: any) => Promise<T>;
  [key: string]: any;
}

export type HandoffOutcome = "implementation" | "review" | "clarification" | "approval_prep" | "qa" | "release";
export type HandoffStatus = "created" | "acknowledged" | "completed" | "cancelled";
export type HandoffUrgency = "normal" | "high" | "blocker";

export interface CreateHandoffParams {
  projectId: string;
  taskId: string;
  sourceRoleId: string;
  targetRoleId: string;
  requestedOutcome: HandoffOutcome;
  contextPackId?: string | null;
  sourceArtifactIds?: string[];
  constraints?: unknown[];
  acceptanceCriteria: unknown[];
  openQuestions?: unknown[];
  urgency?: HandoffUrgency;
  createdFromReviewId?: string | null;
}

export class HandoffService {
  private prisma: PrismaLike;

  constructor(prisma: PrismaLike) {
    this.prisma = prisma;
  }

  /**
   * Create a new handoff record.
   * Validates required fields and links handoff to task.
   */
  async createHandoff(params: CreateHandoffParams) {
    if (!params.acceptanceCriteria || (Array.isArray(params.acceptanceCriteria) && params.acceptanceCriteria.length === 0)) {
      throw new GuardError({
        message: "Handoff must have at least one acceptance criterion",
        entityType: "task" as any,
        entityId: params.taskId,
        fromState: "n/a",
        toState: "n/a",
      });
    }

    if (!params.requestedOutcome) {
      throw new GuardError({
        message: "Handoff must have a requested_outcome",
        entityType: "task" as any,
        entityId: params.taskId,
        fromState: "n/a",
        toState: "n/a",
      });
    }

    if (params.sourceRoleId === params.targetRoleId) {
      throw new GuardError({
        message: "Handoff source and target roles must be different",
        entityType: "task" as any,
        entityId: params.taskId,
        fromState: "n/a",
        toState: "n/a",
      });
    }

    const handoff = await this.prisma.$transaction(async (tx) => {
      // Validate task exists
      const task = await tx.tasks.findUniqueOrThrow({ where: { id: params.taskId } });

      // Validate both roles exist and are active
      const sourceRole = await tx.agent_roles.findUniqueOrThrow({ where: { id: params.sourceRoleId } });
      const targetRole = await tx.agent_roles.findUniqueOrThrow({ where: { id: params.targetRoleId } });

      if (sourceRole.status !== "active") {
        throw new GuardError({
          message: `Source role "${sourceRole.name}" is not active`,
          entityType: "task" as any,
          entityId: params.taskId,
          fromState: "n/a",
          toState: "n/a",
        });
      }
      if (targetRole.status !== "active") {
        throw new GuardError({
          message: `Target role "${targetRole.name}" is not active`,
          entityType: "task" as any,
          entityId: params.taskId,
          fromState: "n/a",
          toState: "n/a",
        });
      }

      // Cancel any existing active handoff for this task
      await tx.handoffs.updateMany({
        where: {
          task_id: params.taskId,
          status: { in: ["created", "acknowledged"] },
        },
        data: {
          status: "cancelled",
          closed_at: new Date().toISOString(),
        },
      });

      const now = new Date().toISOString();
      const handoff = await tx.handoffs.create({
        data: {
          project_id: params.projectId,
          task_id: params.taskId,
          source_role_id: params.sourceRoleId,
          target_role_id: params.targetRoleId,
          requested_outcome: params.requestedOutcome,
          context_pack_id: params.contextPackId ?? null,
          source_artifact_ids_json: params.sourceArtifactIds ?? [],
          constraints_json: params.constraints ?? [],
          acceptance_criteria_json: params.acceptanceCriteria,
          open_questions_json: params.openQuestions ?? [],
          urgency: params.urgency ?? "normal",
          status: "created",
          created_from_review_id: params.createdFromReviewId ?? null,
          created_at: now,
        },
      });

      // Link handoff to task
      await tx.tasks.update({
        where: { id: params.taskId },
        data: { current_handoff_id: handoff.id, updated_at: now },
      });

      // Emit activity event
      await tx.activity_events.create({
        data: {
          entity_type: "task",
          entity_id: params.taskId,
          event_type: "handoff.created",
          project_id: params.projectId,
          actor_type: "system",
          actor_role_id: params.sourceRoleId,
          event_payload: {
            handoff_id: handoff.id,
            source_role_id: params.sourceRoleId,
            target_role_id: params.targetRoleId,
            requested_outcome: params.requestedOutcome,
            urgency: params.urgency ?? "normal",
          },
        },
      });

      return handoff;
    }, { isolationLevel: "Serializable" });

    return handoff;
  }

  /**
   * Target role acknowledges the handoff before starting execution.
   */
  async acknowledgeHandoff({
    handoffId,
    actorRoleId,
  }: {
    handoffId: string;
    actorRoleId: string;
  }) {
    const handoff = await this.prisma.$transaction(async (tx) => {
      const handoff = await tx.handoffs.findUniqueOrThrow({ where: { id: handoffId } });

      if (handoff.status !== "created") {
        throw new GuardError({
          message: `Handoff must be in "created" status to acknowledge. Current: "${handoff.status}"`,
          entityType: "task" as any,
          entityId: handoff.task_id,
          fromState: handoff.status,
          toState: "acknowledged",
        });
      }

      if (actorRoleId !== handoff.target_role_id) {
        throw new GuardError({
          message: "Only the target role can acknowledge a handoff",
          entityType: "task" as any,
          entityId: handoff.task_id,
          fromState: handoff.status,
          toState: "acknowledged",
        });
      }

      const now = new Date().toISOString();
      const updated = await tx.handoffs.update({
        where: { id: handoffId },
        data: { status: "acknowledged", acknowledged_at: now },
      });

      // Emit activity event
      await tx.activity_events.create({
        data: {
          entity_type: "task",
          entity_id: handoff.task_id,
          event_type: "handoff.acknowledged",
          project_id: handoff.project_id,
          actor_type: "agent_role",
          actor_role_id: actorRoleId,
          event_payload: {
            handoff_id: handoffId,
            target_role_id: actorRoleId,
          },
        },
      });

      return updated;
    }, { isolationLevel: "Serializable" });

    return handoff;
  }

  /**
   * Complete a handoff after task work is done.
   */
  async completeHandoff({
    handoffId,
    actorRoleId,
  }: {
    handoffId: string;
    actorRoleId: string;
  }) {
    const handoff = await this.prisma.$transaction(async (tx) => {
      const handoff = await tx.handoffs.findUniqueOrThrow({ where: { id: handoffId } });

      if (handoff.status !== "acknowledged") {
        throw new GuardError({
          message: `Handoff must be "acknowledged" to complete. Current: "${handoff.status}"`,
          entityType: "task" as any,
          entityId: handoff.task_id,
          fromState: handoff.status,
          toState: "completed",
        });
      }

      const now = new Date().toISOString();
      const updated = await tx.handoffs.update({
        where: { id: handoffId },
        data: { status: "completed", closed_at: now },
      });

      // Emit activity event
      await tx.activity_events.create({
        data: {
          entity_type: "task",
          entity_id: handoff.task_id,
          event_type: "handoff.completed",
          project_id: handoff.project_id,
          actor_type: "agent_role",
          actor_role_id: actorRoleId,
          event_payload: {
            handoff_id: handoffId,
          },
        },
      });

      return updated;
    }, { isolationLevel: "Serializable" });

    return handoff;
  }

  /**
   * Cancel a handoff (e.g. task cancelled, reassigned).
   */
  async cancelHandoff({
    handoffId,
    actorType,
    actorRoleId,
    reason,
  }: {
    handoffId: string;
    actorType: "founder" | "system" | "agent_role";
    actorRoleId?: string | null;
    reason?: string;
  }) {
    const handoff = await this.prisma.$transaction(async (tx) => {
      const handoff = await tx.handoffs.findUniqueOrThrow({ where: { id: handoffId } });

      if (handoff.status === "completed" || handoff.status === "cancelled") {
        throw new GuardError({
          message: `Cannot cancel handoff in "${handoff.status}" status`,
          entityType: "task" as any,
          entityId: handoff.task_id,
          fromState: handoff.status,
          toState: "cancelled",
        });
      }

      const now = new Date().toISOString();
      const updated = await tx.handoffs.update({
        where: { id: handoffId },
        data: { status: "cancelled", closed_at: now },
      });

      // Emit activity event
      await tx.activity_events.create({
        data: {
          entity_type: "task",
          entity_id: handoff.task_id,
          event_type: "handoff.cancelled",
          project_id: handoff.project_id,
          actor_type: actorType,
          actor_role_id: actorRoleId ?? null,
          event_payload: {
            handoff_id: handoffId,
            reason: reason ?? "cancelled",
          },
        },
      });

      return updated;
    }, { isolationLevel: "Serializable" });

    return handoff;
  }

  /**
   * Validate that a task has an active acknowledged handoff.
   * Used by RunService before starting a run.
   */
  async validateActiveHandoff(taskId: string): Promise<{ handoffId: string; targetRoleId: string }> {
    const handoff = await this.prisma.handoffs?.findFirst({
      where: {
        task_id: taskId,
        status: "acknowledged",
      },
      orderBy: { created_at: "desc" },
    });

    if (!handoff) {
      throw new GuardError({
        message: "Task must have an active acknowledged handoff before starting a run",
        entityType: "task" as any,
        entityId: taskId,
        fromState: "assigned",
        toState: "in_progress",
      });
    }

    return { handoffId: handoff.id, targetRoleId: handoff.target_role_id };
  }
}
