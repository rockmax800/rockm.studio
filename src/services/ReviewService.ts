// UC-06 Resolve Review — Approve
// UC-07 Resolve Review — Reject (Rework Loop)
// Hardened with Serializable isolation
// Extended with RunEvaluation recording (PART 7)
// Extended with Handoff creation on rejection (PART 9)

import { GuardError } from "@/guards/GuardError";
import { HandoffService } from "@/services/HandoffService";

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

interface AgentPerformanceServiceLike {
  recordRunEvaluation: (params: {
    runId: string;
    roleId: string | null;
    qualityScore: number;
    reviewOutcome: string;
  }) => Promise<void>;
}

const VALID_APPROVE_VERDICTS = ["approved", "approved_with_notes"] as const;

export class ReviewService {
  private prisma: PrismaLike;
  private orchestration: OrchestrationServiceLike;
  private performanceService: AgentPerformanceServiceLike | null;
  private handoffService: HandoffService;

  constructor(
    prisma: PrismaLike,
    orchestrationService: OrchestrationServiceLike,
    performanceService?: AgentPerformanceServiceLike,
  ) {
    this.prisma = prisma;
    this.orchestration = orchestrationService;
    this.performanceService = performanceService ?? null;
    this.handoffService = new HandoffService(prisma);
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

    const { review, artifact, task, run } = await this.prisma.$transaction(async (tx) => {
      const review = await tx.reviews.findUniqueOrThrow({ where: { id: reviewId } });
      const artifact = await tx.artifacts.findUniqueOrThrow({ where: { id: review.artifact_id } });
      const task = review.task_id
        ? await tx.tasks.findUniqueOrThrow({ where: { id: review.task_id } })
        : null;

      // Find associated run for performance tracking
      const run = artifact.run_id
        ? await tx.runs.findUnique({ where: { id: artifact.run_id } })
        : null;

      if (review.state !== "in_progress") {
        throw new GuardError({
          message: `Review must be in "in_progress" to approve. Current: "${review.state}"`,
          entityType: "review",
          entityId: reviewId,
          fromState: review.state,
          toState: verdict,
        });
      }

      if (artifact.state !== "under_review") {
        throw new GuardError({
          message: `Artifact must be in "under_review" to accept. Current: "${artifact.state}"`,
          entityType: "artifact",
          entityId: artifact.id,
          fromState: artifact.state,
          toState: "accepted",
        });
      }

      const now = new Date().toISOString();
      await tx.reviews.update({
        where: { id: reviewId },
        data: {
          verdict,
          non_blocking_notes: nonBlockingNotes ?? null,
          updated_at: now,
        },
      });

      return { review, artifact, task, run };
    }, { isolationLevel: "Serializable" });

    const projectId = review.project_id;

    await this.orchestration.transitionEntity({
      entityType: "review",
      entityId: reviewId,
      toState: "resolved",
      actorType,
      actorRoleId: review.reviewer_role_id,
      projectId,
      metadata: { use_case: "UC-06", trigger: "reviewer resolved", verdict },
      guardContext: { verdict },
    });

    await this.orchestration.transitionEntity({
      entityType: "review",
      entityId: reviewId,
      toState: "closed",
      actorType,
      actorRoleId: review.reviewer_role_id,
      projectId,
      metadata: { use_case: "UC-06", trigger: "review finalized" },
    });

    await this.orchestration.transitionEntity({
      entityType: "artifact",
      entityId: artifact.id,
      toState: "accepted",
      actorType,
      projectId,
      metadata: { use_case: "UC-06", trigger: "artifact accepted after review", review_id: reviewId },
    });

    if (task) {
      await this.orchestration.transitionEntity({
        entityType: "task",
        entityId: task.id,
        toState: "validated",
        actorType,
        projectId,
        metadata: { use_case: "UC-06", trigger: "task validated after review", review_id: reviewId, artifact_id: artifact.id },
        guardContext: { reviewVerdict: verdict },
      });
    }

    // PART 7 — Record RunEvaluation (approved → quality_score = 1)
    if (run && this.performanceService) {
      try {
        await this.performanceService.recordRunEvaluation({
          runId: run.id,
          roleId: run.agent_role_id ?? null,
          qualityScore: 1,
          reviewOutcome: verdict,
        });
      } catch {
        // Best-effort performance tracking
      }
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

    const { review, artifact, task, run } = await this.prisma.$transaction(async (tx) => {
      const review = await tx.reviews.findUniqueOrThrow({ where: { id: reviewId } });
      const artifact = await tx.artifacts.findUniqueOrThrow({ where: { id: review.artifact_id } });
      const task = review.task_id
        ? await tx.tasks.findUniqueOrThrow({ where: { id: review.task_id } })
        : null;

      const run = artifact.run_id
        ? await tx.runs.findUnique({ where: { id: artifact.run_id } })
        : null;

      if (review.state !== "in_progress") {
        throw new GuardError({
          message: `Review must be in "in_progress" to reject. Current: "${review.state}"`,
          entityType: "review",
          entityId: reviewId,
          fromState: review.state,
          toState: "rejected",
        });
      }

      if (artifact.state !== "under_review") {
        throw new GuardError({
          message: `Artifact must be in "under_review" to reject. Current: "${artifact.state}"`,
          entityType: "artifact",
          entityId: artifact.id,
          fromState: artifact.state,
          toState: "rejected",
        });
      }

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

      return { review, artifact, task, run };
    }, { isolationLevel: "Serializable" });

    const projectId = review.project_id;

    await this.orchestration.transitionEntity({
      entityType: "review",
      entityId: reviewId,
      toState: "resolved",
      actorType,
      actorRoleId: review.reviewer_role_id,
      projectId,
      metadata: { use_case: "UC-06", trigger: "reviewer resolved with rejection", verdict: "rejected", reason },
      guardContext: { verdict: "rejected" },
    });

    await this.orchestration.transitionEntity({
      entityType: "review",
      entityId: reviewId,
      toState: "closed",
      actorType,
      actorRoleId: review.reviewer_role_id,
      projectId,
      metadata: { use_case: "UC-06", trigger: "rejection finalized", reason },
    });

    await this.orchestration.transitionEntity({
      entityType: "artifact",
      entityId: artifact.id,
      toState: "rejected",
      actorType,
      projectId,
      metadata: { use_case: "UC-07", trigger: "artifact rejected after review", review_id: reviewId, reason },
    });

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

    // PART 7 — Record RunEvaluation (rejected → quality_score = 0)
    if (run && this.performanceService) {
      try {
        await this.performanceService.recordRunEvaluation({
          runId: run.id,
          roleId: run.agent_role_id ?? null,
          qualityScore: 0,
          reviewOutcome: "rejected",
        });
      } catch {
        // Best-effort performance tracking
      }
    }

    return task ?? artifact;
  }
}
