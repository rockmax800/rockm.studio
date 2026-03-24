// Delivery Lane Service
// Enforces single delivery pipeline: PR → CI → Staging → Founder Approval → Production
// GitHub-only. Single VPS. Docker-based deploy. No auto-production deploy.

import { GuardError } from "@/guards/GuardError";
import { logInfo } from "@/lib/logger";

interface PrismaLike {
  $transaction: <T>(fn: (tx: any) => Promise<T>, options?: any) => Promise<T>;
  [key: string]: any;
}

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface DeployConfig {
  registryUrl: string;      // e.g. "ghcr.io/owner/repo"
  vpsHost: string;          // e.g. "deploy@vps.example.com"
  containerName: string;    // e.g. "app-staging"
  dockerComposeRef?: string;
}

export interface StagingDeployParams {
  projectId: string;
  pullRequestId: string;
  mergedBranch: string;
  versionLabel: string;
}

export interface ProductionPromoteParams {
  projectId: string;
  stagingDeploymentId: string;
  founderNote?: string;
}

export interface RollbackParams {
  projectId: string;
  environment: "staging" | "production";
  targetDeploymentId: string;
  reason?: string;
}

// ──────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────

export class DeliveryLaneService {
  private prisma: PrismaLike;

  constructor(prisma: PrismaLike) {
    this.prisma = prisma;
  }

  // ─── SECTION 1: Repository Validation ───

  /**
   * Validate that repository is GitHub and has required fields.
   * All repos in the delivery lane MUST be GitHub.
   */
  async validateRepository(repositoryId: string) {
    const repo = await this.prisma.repositories.findUniqueOrThrow({
      where: { id: repositoryId },
    });

    if (repo.provider !== "github") {
      throw new GuardError({
        message: `Delivery Lane requires GitHub as VCS provider. Found: "${repo.provider}"`,
        entityType: "project",
        entityId: repo.project_id,
        fromState: repo.provider,
        toState: "github",
      });
    }

    if (!repo.repo_owner || !repo.repo_name) {
      throw new GuardError({
        message: "Repository must have repo_owner and repo_name set",
        entityType: "project",
        entityId: repo.project_id,
        fromState: "incomplete",
        toState: "valid",
      });
    }

    if (!repo.default_branch) {
      throw new GuardError({
        message: "Repository must have default_branch set",
        entityType: "project",
        entityId: repo.project_id,
        fromState: "incomplete",
        toState: "valid",
      });
    }

    return repo;
  }

  // ─── SECTION 2: PR Merge Guard ───

  /**
   * Validate PR is ready to merge: CI must have passed.
   */
  async validatePRMergeReady(pullRequestId: string) {
    return this.prisma.$transaction(async (tx: any) => {
      const pr = await tx.pull_requests.findUniqueOrThrow({
        where: { id: pullRequestId },
      });

      if (pr.status !== "opened") {
        throw new GuardError({
          message: `PR must be in "opened" status to merge. Current: "${pr.status}"`,
          entityType: "project",
          entityId: pr.project_id,
          fromState: pr.status,
          toState: "merged",
        });
      }

      // Check CI: at least one check suite must have passed
      const checkSuites = await tx.check_suites.findMany({
        where: { pull_request_id: pullRequestId },
        orderBy: { started_at: "desc" },
      });

      if (checkSuites.length === 0) {
        throw new GuardError({
          message: "PR cannot be merged without CI check suite",
          entityType: "project",
          entityId: pr.project_id,
          fromState: "no_ci",
          toState: "merged",
        });
      }

      const latestSuite = checkSuites[0];
      if (latestSuite.status !== "passed") {
        throw new GuardError({
          message: `CI must pass before merge. Latest check suite status: "${latestSuite.status}"`,
          entityType: "project",
          entityId: pr.project_id,
          fromState: latestSuite.status,
          toState: "passed",
        });
      }

      return { pr, checkSuite: latestSuite };
    });
  }

  /**
   * Record PR as merged.
   */
  async recordPRMerge(pullRequestId: string) {
    return this.prisma.$transaction(async (tx: any) => {
      const now = new Date().toISOString();

      const pr = await tx.pull_requests.update({
        where: { id: pullRequestId },
        data: {
          status: "merged",
          merged_at: now,
        },
      });

      await tx.activity_events.create({
        data: {
          entity_type: "task",
          entity_id: pr.task_id,
          event_type: "pull_request.merged",
          project_id: pr.project_id,
          actor_type: "system",
          event_payload: {
            pull_request_id: pullRequestId,
            merged_at: now,
          },
        },
      });

      // Write outbox event for downstream consumers
      try {
        await tx.outbox_events.create({
          data: {
            aggregate_type: "deployment",
            aggregate_id: pr.project_id,
            event_type: "pull_request.merged",
            payload_json: {
              pull_request_id: pullRequestId,
              project_id: pr.project_id,
              task_id: pr.task_id,
              source_branch: pr.source_branch,
            },
            status: "pending",
          },
        });
      } catch { /* best-effort outbox */ }

      return pr;
    });
  }

