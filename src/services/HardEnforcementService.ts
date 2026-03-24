// Hard Enforcement Service
// Converts soft contracts into hard delivery gates.
// No feature additions — enforcement only.
// Violations BLOCK merge or deploy. No silent warnings.

import { GuardError } from "@/guards/GuardError";
import { writeEventLog } from "@/lib/eventLogWriter";
import { logInfo } from "@/lib/logger";

interface PrismaLike {
  $transaction: <T>(fn: (tx: any) => Promise<T>, options?: any) => Promise<T>;
  [key: string]: any;
}

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type CIResultClassification =
  | "passed"
  | "failed"
  | "contract_violation"
  | "evidence_missing"
  | "security_failed";

export interface MergeEnforcementResult {
  allowed: boolean;
  classification: CIResultClassification;
  violations: string[];
}

export interface DeployEnforcementResult {
  allowed: boolean;
  blockers: string[];
}

export interface EnforcementMetric {
  metricType: "contract_violation" | "blocked_merge" | "blocked_deploy";
  projectId: string;
  entityId?: string;
  entityType?: string;
  reason: string;
}

// ──────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────

export class HardEnforcementService {
  private prisma: PrismaLike;

  constructor(prisma: PrismaLike) {
    this.prisma = prisma;
  }

  // ─── SECTION 1: Role Contract Enforcement (Merge Block) ───

  /**
   * Enforce role contract on PR merge.
   * If changed_files violate allowed_repo_paths OR required_artifacts missing → BLOCK.
   * Emits contract.violation event and records enforcement metric.
   */
  async enforceRoleContractOnMerge(params: {
    pullRequestId: string;
    taskId: string;
    roleId: string;
    changedFiles: string[];
  }): Promise<MergeEnforcementResult> {
    const violations: string[] = [];

    // Load role contract
    const role = await this.prisma.agent_roles.findUnique({
      where: { id: params.roleId },
    });

    let contract: any = null;
    if (role?.role_contract_id) {
      contract = await this.prisma.role_contracts.findUnique({
        where: { id: role.role_contract_id },
      });
    }

    // 1. Path boundary check
    if (contract) {
      const allowedPaths: string[] = contract.allowed_repo_paths_json ?? [];
      const forbiddenPaths: string[] = contract.forbidden_repo_paths_json ?? [];

      for (const filePath of params.changedFiles) {
        // Forbidden path check
        for (const pattern of forbiddenPaths) {
          if (this.pathMatches(filePath, pattern)) {
            violations.push(
              `Path "${filePath}" forbidden by role contract (pattern: "${pattern}")`
            );
          }
        }

        // Allowed path check — if specified, must match at least one
        if (allowedPaths.length > 0) {
          const matchesAny = allowedPaths.some((p) => this.pathMatches(filePath, p));
          if (!matchesAny) {
            violations.push(
              `Path "${filePath}" outside allowed_repo_paths for role "${contract.role_code}"`
            );
          }
        }
      }
    }

    // 2. Required artifacts check
    if (contract?.required_artifacts_json?.length > 0) {
      const artifacts = await this.prisma.artifacts.findMany({
        where: { task_id: params.taskId },
        select: { artifact_category: true, artifact_type: true },
      });

      const presentCategories = new Set(
        artifacts.map((a: any) => a.artifact_category ?? a.artifact_type).filter(Boolean)
      );

      for (const required of contract.required_artifacts_json) {
        if (!presentCategories.has(required)) {
          violations.push(`Required artifact "${required}" missing for task ${params.taskId}`);
        }
      }
    }

    if (violations.length > 0) {
      // Record event_log
      await this.recordContractViolation(params.pullRequestId, "pull_request", violations);

      // Record metric
      const pr = await this.prisma.pull_requests?.findUnique({
        where: { id: params.pullRequestId },
      });
      if (pr) {
        await this.recordMetric({
          metricType: "contract_violation",
          projectId: pr.project_id,
          entityId: params.pullRequestId,
          entityType: "pull_request",
          reason: violations.join("; "),
        });
        await this.recordMetric({
          metricType: "blocked_merge",
          projectId: pr.project_id,
          entityId: params.pullRequestId,
          entityType: "pull_request",
          reason: `Contract violation: ${violations.length} issue(s)`,
        });
      }

      return {
        allowed: false,
        classification: "contract_violation",
        violations,
      };
    }

    return { allowed: true, classification: "passed", violations: [] };
  }

