// Front Office Service
// Manages IntakeRequest → BlueprintContract → EstimateReport → LaunchDecision pipeline
// Project creation guard: all three must be approved before project creation is allowed.

import { GuardError } from "@/guards/GuardError";

interface PrismaLike {
  $transaction: <T>(fn: (tx: any) => Promise<T>, options?: any) => Promise<T>;
  [key: string]: any;
}

export class FrontOfficeService {
  private prisma: PrismaLike;

  constructor(prisma: PrismaLike) {
    this.prisma = prisma;
  }

  /**
   * Create an IntakeRequest — the entry point of the Front Office flow.
   */
  async createIntakeRequest(params: {
    departmentId?: string;
    clientName: string;
    businessGoal: string;
    targetUsersJson?: unknown[];
    constraintsJson?: unknown[];
    nonGoalsJson?: unknown[];
    successMetricsJson?: unknown[];
    riskClass?: string;
  }) {
    return this.prisma.intake_requests.create({
      data: {
        department_id: params.departmentId ?? null,
        client_name: params.clientName,
        business_goal: params.businessGoal,
        target_users_json: params.targetUsersJson ?? [],
        constraints_json: params.constraintsJson ?? [],
        non_goals_json: params.nonGoalsJson ?? [],
        success_metrics_json: params.successMetricsJson ?? [],
        risk_class: params.riskClass ?? "low",
        status: "draft",
      },
    });
  }

  /**
   * Create a BlueprintContract from an IntakeRequest.
   * IntakeRequest must exist and be in "discussed" status.
   */
  async createBlueprintContract(params: {
    intakeRequestId: string;
    scopeJson: unknown[];
    outOfScopeJson?: unknown[];
    acceptanceCriteriaJson: unknown[];
    keyDecisionsJson?: unknown[];
    effortBand?: string;
    criticalRisksJson?: unknown[];
  }) {
    return this.prisma.$transaction(async (tx: any) => {
      const intake = await tx.intake_requests.findUniqueOrThrow({
        where: { id: params.intakeRequestId },
      });

      if (intake.status === "cancelled") {
        throw new GuardError({
          message: "Cannot create blueprint from cancelled intake request",
          entityType: "project",
          entityId: params.intakeRequestId,
          fromState: "cancelled",
          toState: "blueprint_created",
        });
      }

      const blueprint = await tx.blueprint_contracts.create({
        data: {
          intake_request_id: params.intakeRequestId,
          scope_json: params.scopeJson,
          out_of_scope_json: params.outOfScopeJson ?? [],
          acceptance_criteria_json: params.acceptanceCriteriaJson,
          key_decisions_json: params.keyDecisionsJson ?? [],
          effort_band: params.effortBand ?? "medium",
          critical_risks_json: params.criticalRisksJson ?? [],
        },
      });

      await tx.intake_requests.update({
        where: { id: params.intakeRequestId },
        data: { status: "blueprint_created" },
      });

      return blueprint;
    });
  }

  /**
   * Create an EstimateReport from a BlueprintContract.
   * Blueprint must be founder-approved.
   */
  async createEstimateReport(params: {
    blueprintContractId: string;
    minTokenEstimate: number;
    avgTokenEstimate: number;
    worstCaseTokenEstimate: number;
    minCostEstimate: number;
    avgCostEstimate: number;
    worstCaseCostEstimate: number;
    timelineDaysEstimate: number;
    riskNotesJson?: unknown[];
  }) {
    return this.prisma.$transaction(async (tx: any) => {
      const blueprint = await tx.blueprint_contracts.findUniqueOrThrow({
        where: { id: params.blueprintContractId },
      });

      if (!blueprint.approved_by_founder) {
        throw new GuardError({
          message: "Blueprint must be founder-approved before creating estimate",
          entityType: "project",
          entityId: params.blueprintContractId,
          fromState: "unapproved",
          toState: "estimate_created",
        });
      }

      return tx.estimate_reports.create({
        data: {
          blueprint_contract_id: params.blueprintContractId,
          min_token_estimate: params.minTokenEstimate,
          avg_token_estimate: params.avgTokenEstimate,
          worst_case_token_estimate: params.worstCaseTokenEstimate,
          min_cost_estimate: params.minCostEstimate,
          avg_cost_estimate: params.avgCostEstimate,
          worst_case_cost_estimate: params.worstCaseCostEstimate,
          timeline_days_estimate: params.timelineDaysEstimate,
          risk_notes_json: params.riskNotesJson ?? [],
        },
      });
    });
  }

