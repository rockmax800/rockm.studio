// UC-09 Request Approval
// UC-10 Resolve Approval
// Hardened with:
// - PART 4: Prevent duplicate pending approvals (already existed, kept)
// - Serializable isolation

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

const TARGET_TABLE_MAP: Record<string, string> = {
  project: "projects",
  task: "tasks",
  artifact: "artifacts",
  review: "reviews",
  document: "documents",
};

const VALID_DECISIONS = ["approved", "rejected", "deferred"] as const;

export class ApprovalService {
  private prisma: PrismaLike;
  private orchestration: OrchestrationServiceLike;

  constructor(prisma: PrismaLike, orchestrationService: OrchestrationServiceLike) {
    this.prisma = prisma;
    this.orchestration = orchestrationService;
  }

  async requestApproval({
    projectId,
    approvalType,
    targetType,
    targetId,
    requestedByRoleId,
    summary,
  }: {
    projectId: string;
    approvalType: string;
    targetType: string;
    targetId: string;
    requestedByRoleId?: string | null;
    summary: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const tableName = TARGET_TABLE_MAP[targetType];
      if (!tableName) {
        throw new GuardError({
          message: `Unknown target type: "${targetType}"`,
          entityType: "approval",
          entityId: targetId,
          fromState: "none",
          toState: "pending",
        });
      }

      await tx[tableName].findUniqueOrThrow({ where: { id: targetId } });

      // PART 4 — Prevent duplicate pending approval
      const existing = await tx.approvals.findFirst({
        where: {
          approval_type: approvalType,
          target_type: targetType,
          target_id: targetId,
          state: "pending",
        },
      });

      if (existing) {
        throw new GuardError({
          message: `Pending approval already exists for ${approvalType} on ${targetType}/${targetId}`,
          entityType: "approval",
          entityId: existing.id,
          fromState: "pending",
          toState: "pending",
        });
      }

      const now = new Date().toISOString();
      const approval = await tx.approvals.create({
        data: {
          project_id: projectId,
          approval_type: approvalType,
          target_type: targetType,
          target_id: targetId,
          requested_by_role_id: requestedByRoleId ?? null,
          state: "pending",
          summary,
          created_at: now,
          updated_at: now,
        },
      });

      await tx.activity_events.create({
        data: {
          entity_type: "approval",
          entity_id: approval.id,
          event_type: "approval.requested",
          project_id: projectId,
          actor_type: requestedByRoleId ? "agent_role" : "system",
          actor_role_id: requestedByRoleId ?? null,
          event_payload: {
            use_case: "UC-09",
            approval_type: approvalType,
            target_type: targetType,
            target_id: targetId,
            summary,
          },
          created_at: now,
        },
      });

      return approval;
    }, { isolationLevel: "Serializable" });
  }

  async resolveApproval({
    approvalId,
    decision,
    decisionNote,
    actorType,
  }: {
    approvalId: string;
    decision: "approved" | "rejected" | "deferred";
    decisionNote: string;
    actorType: "founder";
  }) {
    if (!VALID_DECISIONS.includes(decision)) {
      throw new GuardError({
        message: `Invalid decision: "${decision}". Must be one of: ${VALID_DECISIONS.join(", ")}`,
        entityType: "approval",
        entityId: approvalId,
        fromState: "pending",
        toState: "decided",
      });
    }

    if (actorType !== "founder") {
      throw new GuardError({
        message: "Only founder can resolve approvals",
        entityType: "approval",
        entityId: approvalId,
        fromState: "pending",
        toState: "decided",
      });
    }

    if (!decisionNote || decisionNote.trim().length === 0) {
      throw new GuardError({
        message: "Decision note is required when resolving an approval",
        entityType: "approval",
        entityId: approvalId,
        fromState: "pending",
        toState: decision,
      });
    }

    const approval = await this.prisma.$transaction(async (tx) => {
      // PART 8 — Reload and validate inside transaction
      const approval = await tx.approvals.findUniqueOrThrow({ where: { id: approvalId } });

      if (approval.state !== "pending") {
        throw new GuardError({
          message: `Approval must be in "pending" state to resolve. Current: "${approval.state}"`,
          entityType: "approval",
          entityId: approvalId,
          fromState: approval.state,
          toState: decision,
        });
      }

      const now = new Date().toISOString();
      await tx.approvals.update({
        where: { id: approvalId },
        data: {
          founder_decision_note: decisionNote,
          decided_at: now,
          updated_at: now,
        },
      });

      return approval;
    }, { isolationLevel: "Serializable" });

    const updated = await this.orchestration.transitionEntity({
      entityType: "approval",
      entityId: approvalId,
      toState: decision,
      actorType,
      projectId: approval.project_id,
      metadata: {
        use_case: "UC-10",
        trigger: `founder ${decision} approval`,
        decision_note: decisionNote,
        approval_type: approval.approval_type,
        target_type: approval.target_type,
        target_id: approval.target_id,
      },
    });

    return updated;
  }
}
