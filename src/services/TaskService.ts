// UC-02 Assign Task
// Allowed from:
// ready
// rework_required
// blocked
// escalated
// approved
// Transition:
// → assigned

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
  $transaction: <T>(fn: (tx: PrismaTransactionClient) => Promise<T>) => Promise<T>;
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

const ASSIGNABLE_STATES = ["ready", "rework_required", "blocked", "escalated", "approved"] as const;

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
    // Pre-validate inside transaction, then delegate transition
    const validationResult = await this.prisma.$transaction(async (tx) => {
      // 1. Load task
      const task = await tx.tasks.findUniqueOrThrow({
        where: { id: taskId },
      });

      // 2. Load agent role
      const agentRole = await tx.agent_roles.findUniqueOrThrow({
        where: { id: ownerRoleId },
      });

      // 3. Validate agent role is active
      if (agentRole.status !== "active") {
        throw new GuardError({
          message: `Agent role "${agentRole.name}" is not active (status: "${agentRole.status}")`,
          entityType: "task",
          entityId: taskId,
          fromState: task.state,
          toState: "assigned",
        });
      }

      // 4. Validate task is in an assignable state
      if (!ASSIGNABLE_STATES.includes(task.state)) {
        throw new GuardError({
          message: `Task cannot be assigned from state "${task.state}". Allowed states: ${ASSIGNABLE_STATES.join(", ")}`,
          entityType: "task",
          entityId: taskId,
          fromState: task.state,
          toState: "assigned",
        });
      }

      // 5. State-specific validations
      if (task.state === "rework_required") {
        const hasReworkNotes =
          (task.constraints && (Array.isArray(task.constraints) ? task.constraints.length > 0 : true)) ||
          (task.escalation_reason && task.escalation_reason.trim().length > 0);
        if (!hasReworkNotes) {
          throw new GuardError({
            message: "Task in rework_required must have rework notes (constraints or escalation_reason)",
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
            message: `Task is still blocked: "${task.blocker_reason}". Clear blocker_reason before reassigning.`,
            entityType: "task",
            entityId: taskId,
            fromState: "blocked",
            toState: "assigned",
          });
        }
      }

      if (task.state === "escalated") {
        // Check for founder decision via activity event or approval
        const founderDecision = await tx.activity_events.findFirst({
          where: {
            entity_type: "task",
            entity_id: taskId,
            actor_type: "founder",
            event_type: "task.escalation_resolved",
          },
        });

        const founderApproval = await tx.approvals.findFirst({
          where: {
            target_type: "task",
            target_id: taskId,
            state: "approved",
          },
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

      if (task.state === "approved") {
        if (!task.requested_outcome || task.requested_outcome.trim().length === 0) {
          throw new GuardError({
            message: "Approved task requires requested_outcome (next stage definition) before reassignment",
            entityType: "task",
            entityId: taskId,
            fromState: "approved",
            toState: "assigned",
          });
        }
      }

      // 6. Update owner_role_id
      await tx.tasks.update({
        where: { id: taskId },
        data: {
          owner_role_id: ownerRoleId,
          updated_at: new Date().toISOString(),
        },
      });

      return { task, agentRole };
    });

    // 7. Delegate state transition to OrchestrationService
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
}