  /**
   * Record a LaunchDecision. Estimate must be founder-approved.
   */
  async createLaunchDecision(params: {
    estimateReportId: string;
    decision: "approved" | "rejected" | "deferred";
    founderNote?: string;
  }) {
    return this.prisma.$transaction(async (tx: any) => {
      const estimate = await tx.estimate_reports.findUniqueOrThrow({
        where: { id: params.estimateReportId },
      });

      if (!estimate.approved_by_founder) {
        throw new GuardError({
          message: "Estimate must be founder-approved before launch decision",
          entityType: "project",
          entityId: params.estimateReportId,
          fromState: "unapproved",
          toState: "launch_decided",
        });
      }

      return tx.launch_decisions.create({
        data: {
          estimate_report_id: params.estimateReportId,
          decision: params.decision,
          founder_note: params.founderNote ?? null,
        },
      });
    });
  }

  /**
   * Validate that Front Office pipeline is complete and approved.
   * Called by ProjectService before project creation.
   * Returns the validated chain of IDs.
   */
  async validateProjectCreationGuard(params: {
    intakeRequestId: string;
    blueprintContractId: string;
    estimateReportId: string;
  }): Promise<{
    intakeRequest: any;
    blueprint: any;
    estimate: any;
    launchDecision: any;
  }> {
    return this.prisma.$transaction(async (tx: any) => {
      // 1. Validate IntakeRequest
      const intake = await tx.intake_requests.findUniqueOrThrow({
        where: { id: params.intakeRequestId },
      });
      if (intake.status === "cancelled") {
        throw new GuardError({
          message: "IntakeRequest is cancelled — cannot create project",
          entityType: "project",
          entityId: params.intakeRequestId,
          fromState: "cancelled",
          toState: "created",
        });
      }

      // 2. Validate BlueprintContract
      const blueprint = await tx.blueprint_contracts.findUniqueOrThrow({
        where: { id: params.blueprintContractId },
      });
      if (blueprint.intake_request_id !== params.intakeRequestId) {
        throw new GuardError({
          message: "BlueprintContract does not belong to the specified IntakeRequest",
          entityType: "project",
          entityId: params.blueprintContractId,
          fromState: "mislinked",
          toState: "created",
        });
      }
      if (!blueprint.approved_by_founder) {
        throw new GuardError({
          message: "BlueprintContract must be founder-approved before project creation",
          entityType: "project",
          entityId: params.blueprintContractId,
          fromState: "unapproved",
          toState: "created",
        });
      }

      // 3. Validate EstimateReport
      const estimate = await tx.estimate_reports.findUniqueOrThrow({
        where: { id: params.estimateReportId },
      });
      if (estimate.blueprint_contract_id !== params.blueprintContractId) {
        throw new GuardError({
          message: "EstimateReport does not belong to the specified BlueprintContract",
          entityType: "project",
          entityId: params.estimateReportId,
          fromState: "mislinked",
          toState: "created",
        });
      }
      if (!estimate.approved_by_founder) {
        throw new GuardError({
          message: "EstimateReport must be founder-approved before project creation",
          entityType: "project",
          entityId: params.estimateReportId,
          fromState: "unapproved",
          toState: "created",
        });
      }

      // 4. Validate LaunchDecision
      const launchDecision = await tx.launch_decisions.findFirst({
        where: {
          estimate_report_id: params.estimateReportId,
          decision: "approved",
        },
        orderBy: { created_at: "desc" },
      });
      if (!launchDecision) {
        throw new GuardError({
          message: "No approved LaunchDecision found — founder must approve launch before project creation",
          entityType: "project",
          entityId: params.estimateReportId,
          fromState: "no_decision",
          toState: "created",
        });
      }

      return { intakeRequest: intake, blueprint, estimate, launchDecision };
    }, { isolationLevel: "Serializable" });
  }
}
