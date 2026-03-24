// Artifact Consistency Service
// Validates artifact_category contract rules and evidence completeness.
// No lifecycle changes — validation only.

import { GuardError } from "@/guards/GuardError";
import { logInfo } from "@/lib/logger";

interface PrismaLike {
  [key: string]: any;
}

/**
 * Valid artifact categories with their contract requirements.
 */
export const ARTIFACT_CATEGORIES = [
  "spec",
  "architecture",
  "implementation_patch",
  "review_report",
  "qa_evidence",
  "release_note",
  "deployment_receipt",
  "blueprint",
  "estimate",
  "technical_plan",
] as const;

export type ArtifactCategory = (typeof ARTIFACT_CATEGORIES)[number];

interface CategoryContract {
  /** Required source_entity_type values */
  requiredSourceType?: string[];
  /** Must have run_id set */
  requiresRunId?: boolean;
  /** Must have related_repo_workspace_id set */
  requiresWorkspace?: boolean;
  /** Must have related_deployment_id set */
  requiresDeployment?: boolean;
  /** Must have related_check_suite_id set */
  requiresCheckSuite?: boolean;
}

/**
 * Contract rules per artifact category.
 * Defines what references each category MUST have.
 */
const CATEGORY_CONTRACTS: Record<ArtifactCategory, CategoryContract> = {
  spec: {
    requiredSourceType: ["blueprint"],
  },
  architecture: {
    requiredSourceType: ["blueprint"],
  },
  implementation_patch: {
    requiresRunId: true,
    requiresWorkspace: true,
    requiredSourceType: ["run"],
  },
  review_report: {
    requiredSourceType: ["review"],
  },
  qa_evidence: {
    // Must reference either check_suite or deployment
    requiredSourceType: ["check_suite", "deployment"],
  },
  release_note: {
    requiresDeployment: true,
    requiredSourceType: ["deployment"],
  },
  deployment_receipt: {
    requiresDeployment: true,
    requiredSourceType: ["deployment"],
  },
  blueprint: {
    requiredSourceType: ["blueprint"],
  },
  estimate: {
    requiredSourceType: ["estimate"],
  },
  technical_plan: {},
};

export interface ConsistencyViolation {
  field: string;
  message: string;
  category: string;
}

export class ArtifactConsistencyService {
  private prisma: PrismaLike;

  constructor(prisma: PrismaLike) {
    this.prisma = prisma;
  }

  /**
   * Validate that an artifact's category contract is satisfied.
   * Returns violations but does NOT throw — caller decides enforcement level.
   */
  validateCategoryContract(artifact: {
    id: string;
    artifact_category?: string | null;
    source_entity_type?: string | null;
    source_entity_id?: string | null;
    run_id?: string | null;
    related_repo_workspace_id?: string | null;
    related_deployment_id?: string | null;
    related_check_suite_id?: string | null;
  }): ConsistencyViolation[] {
    const violations: ConsistencyViolation[] = [];
    const category = artifact.artifact_category as ArtifactCategory | null;

    // Rule: artifact_category should be set
    if (!category) {
      violations.push({
        field: "artifact_category",
        message: "Artifact has no category assigned",
        category: "unknown",
      });
      return violations;
    }

    // Rule: category must be valid
    if (!ARTIFACT_CATEGORIES.includes(category)) {
      violations.push({
        field: "artifact_category",
        message: `Unknown category "${category}". Valid: ${ARTIFACT_CATEGORIES.join(", ")}`,
        category,
      });
      return violations;
    }

    const contract = CATEGORY_CONTRACTS[category];

    // Check required source_entity_type
    if (contract.requiredSourceType && contract.requiredSourceType.length > 0) {
      if (!artifact.source_entity_type) {
        violations.push({
          field: "source_entity_type",
          message: `Category "${category}" requires source_entity_type to be one of: ${contract.requiredSourceType.join(", ")}`,
          category,
        });
      } else if (!contract.requiredSourceType.includes(artifact.source_entity_type)) {
        violations.push({
          field: "source_entity_type",
          message: `Category "${category}" requires source_entity_type ∈ [${contract.requiredSourceType.join(", ")}], got "${artifact.source_entity_type}"`,
          category,
        });
      }
    }

    // Check run_id requirement
    if (contract.requiresRunId && !artifact.run_id) {
      violations.push({
        field: "run_id",
        message: `Category "${category}" requires run_id to be set`,
        category,
      });
    }

    // Check workspace requirement
    if (contract.requiresWorkspace && !artifact.related_repo_workspace_id) {
      violations.push({
        field: "related_repo_workspace_id",
        message: `Category "${category}" requires related_repo_workspace_id to be set`,
        category,
      });
    }

    // Check deployment requirement
    if (contract.requiresDeployment && !artifact.related_deployment_id) {
      violations.push({
        field: "related_deployment_id",
        message: `Category "${category}" requires related_deployment_id to be set`,
        category,
      });
    }

    // Check check_suite requirement
    if (contract.requiresCheckSuite && !artifact.related_check_suite_id) {
      violations.push({
        field: "related_check_suite_id",
        message: `Category "${category}" requires related_check_suite_id to be set`,
        category,
      });
    }

    return violations;
  }