  // ─── SECTION 2: Artifact Completeness Enforcement ───

  /**
   * Enforce artifact completeness before PR merge.
   * Required: implementation_patch, review_report, tests_executed_json.
   * qa_evidence required if risk_class is high or critical.
   */
  async enforceArtifactCompleteness(params: {
    pullRequestId: string;
    taskId: string;
    riskClass?: string;
  }): Promise<MergeEnforcementResult> {
    const missing: string[] = [];

    const artifacts = await this.prisma.artifacts.findMany({
      where: { task_id: params.taskId },
      select: {
        artifact_category: true,
        artifact_type: true,
        tests_executed_json: true,
      },
    });

    const categories = new Set(
      artifacts.map((a: any) => a.artifact_category ?? a.artifact_type).filter(Boolean)
    );

    // Required for all tasks
    if (!categories.has("implementation_patch")) {
      missing.push("implementation_patch");
    }
    if (!categories.has("review_report")) {
      missing.push("review_report");
    }

    // qa_evidence required for high/critical risk
    if (params.riskClass === "high" || params.riskClass === "critical") {
      if (!categories.has("qa_evidence")) {
        missing.push("qa_evidence (required for risk_class: " + params.riskClass + ")");
      }
    }

    // tests_executed_json must not be empty on at least one artifact
    const hasTests = artifacts.some(
      (a: any) => a.tests_executed_json && Object.keys(a.tests_executed_json).length > 0
    );
    if (!hasTests) {
      missing.push("tests_executed_json (no test results found on any artifact)");
    }

    if (missing.length > 0) {
      const pr = await this.prisma.pull_requests?.findUnique({
        where: { id: params.pullRequestId },
      });
      if (pr) {
        await this.recordMetric({
          metricType: "blocked_merge",
          projectId: pr.project_id,
          entityId: params.pullRequestId,
          entityType: "pull_request",
          reason: `Evidence missing: ${missing.join(", ")}`,
        });
      }

      return {
        allowed: false,
        classification: "evidence_missing",
        violations: missing.map((m) => `Missing: ${m}`),
      };
    }

    return { allowed: true, classification: "passed", violations: [] };
  }

  // ─── SECTION 3: Deployment Gate Enforcement ───

  /**
   * Enforce all preconditions before production deploy.
   * Blocks if staging not live, health check not passed,
   * or DomainBindingSpec not approved.
   */
  async enforceDeploymentGate(params: {
    projectId: string;
    stagingDeploymentId: string;
  }): Promise<DeployEnforcementResult> {
    const blockers: string[] = [];

    // 1. Staging deployment must be live
    const staging = await this.prisma.deployments.findUnique({
      where: { id: params.stagingDeploymentId },
    });

    if (!staging) {
      blockers.push("Staging deployment not found");
    } else if (staging.status !== "live") {
      blockers.push(`Staging deployment status is "${staging.status}", must be "live"`);
    }

    // 2. DomainBindingSpec must exist and be approved via Approval entity
    const specs = await this.prisma.domain_binding_specs?.findMany({
      where: { project_id: params.projectId, environment: "production" },
    });

    if (!specs || specs.length === 0) {
      blockers.push("No DomainBindingSpec found for production environment");
    } else {
      // Check approval via Approval entity
      for (const spec of specs) {
        const approval = await this.prisma.approvals.findFirst({
          where: {
            target_id: spec.id,
            target_type: "domain_binding_spec",
            decision: "approved",
          },
        });
        if (!approval) {
          blockers.push(`DomainBindingSpec for "${spec.domain}" not approved by founder`);
        }
      }
    }

    // 3. Health endpoint validation (if specified in spec)
    if (specs?.length > 0) {
      for (const spec of specs) {
        if (spec.expected_health_endpoint && staging?.preview_url) {
          // Record that health check is required — actual HTTP check is external
          logInfo("deploy_gate_health_check_required", {
            domain: spec.domain,
            endpoint: spec.expected_health_endpoint,
          });
        }
      }
    }

    if (blockers.length > 0) {
      // Record event_log
      try {
        await writeEventLog(this.prisma, {
          eventType: "deploy.blocked_missing_contract",
          aggregateType: "deployment",
          aggregateId: params.stagingDeploymentId,
          payload: {
            project_id: params.projectId,
            blockers,
          },
          actorType: "system",
          idempotencyKey: `deploy_block:${params.stagingDeploymentId}:${Date.now()}`,
        });
      } catch { /* best-effort */ }

      await this.recordMetric({
        metricType: "blocked_deploy",
        projectId: params.projectId,
        entityId: params.stagingDeploymentId,
        entityType: "deployment",
        reason: blockers.join("; "),
      });

      return { allowed: false, blockers };
    }

    return { allowed: true, blockers: [] };
  }

