// UC-06 Resolve Review — Approve
// UC-07 Resolve Review — Reject (Rework Loop)
// Transitions (Approve):
// Review: in_progress → approved/approved_with_notes → closed
// Artifact: under_review → accepted
// Task: waiting_review → approved
// Transitions (Reject):
// Review: in_progress → rejected → closed
// Artifact: under_review → rejected
// Task: waiting_review → rework_required

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

const VALID_APPROVE_VERDICTS = ["approved", "approved_with_notes"] as const;

export class ReviewService {
  private prisma: PrismaLike;
  private orchestration: OrchestrationServiceLike;

  constructor(prisma: PrismaLike, orchestrationService: OrchestrationServiceLike) {
    this.prisma = prisma;
    this.orchestration = orchestrationService;
  }

  async approveReview({
    reviewId,
    verdict,
    nonBlockingNotes,
    actorType,
  }: {
    reviewId: string;
    verdict: "approved" | "approved_with_notes";
    nonBlockingNotes?: unknown[];
    actorType: "system" | "founder" | "agent_role";
  }) {
    if (!VALID_APPROVE_VERDICTS.includes(verdict)) {
      throw new GuardError({
        message: `Invalid approve verdict: "${verdict}". Must be one of: ${VALID_APPROVE_VERDICTS.join(", ")}`,
        entityType: "review",
        entityId: reviewId,
        fromState: "in_progress",
        toState: verdict,
      });
    }

    // Load and validate inside transaction
    const { review, artifact, task } = await this.prisma.$transaction(async (tx) => {
      const review = await tx.reviews.findUniqueOrThrow({ where: { id: reviewId } });
      const artifact = await tx.artifacts.findUniqueOrThrow({ where: { id: review.artifact_id } });
      const task = review.task_id
        ? await tx.tasks.findUniqueOrThrow({ where: { id: review.task_id } })
        : null;

      // Validate review state
      if (review.state !== "in_progress") {
        throw new GuardError({
          message: `Review must be in "in_progress" to approve. Current: "${review.state}"`,
          entityType: "review",
          entityId: reviewId,
          fromState: review.state,
          toState: verdict,
        });
      }

      // Validate artifact state
      if (artifact.state !== "under_review") {
        throw new GuardError({
          message: `Artifact must be in "under_review" to accept. Current: "${artifact.state}"`,
          entityType: "artifact",
          entityId: artifact.id,
          fromState: artifact.state,
          toState: "accepted",
        });
      }

      // Store verdict and notes on review record
      const now = new Date().toISOString();
      await tx.reviews.update({
        where: { id: reviewId },
        data: {
          verdict,
          non_blocking_notes: nonBlockingNotes ?? null,
          updated_at: now,
        },
      });

      return { review, artifact, task };
    });

    const projectId = review.project_id;

    // 1. Transition review: in_progress → approved / approved_with_notes
    await this.orchestration.transitionEntity({
      entityType: "review",
      entityId: reviewId,
      toState: verdict,
      actorType,
      actorRoleId: review.reviewer_role_id,
      projectId,
      metadata: { use_case: "UC-06", trigger: "reviewer approved", verdict },
    });

    // 2. Transition review: approved/approved_with_notes → closed
    await this.orchestration.transitionEntity({
      entityType: "review",
      entityId: reviewId,
      toState: "closed",
      actorType,
      actorRoleId: review.reviewer_role_id,
      projectId,
      metadata: { use_case: "UC-06", trigger: "review finalized" },
    });

    // 3. Transition artifact: under_review → accepted
    await this.orchestration.transitionEntity({
      entityType: "artifact",
      entityId: artifact.id,
      toState: "accepted",
      actorType,
      projectId,
      metadata: { use_case: "UC-06", trigger: "artifact accepted after review", review_id: reviewId },
    });

    // 4. Transition task: waiting_review → approved (if task exists)
    if (task) {
      await this.orchestration.transitionEntity({
        entityType: "task",
        entityId: task.id,
        toState: "approved",
        actorType,
        projectId,
        metadata: { use_case: "UC-06", trigger: "task approved after review", review_id: reviewId, artifact_id: artifact.id },
      });
    }

    return task ?? artifact;
  }

  async rejectReview({
    reviewId,
    reason,
    blockingIssues,
    actorType,
  }: {
    reviewId: string;
    reason: string;
    blockingIssues?: unknown[];
    actorType: "system" | "founder" | "agent_role";
  }) {
    if (!reason || reason.trim().length === 0) {
      throw new GuardError({
        message: "Rejection reason is required",
        entityType: "review",
        entityId: reviewId,
        fromState: "in_progress",
        toState: "rejected",
      });
    }

    // Load and validate inside transaction
    const { review, artifact, task } = await this.prisma.$transaction(async (tx) => {
      const review = await tx.reviews.findUniqueOrThrow({ where: { id: reviewId } });
      const artifact = await tx.artifacts.findUniqueOrThrow({ where: { id: review.artifact_id } });
      const task = review.task_id
        ? await tx.tasks.findUniqueOrThrow({ where: { id: review.task_id } })
        : null;

      // Validate review state
      if (review.state !== "in_progress") {
        throw new GuardError({
          message: `Review must be in "in_progress" to reject. Current: "${review.state}"`,
          entityType: "review",
          entityId: reviewId,
          fromState: review.state,
          toState: "rejected",
        });
      }

      // Validate artifact state
      if (artifact.state !== "under_review") {
        throw new GuardError({
          message: `Artifact must be in "under_review" to reject. Current: "${artifact.state}"`,
          entityType: "artifact",
          entityId: artifact.id,
          fromState: artifact.state,
          toState: "rejected",
        });
      }

      // Store reason and blocking issues on review record
      const now = new Date().toISOString();
      await tx.reviews.update({
        where: { id: reviewId },
        data: {
          verdict: "rejected",
          reason,
          blocking_issues: blockingIssues ?? null,
          updated_at: now,
        },
      });

      return { review, artifact, task };
    });

    const projectId = review.project_id;

    // 1. Transition review: in_progress → rejected
    await this.orchestration.transitionEntity({
      entityType: "review",
      entityId: reviewId,
      toState: "rejected",
      actorType,
      actorRoleId: review.reviewer_role_id,
      projectId,
      metadata: { use_case: "UC-07", trigger: "reviewer rejected", reason },
    });

    // 2. Transition review: rejected → closed
    await this.orchestration.transitionEntity({
      entityType: "review",
      entityId: reviewId,
      toState: "closed",
      actorType,
      actorRoleId: review.reviewer_role_id,
      projectId,
      metadata: { use_case: "UC-07", trigger: "rejection finalized", reason },
    });

    // 3. Transition artifact: under_review → rejected
    await this.orchestration.transitionEntity({
      entityType: "artifact",
      entityId: artifact.id,
      toState: "rejected",
      actorType,
      projectId,
      metadata: { use_case: "UC-07", trigger: "artifact rejected after review", review_id: reviewId, reason },
    });

    // 4. Transition task: waiting_review → rework_required (if task exists)
    if (task) {
      await this.orchestration.transitionEntity({
        entityType: "task",
        entityId: task.id,
        toState: "rework_required",
        actorType,
        projectId,
        metadata: { use_case: "UC-07", trigger: "rework required after rejection", review_id: reviewId, reason },
      });
    }

    return task ?? artifact;
  }
}
