// UC-02 Assign Task
// UC-11 Complete Task
// Hardened with:
// - Serializable isolation
// - Re-check reviews/approvals in complete (PART 6)

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

interface OrchestrationServiceLike {
  transitionEntity: (params: {
    entityType: string;
    entityId: string;
    toState: string;
    actorType: string;
    actorRoleId?: string | null;
    projectId: string;
    metadata?: Record<string, unknown>;
    guardContext?: Record<string, unknown>;
  }) => Promise<any>;
}

const ASSIGNABLE_STATES = ["ready", "rework_required", "blocked", "escalated", "validated"] as const;

export class TaskService {
  private prisma: PrismaLike;
  private orchestration: OrchestrationServiceLike;

  constructor(prisma: PrismaLike, orchestrationService: OrchestrationServiceLike) {
    this.prisma = prisma;
    this.orchestration = orchestrationService;
  }

  async assignTask({
    taskId,
    ownerRoleId,
    actorType,
  }: {
    taskId: string;
    ownerRoleId: string;
    actorType: "system" | "founder" | "agent_role";
  }) {
    const validationResult = await this.prisma.$transaction(async (tx) => {
      const task = await tx.tasks.findUniqueOrThrow({ where: { id: taskId } });
      const agentRole = await tx.agent_roles.findUniqueOrThrow({ where: { id: ownerRoleId } });

      if (agentRole.status !== "active") {
        throw new GuardError({
          message: `Agent role "${agentRole.name}" is not active (status: "${agentRole.status}")`,
          entityType: "task",
          entityId: taskId,
          fromState: task.state,
          toState: "assigned",
        });
      }

      if (!ASSIGNABLE_STATES.includes(task.state as any)) {
        throw new GuardError({
          message: `Task cannot be assigned from state "${task.state}". Allowed: ${ASSIGNABLE_STATES.join(", ")}`,
          entityType: "task",
          entityId: taskId,
          fromState: task.state,
          toState: "assigned",
        });
      }

      if (task.state === "rework_required") {
        const hasReworkNotes =
          (task.constraints && (Array.isArray(task.constraints) ? task.constraints.length > 0 : true)) ||
          (task.escalation_reason && task.escalation_reason.trim().length > 0);
        if (!hasReworkNotes) {
          throw new GuardError({
            message: "Task in rework_required must have rework notes",
            entityType: "task",
            entityId: taskId,
            fromState: "rework_required",
            toState: "assigned",
          });
        }
      }

      if (task.state === "blocked") {
        if (task.blocker_reason && task.blocker_reason.trim().length > 0) {
          throw new GuardError({
            message: `Task is still blocked: "${task.blocker_reason}"`,
            entityType: "task",
            entityId: taskId,
            fromState: "blocked",
            toState: "assigned",
          });
        }
      }

      if (task.state === "escalated") {
        const founderDecision = await tx.activity_events.findFirst({
          where: { entity_type: "task", entity_id: taskId, actor_type: "founder", event_type: "task.escalation_resolved" },
        });
        const founderApproval = await tx.approvals.findFirst({
          where: { target_type: "task", target_id: taskId, decision: "approved" },
        });
        if (!founderDecision && !founderApproval) {
          throw new GuardError({
            message: "Escalated task requires founder decision before reassignment",
            entityType: "task",
            entityId: taskId,
            fromState: "escalated",
            toState: "assigned",
          });
        }
      }

      if (task.state === "validated") {
        if (!task.requested_outcome || task.requested_outcome.trim().length === 0) {
          throw new GuardError({
            message: "Validated task requires requested_outcome before reassignment",
            entityType: "task",
            entityId: taskId,
            fromState: "validated",
            toState: "assigned",
          });
        }
      }

      await tx.tasks.update({
        where: { id: taskId },
        data: { owner_role_id: ownerRoleId, updated_at: new Date().toISOString() },
      });

      return { task, agentRole };
    }, { isolationLevel: "Serializable" });

    const updated = await this.orchestration.transitionEntity({
      entityType: "task",
      entityId: taskId,
      toState: "assigned",
      actorType,
      actorRoleId: ownerRoleId,
      projectId: validationResult.task.project_id,
      metadata: {
        use_case: "UC-02",
        trigger: "task assigned to role",
        from_state: validationResult.task.state,
        owner_role_name: validationResult.agentRole.name,
      },
    });

    return updated;
  }

  async completeTask({
    taskId,
    actorType,
  }: {
    taskId: string;
    actorType: "system" | "founder" | "agent_role";
  }) {
    const task = await this.prisma.$transaction(async (tx) => {
      // PART 8 — Reload and re-validate inside transaction
      const task = await tx.tasks.findUniqueOrThrow({ where: { id: taskId } });

      if (task.state !== "validated") {
        throw new GuardError({
          message: `Task must be in "validated" state to complete. Current: "${task.state}"`,
          entityType: "task",
          entityId: taskId,
          fromState: task.state,
          toState: "done",
        });
      }

      // PART 6 — Re-check no open reviews inside transaction
      const openReviews = await tx.reviews.count({
        where: {
          task_id: taskId,
          state: { not: "closed" },
        },
      });

      if (openReviews > 0) {
        throw new GuardError({
          message: `Task has ${openReviews} non-closed review(s). All reviews must be closed before completing task.`,
          entityType: "task",
          entityId: taskId,
          fromState: "validated",
          toState: "done",
        });
      }

      // PART 6 — Re-check no pending approvals inside transaction
      const pendingApprovals = await tx.approvals.count({
        where: {
          target_type: "task",
          target_id: taskId,
          state: "pending",
        },
      });

      if (pendingApprovals > 0) {
        throw new GuardError({
          message: `Task has ${pendingApprovals} pending approval(s). All approvals must be resolved before completing task.`,
          entityType: "task",
          entityId: taskId,
          fromState: "approved",
          toState: "done",
        });
      }

      // Set closed_at
      await tx.tasks.update({
        where: { id: taskId },
        data: { closed_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      });

      return task;
    }, { isolationLevel: "Serializable" });

    const updated = await this.orchestration.transitionEntity({
      entityType: "task",
      entityId: taskId,
      toState: "done",
      actorType,
      projectId: task.project_id,
      metadata: {
        use_case: "UC-11",
        trigger: "task completed",
      },
    });

    return updated;
  }
}