  // ─── SECTION 4: Staging Deploy ───

  /**
   * Create staging deployment record after PR merge.
   * Actual Docker deploy is triggered externally (GitHub Actions or manual).
   */
  async createStagingDeployment(params: StagingDeployParams) {
    return this.prisma.$transaction(async (tx: any) => {
      const now = new Date().toISOString();

      // Validate PR was merged
      const pr = await tx.pull_requests.findUniqueOrThrow({
        where: { id: params.pullRequestId },
      });
      if (pr.status !== "merged") {
        throw new GuardError({
          message: `PR must be merged before staging deploy. Current: "${pr.status}"`,
          entityType: "project",
          entityId: params.projectId,
          fromState: pr.status,
          toState: "deploying",
        });
      }

      const deployment = await tx.deployments.create({
        data: {
          project_id: params.projectId,
          environment: "staging",
          source_type: "branch",
          source_ref: params.mergedBranch,
          version_label: params.versionLabel,
          status: "deploying",
          started_at: now,
        },
      });

      await tx.activity_events.create({
        data: {
          entity_type: "project",
          entity_id: params.projectId,
          event_type: "deployment.staging_started",
          project_id: params.projectId,
          actor_type: "system",
          event_payload: {
            deployment_id: deployment.id,
            pull_request_id: params.pullRequestId,
            version_label: params.versionLabel,
          },
        },
      });

      // Outbox for deploy executor
      try {
        await tx.outbox_events.create({
          data: {
            aggregate_type: "deployment",
            aggregate_id: deployment.id,
            event_type: "deployment.staging_started",
            payload_json: {
              deployment_id: deployment.id,
              project_id: params.projectId,
              source_ref: params.mergedBranch,
              version_label: params.versionLabel,
            },
            status: "pending",
          },
        });
      } catch { /* best-effort */ }

      logInfo("staging_deploy_created", {
        deploymentId: deployment.id,
        projectId: params.projectId,
        version: params.versionLabel,
      });

      return deployment;
    });
  }

  /**
   * Mark staging deployment as live or failed.
   */
  async updateDeploymentStatus(
    deploymentId: string,
    status: "live" | "failed",
    opts?: { previewUrl?: string; logsRef?: string },
  ) {
    const now = new Date().toISOString();
    return this.prisma.$transaction(async (tx: any) => {
      const deployment = await tx.deployments.update({
        where: { id: deploymentId },
        data: {
          status,
          finished_at: now,
          preview_url: opts?.previewUrl ?? null,
          logs_ref: opts?.logsRef ?? null,
        },
      });

      await tx.activity_events.create({
        data: {
          entity_type: "project",
          entity_id: deployment.project_id,
          event_type: `deployment.${status}`,
          project_id: deployment.project_id,
          actor_type: "system",
          event_payload: {
            deployment_id: deploymentId,
            environment: deployment.environment,
            status,
          },
        },
      });

      return deployment;
    });
  }

  // ─── SECTION 5: Founder Production Gate ───

  /**
   * Promote staging deployment to production.
   * Requires staging deployment to be live. Founder action only.
   */
  async promoteToProduction(params: ProductionPromoteParams) {
    return this.prisma.$transaction(async (tx: any) => {
      const stagingDeploy = await tx.deployments.findUniqueOrThrow({
        where: { id: params.stagingDeploymentId },
      });

      if (stagingDeploy.environment !== "staging") {
        throw new GuardError({
          message: `Can only promote staging deployments. Found: "${stagingDeploy.environment}"`,
          entityType: "project",
          entityId: params.projectId,
          fromState: stagingDeploy.environment,
          toState: "production",
        });
      }

      if (stagingDeploy.status !== "live") {
        throw new GuardError({
          message: `Staging deployment must be live before promotion. Current: "${stagingDeploy.status}"`,
          entityType: "project",
          entityId: params.projectId,
          fromState: stagingDeploy.status,
          toState: "deploying",
        });
      }

      const now = new Date().toISOString();

      const prodDeploy = await tx.deployments.create({
        data: {
          project_id: params.projectId,
          environment: "production",
          source_type: stagingDeploy.source_type,
          source_ref: stagingDeploy.source_ref,
          version_label: stagingDeploy.version_label,
          status: "deploying",
          started_at: now,
        },
      });

      await tx.activity_events.create({
        data: {
          entity_type: "project",
          entity_id: params.projectId,
          event_type: "deployment.production_started",
          project_id: params.projectId,
          actor_type: "founder",
          event_payload: {
            deployment_id: prodDeploy.id,
            staging_deployment_id: params.stagingDeploymentId,
            version_label: stagingDeploy.version_label,
            founder_note: params.founderNote ?? null,
          },
        },
      });

      // Outbox
      try {
        await tx.outbox_events.create({
          data: {
            aggregate_type: "deployment",
            aggregate_id: prodDeploy.id,
            event_type: "deployment.production_started",
            payload_json: {
              deployment_id: prodDeploy.id,
              project_id: params.projectId,
              source_ref: stagingDeploy.source_ref,
              version_label: stagingDeploy.version_label,
            },
            status: "pending",
          },
        });
      } catch { /* best-effort */ }

      logInfo("production_deploy_started", {
        deploymentId: prodDeploy.id,
        projectId: params.projectId,
        promotedFrom: params.stagingDeploymentId,
      });

      return prodDeploy;
    });
  }

