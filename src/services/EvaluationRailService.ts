// Evaluation Rail Service
// Independent verification layer parallel to Delivery Plane.
// MUST NOT mutate delivery state (tasks, runs, artifacts, deployments).
// All evaluation runs reference frozen context snapshots.
// Founder approval required for any promotion.

import { GuardError } from "@/guards/GuardError";
import { writeEventLog } from "@/lib/eventLogWriter";
import { logInfo } from "@/lib/logger";

interface PrismaLike {
  [key: string]: any;
}

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type SuiteType = "architecture" | "implementation" | "qa" | "release" | "learning";

export interface EvalGateResult {
  passed: boolean;
  protectedPassed: boolean;
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: string[];
  passRate: number;
}

// ──────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────

export class EvaluationRailService {
  private prisma: PrismaLike;

  constructor(prisma: PrismaLike) {
    this.prisma = prisma;
  }

  // ─── Suite Management ───

  async createSuite(params: {
    name: string;
    description: string;
    suiteType: SuiteType;
    isProtected: boolean;
  }) {
    const suite = await this.prisma.evaluation_suites.create({
      data: {
        name: params.name,
        description: params.description,
        suite_type: params.suiteType,
        protected: params.isProtected,
      },
    });

    logInfo("evaluation_suite_created", { suiteId: suite.id, type: params.suiteType });
    return suite;
  }

  // ─── Scenario Management ───

  async addScenario(params: {
    suiteId: string;
    scenarioName: string;
    scenarioDescription: string;
    inputFixtureRef?: string;
    expectedOutcome: Record<string, unknown>;
    critical: boolean;
  }) {
    const scenario = await this.prisma.evaluation_scenarios.create({
      data: {
        suite_id: params.suiteId,
        scenario_name: params.scenarioName,
        scenario_description: params.scenarioDescription,
        input_fixture_ref: params.inputFixtureRef ?? null,
        expected_outcome_json: params.expectedOutcome,
        critical: params.critical,
      },
    });

    logInfo("evaluation_scenario_added", {
      scenarioId: scenario.id,
      suiteId: params.suiteId,
      critical: params.critical,
    });
    return scenario;
  }

  // ─── Evaluation Run (extends existing evaluation_runs) ───

  /**
   * Create an evaluation run against a suite.
   * MUST reference a frozen context snapshot.
   * MUST NOT mutate delivery state.
   */
  async createEvaluationRun(params: {
    suiteId: string;
    relatedRunId?: string;
    relatedLearningProposalId?: string;
    contextSnapshotRef: string;
  }) {
    // Verify suite exists
    const suite = await this.prisma.evaluation_suites.findUnique({
      where: { id: params.suiteId },
    });
    if (!suite) {
      throw new GuardError({
        message: `Evaluation suite ${params.suiteId} not found`,
        entityType: "approval",
        entityId: params.suiteId,
        fromState: "none",
        toState: "created",
      });
    }

    const evalRun = await this.prisma.evaluation_runs.create({
      data: {
        suite_id: params.suiteId,
        related_run_id: params.relatedRunId ?? null,
        learning_proposal_id: params.relatedLearningProposalId ?? null,
        context_snapshot_ref: params.contextSnapshotRef,
        status: "created",
      },
    });

    try {
      await writeEventLog(this.prisma, {
        eventType: "evaluation_run.created",
        aggregateType: "evaluation_run",
        aggregateId: evalRun.id,
        payload: {
          suite_id: params.suiteId,
          suite_type: suite.suite_type,
          related_run_id: params.relatedRunId,
          related_learning_proposal_id: params.relatedLearningProposalId,
        },
        actorType: "system",
        idempotencyKey: `eval_run:${evalRun.id}:created`,
      });
    } catch { /* best-effort */ }

    logInfo("evaluation_run_created", {
      evalRunId: evalRun.id,
      suiteId: params.suiteId,
    });
    return evalRun;
  }

  /**
   * Record evaluation run results with per-scenario outcomes.
   */
  async completeEvaluationRun(params: {
    evaluationRunId: string;
    resultJson: Record<string, unknown>;
    passRate: number;
    failedScenarios: string[];
  }) {
    const evalRun = await this.prisma.evaluation_runs.findUnique({
      where: { id: params.evaluationRunId },
    });

    if (!evalRun || (evalRun.status !== "created" && evalRun.status !== "running")) {
      throw new GuardError({
        message: `Evaluation run must be "created" or "running". Current: "${evalRun?.status}"`,
        entityType: "approval",
        entityId: params.evaluationRunId,
        fromState: evalRun?.status ?? "unknown",
        toState: "completed",
      });
    }

    const now = new Date().toISOString();
    const updated = await this.prisma.evaluation_runs.update({
      where: { id: params.evaluationRunId },
      data: {
        status: "completed",
        result_metrics_json: params.resultJson,
        pass_rate: params.passRate,
        failed_scenarios_json: params.failedScenarios,
        completed_at: now,
      },
    });

    try {
      await writeEventLog(this.prisma, {
        eventType: "evaluation_run.completed",
        aggregateType: "evaluation_run",
        aggregateId: params.evaluationRunId,
        payload: {
          pass_rate: params.passRate,
          failed_count: params.failedScenarios.length,
        },
        actorType: "system",
        idempotencyKey: `eval_run:${params.evaluationRunId}:completed`,
      });
    } catch { /* best-effort */ }

    logInfo("evaluation_run_completed", {
      evalRunId: params.evaluationRunId,
      passRate: params.passRate,
    });
    return updated;
  }

  // ─── Evaluation Gate ───