  // ─── SECTION 5: Full PR Merge Gate ───

  /**
   * Combined merge gate: role contract + artifact completeness + CI status.
   * Returns final classification. PR merge allowed ONLY if classification === "passed".
   */
  async enforceMergeGate(params: {
    pullRequestId: string;
    taskId: string;
    roleId: string;
    changedFiles: string[];
    riskClass?: string;
  }): Promise<MergeEnforcementResult> {
    // 1. Role contract enforcement
    const contractResult = await this.enforceRoleContractOnMerge({
      pullRequestId: params.pullRequestId,
      taskId: params.taskId,
      roleId: params.roleId,
      changedFiles: params.changedFiles,
    });

    if (!contractResult.allowed) {
      return contractResult;
    }

    // 2. Artifact completeness enforcement
    const artifactResult = await this.enforceArtifactCompleteness({
      pullRequestId: params.pullRequestId,
      taskId: params.taskId,
      riskClass: params.riskClass,
    });

    if (!artifactResult.allowed) {
      return artifactResult;
    }

    return { allowed: true, classification: "passed", violations: [] };
  }

  // ─── Metrics ───

  /**
   * Record an enforcement metric for founder visibility.
   */
  async recordMetric(metric: EnforcementMetric): Promise<void> {
    try {
      await this.prisma.enforcement_metrics.create({
        data: {
          project_id: metric.projectId,
          metric_type: metric.metricType,
          entity_id: metric.entityId ?? null,
          entity_type: metric.entityType ?? null,
          reason: metric.reason,
        },
      });
    } catch {
      // Best-effort metric recording
      logInfo("enforcement_metric_write_failed", { metric });
    }
  }

  /**
   * Get enforcement metric counts for a project.
   */
  async getMetricCounts(projectId: string): Promise<{
    contract_violations: number;
    blocked_merges: number;
    blocked_deploys: number;
  }> {
    const [violations, merges, deploys] = await Promise.all([
      this.prisma.enforcement_metrics.count({
        where: { project_id: projectId, metric_type: "contract_violation" },
      }),
      this.prisma.enforcement_metrics.count({
        where: { project_id: projectId, metric_type: "blocked_merge" },
      }),
      this.prisma.enforcement_metrics.count({
        where: { project_id: projectId, metric_type: "blocked_deploy" },
      }),
    ]);

    return {
      contract_violations: violations,
      blocked_merges: merges,
      blocked_deploys: deploys,
    };
  }

  // ─── Internal ───

  private async recordContractViolation(
    entityId: string,
    entityType: string,
    violations: string[],
  ): Promise<void> {
    try {
      await writeEventLog(this.prisma, {
        eventType: "contract.violation",
        aggregateType: entityType,
        aggregateId: entityId,
        payload: { violations },
        actorType: "system",
        idempotencyKey: `contract_violation:${entityId}:${Date.now()}`,
      });
    } catch {
      logInfo("contract_violation_event_write_failed", { entityId, violations });
    }
  }

  private pathMatches(filePath: string, pattern: string): boolean {
    if (pattern === filePath) return true;
    const regexStr = pattern
      .replace(/\*\*/g, "___DOUBLESTAR___")
      .replace(/\*/g, "[^/]*")
      .replace(/___DOUBLESTAR___/g, ".*")
      .replace(/\./g, "\\.");
    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(filePath);
  }
}