  /**
   * Validate artifact before creation — throws GuardError if category is missing.
   */
  enforceCreation(params: {
    artifact_category?: string | null;
    source_entity_type?: string | null;
  }): void {
    if (!params.artifact_category) {
      throw new GuardError({
        message: "Cannot create artifact without artifact_category. Use one of: " + ARTIFACT_CATEGORIES.join(", "),
        entityType: "artifact",
        entityId: "new",
        fromState: "none",
        toState: "created",
      });
    }

    if (!ARTIFACT_CATEGORIES.includes(params.artifact_category as ArtifactCategory)) {
      throw new GuardError({
        message: `Invalid artifact_category "${params.artifact_category}". Valid: ${ARTIFACT_CATEGORIES.join(", ")}`,
        entityType: "artifact",
        entityId: "new",
        fromState: "none",
        toState: "created",
      });
    }
  }

  /**
   * Validate deployment_receipt: deployment must be live.
   */
  async validateDeploymentReceipt(deploymentId: string): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    const deployment = await this.prisma.deployments.findUnique({
      where: { id: deploymentId },
    });

    if (!deployment) {
      return { valid: false, reason: `Deployment ${deploymentId} not found` };
    }

    if (deployment.status !== "live") {
      return {
        valid: false,
        reason: `Deployment ${deploymentId} status is "${deployment.status}" — must be "live" to create deployment_receipt`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate review_report: review must have a verdict.
   */
  async validateReviewReport(reviewId: string): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    const review = await this.prisma.reviews.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return { valid: false, reason: `Review ${reviewId} not found` };
    }

    if (!review.verdict) {
      return {
        valid: false,
        reason: `Review ${reviewId} has no verdict — cannot create review_report without resolved review`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate implementation_patch: must have workspace.
   */
  async validateImplementationPatch(runId: string): Promise<{
    valid: boolean;
    workspaceId?: string;
    reason?: string;
  }> {
    const workspace = await this.prisma.repo_workspaces?.findFirst({
      where: { run_id: runId },
    });

    if (!workspace) {
      return {
        valid: false,
        reason: `No repo_workspace found for run ${runId} — cannot create implementation_patch without workspace`,
      };
    }

    return { valid: true, workspaceId: workspace.id };
  }

  /**
   * Full consistency check for an existing artifact.
   * Logs violations and returns them.
   */
  async auditArtifact(artifactId: string): Promise<ConsistencyViolation[]> {
    const artifact = await this.prisma.artifacts.findUnique({
      where: { id: artifactId },
    });

    if (!artifact) return [];

    const violations = this.validateCategoryContract(artifact);

    if (violations.length > 0) {
      logInfo("artifact_consistency_violations", {
        artifactId,
        category: artifact.artifact_category,
        violationCount: violations.length,
        violations: violations.map((v) => v.message),
      });
    }

    return violations;
  }

  /**
   * Batch audit all artifacts for a project.
   * Returns summary of violations by category.
   */
  async auditProject(projectId: string): Promise<{
    total: number;
    withViolations: number;
    violationsByCategory: Record<string, number>;
  }> {
    const artifacts = await this.prisma.artifacts.findMany({
      where: { project_id: projectId },
    });

    let withViolations = 0;
    const violationsByCategory: Record<string, number> = {};

    for (const artifact of artifacts) {
      const violations = this.validateCategoryContract(artifact);
      if (violations.length > 0) {
        withViolations++;
        for (const v of violations) {
          violationsByCategory[v.category] =
            (violationsByCategory[v.category] ?? 0) + 1;
        }
      }
    }

    return {
      total: artifacts.length,
      withViolations,
      violationsByCategory,
    };
  }
}