  /**
   * Check protected scenario gate for a suite.
   * Rule: If suite.protected === true, ALL critical scenarios must pass.
   */
  async checkProtectedGate(suiteId: string, evaluationRunId: string): Promise<EvalGateResult> {
    const suite = await this.prisma.evaluation_suites.findUnique({
      where: { id: suiteId },
    });

    const evalRun = await this.prisma.evaluation_runs.findUnique({
      where: { id: evaluationRunId },
    });

    if (!suite || !evalRun || evalRun.status !== "completed") {
      return {
        passed: false,
        protectedPassed: false,
        totalScenarios: 0,
        passedScenarios: 0,
        failedScenarios: ["Evaluation run not completed or suite not found"],
        passRate: 0,
      };
    }

    const scenarios = await this.prisma.evaluation_scenarios.findMany({
      where: { suite_id: suiteId },
    });

    const failedNames: string[] = (evalRun.failed_scenarios_json ?? []) as string[];
    const failedSet = new Set(failedNames);

    // Check critical scenarios
    const criticalScenarios = scenarios.filter((s: any) => s.critical);
    const criticalFailed = criticalScenarios.filter((s: any) => failedSet.has(s.scenario_name));

    const protectedPassed = suite.protected
      ? criticalFailed.length === 0
      : true;

    return {
      passed: failedNames.length === 0,
      protectedPassed,
      totalScenarios: scenarios.length,
      passedScenarios: scenarios.length - failedNames.length,
      failedScenarios: failedNames,
      passRate: evalRun.pass_rate ?? 0,
    };
  }

  // ─── Evaluation Report ───

  /**
   * Generate an evaluation report for a target entity.
   * Aggregates all evaluation runs for the target.
   */
  async createReport(params: {
    targetType: "run" | "learning_proposal" | "deployment";
    targetId: string;
    summaryJson: Record<string, unknown>;
    baselineComparisonJson?: Record<string, unknown>;
    protectedScenariosPassed: boolean;
  }) {
    const report = await this.prisma.evaluation_reports.create({
      data: {
        target_type: params.targetType,
        target_id: params.targetId,
        summary_json: params.summaryJson,
        baseline_comparison_json: params.baselineComparisonJson ?? null,
        protected_scenarios_passed: params.protectedScenariosPassed,
      },
    });

    try {
      await writeEventLog(this.prisma, {
        eventType: "evaluation_report.created",
        aggregateType: "evaluation_report",
        aggregateId: report.id,
        payload: {
          target_type: params.targetType,
          target_id: params.targetId,
          protected_passed: params.protectedScenariosPassed,
        },
        actorType: "system",
        idempotencyKey: `eval_report:${report.id}:created`,
      });
    } catch { /* best-effort */ }

    logInfo("evaluation_report_created", {
      reportId: report.id,
      targetType: params.targetType,
      targetId: params.targetId,
    });
    return report;
  }

  /**
   * Find evaluation report for a target entity.
   */
  async findReport(targetType: string, targetId: string) {
    return this.prisma.evaluation_reports.findFirst({
      where: { target_type: targetType, target_id: targetId },
      orderBy: { created_at: "desc" },
    });
  }

  // ─── Baseline Tracking ───

  /**
   * Update baseline metrics for a suite.
   */
  async updateBaseline(suiteId: string, metricsJson: Record<string, unknown>) {
    const existing = await this.prisma.evaluation_baselines.findFirst({
      where: { suite_id: suiteId },
    });

    if (existing) {
      return this.prisma.evaluation_baselines.update({
        where: { id: existing.id },
        data: {
          baseline_metrics_json: metricsJson,
          last_updated: new Date().toISOString(),
        },
      });
    }

    return this.prisma.evaluation_baselines.create({
      data: {
        suite_id: suiteId,
        baseline_metrics_json: metricsJson,
      },
    });
  }

  /**
   * Get baseline for comparison.
   */
  async getBaseline(suiteId: string) {
    return this.prisma.evaluation_baselines.findFirst({
      where: { suite_id: suiteId },
    });
  }

  // ─── Promotion Gate ───

  /**
   * Validate that a learning proposal can be promoted.
   * Requires: protected scenarios passed + founder Approval entity.
   */
  async validatePromotionGate(proposalId: string): Promise<{
    allowed: boolean;
    blockers: string[];
  }> {
    const blockers: string[] = [];

    // Check evaluation report exists with protected scenarios passed
    const report = await this.findReport("learning_proposal", proposalId);
    if (!report) {
      blockers.push("No evaluation report found for learning proposal");
    } else if (!report.protected_scenarios_passed) {
      blockers.push("Protected scenarios did not pass");
    }

    // Check founder Approval entity
    const approval = await this.prisma.approvals.findFirst({
      where: {
        target_type: "learning_proposal",
        target_id: proposalId,
        decision: "approved",
      },
    });

    if (!approval) {
      blockers.push("Founder approval (Approval entity) not found");
    }

    return {
      allowed: blockers.length === 0,
      blockers,
    };
  }

  /**
   * Validate that a production release has required evaluation.
   * Requires: evaluation report exists + protected scenarios passed.
   */
  async validateReleaseGate(deploymentId: string): Promise<{
    allowed: boolean;
    blockers: string[];
  }> {
    const blockers: string[] = [];

    const report = await this.findReport("deployment", deploymentId);
    if (!report) {
      blockers.push("No evaluation report found for deployment");
    } else if (!report.protected_scenarios_passed) {
      blockers.push("Protected scenarios did not pass for deployment");
    }

    return {
      allowed: blockers.length === 0,
      blockers,
    };
  }
}
