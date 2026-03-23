// UC-05 Submit Artifact for Review
// Requires:
// - Artifact in classified state
// - Task in in_progress state
// - Reviewer role active
// Transitions:
// Artifact: classified → submitted → under_review
// Review: created → in_progress
// Task: in_progress → waiting_review

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

export class ArtifactService {
  private prisma: PrismaLike;
  private orchestration: OrchestrationServiceLike;

  constructor(prisma: PrismaLike, orchestrationService: OrchestrationServiceLike) {
    this.prisma = prisma;
    this.orchestration = orchestrationService;
  }

  async submitForReview({
    artifactId,
    reviewerRoleId,
    actorType,
  }: {
    artifactId: string;
    reviewerRoleId: string;
    actorType: "system" | "founder" | "agent_role";
  }) {
    // Validate and create review inside transaction
    const { artifact, task, review } = await this.prisma.$transaction(async (tx) => {
      // 1. Load artifact + task
      const artifact = await tx.artifacts.findUniqueOrThrow({ where: { id: artifactId } });

      if (!artifact.task_id) {
        throw new GuardError({
          message: "Artifact must be linked to a task to submit for review",
          entityType: "artifact",
          entityId: artifactId,
          fromState: artifact.state,
          toState: "submitted",
        });
      }

      const task = await tx.tasks.findUniqueOrThrow({ where: { id: artifact.task_id } });

      // 2. Validate states
      if (artifact.state !== "classified") {
        throw new GuardError({
          message: `Artifact must be in "classified" state to submit. Current: "${artifact.state}"`,
          entityType: "artifact",
          entityId: artifactId,
          fromState: artifact.state,
          toState: "submitted",
        });
      }

      if (task.state !== "in_progress") {
        throw new GuardError({
          message: `Task must be in "in_progress" state. Current: "${task.state}"`,
          entityType: "task",
          entityId: task.id,
          fromState: task.state,
          toState: "waiting_review",
        });
      }

      // 3. Validate reviewer role
      const reviewerRole = await tx.agent_roles.findUniqueOrThrow({ where: { id: reviewerRoleId } });
      if (reviewerRole.status !== "active") {
        throw new GuardError({
          message: `Reviewer role "${reviewerRole.name}" is not active`,
          entityType: "review",
          entityId: artifactId,
          fromState: "none",
          toState: "created",
        });
      }

      // 4. Create Review record
      const now = new Date().toISOString();
      const review = await tx.reviews.create({
        data: {
          project_id: task.project_id,
          task_id: task.id,
          artifact_id: artifactId,
          reviewer_role_id: reviewerRoleId,
          state: "created",
          created_at: now,
          updated_at: now,
        },
      });

      return { artifact, task, review };
    });

    // 5. Transition artifact: classified → submitted
    await this.orchestration.transitionEntity({
      entityType: "artifact",
      entityId: artifactId,
      toState: "submitted",
      actorType,
      projectId: task.project_id,
      metadata: { use_case: "UC-05", trigger: "artifact submitted for review", review_id: review.id },
    });

    // 6. Transition artifact: submitted → under_review
    await this.orchestration.transitionEntity({
      entityType: "artifact",
      entityId: artifactId,
      toState: "under_review",
      actorType,
      projectId: task.project_id,
      metadata: { use_case: "UC-05", trigger: "review started", review_id: review.id },
    });

    // 7. Transition review: created → in_progress
    await this.orchestration.transitionEntity({
      entityType: "review",
      entityId: review.id,
      toState: "in_progress",
      actorType,
      actorRoleId: reviewerRoleId,
      projectId: task.project_id,
      metadata: { use_case: "UC-05", trigger: "reviewer begins evaluation", artifact_id: artifactId },
    });

    // 8. Transition task: in_progress → waiting_review
    await this.orchestration.transitionEntity({
      entityType: "task",
      entityId: task.id,
      toState: "waiting_review",
      actorType,
      projectId: task.project_id,
      metadata: { use_case: "UC-05", trigger: "artifact submitted for review", artifact_id: artifactId, review_id: review.id },
    });

    return review;
  }
}