  // ─── SECTION 6: Rollback ───

  /**
   * Rollback to a previous deployment.
   * Creates a new deployment referencing the rollback target.
   */
  async rollback(params: RollbackParams) {
    return this.prisma.$transaction(async (tx: any) => {
      const targetDeploy = await tx.deployments.findUniqueOrThrow({
        where: { id: params.targetDeploymentId },
      });

      if (targetDeploy.project_id !== params.projectId) {
        throw new GuardError({
          message: "Rollback target deployment does not belong to this project",
          entityType: "project",
          entityId: params.projectId,
          fromState: "mislinked",
          toState: "rolled_back",
        });
      }

      if (targetDeploy.status !== "live" && targetDeploy.status !== "rolled_back") {
        throw new GuardError({
          message: `Can only rollback to a deployment that was previously live. Target status: "${targetDeploy.status}"`,
          entityType: "project",
          entityId: params.projectId,
          fromState: targetDeploy.status,
          toState: "deploying",
        });
      }

      const now = new Date().toISOString();

      // Mark current live deployment as rolled_back
      await tx.deployments.updateMany({
        where: {
          project_id: params.projectId,
          environment: params.environment,
          status: "live",
        },
        data: { status: "rolled_back" },
      });

      const rollbackDeploy = await tx.deployments.create({
        data: {
          project_id: params.projectId,
          environment: params.environment,
          source_type: targetDeploy.source_type,
          source_ref: targetDeploy.source_ref,
          version_label: `rollback-to-${targetDeploy.version_label ?? targetDeploy.id.slice(0, 8)}`,
          status: "deploying",
          started_at: now,
          rollback_of_deployment_id: params.targetDeploymentId,
        },
      });

      await tx.activity_events.create({
        data: {
          entity_type: "project",
          entity_id: params.projectId,
          event_type: "deployment.rollback_started",
          project_id: params.projectId,
          actor_type: "founder",
          event_payload: {
            deployment_id: rollbackDeploy.id,
            rollback_of_deployment_id: params.targetDeploymentId,
            environment: params.environment,
            reason: params.reason ?? null,
          },
        },
      });

      // Outbox
      try {
        await tx.outbox_events.create({
          data: {
            aggregate_type: "deployment",
            aggregate_id: rollbackDeploy.id,
            event_type: "deployment.rollback_started",
            payload_json: {
              deployment_id: rollbackDeploy.id,
              project_id: params.projectId,
              environment: params.environment,
              rollback_to: params.targetDeploymentId,
              source_ref: targetDeploy.source_ref,
            },
            status: "pending",
          },
        });
      } catch { /* best-effort */ }

      logInfo("rollback_started", {
        deploymentId: rollbackDeploy.id,
        rollbackOf: params.targetDeploymentId,
        environment: params.environment,
      });

      return rollbackDeploy;
    });
  }

  // ─── Docker Deploy Command Generation (for external executor) ───

  /**
   * Generate the Docker deploy commands for a deployment.
   * These are executed externally (GitHub Actions workflow or manual SSH).
   */
  generateDeployCommands(config: DeployConfig, versionLabel: string): string[] {
    return [
      `docker pull ${config.registryUrl}:${versionLabel}`,
      `docker stop ${config.containerName} || true`,
      `docker rm ${config.containerName} || true`,
      `docker run -d --name ${config.containerName} --restart unless-stopped ${config.registryUrl}:${versionLabel}`,
    ];
  }
}
