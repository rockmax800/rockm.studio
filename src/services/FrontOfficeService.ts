// Front Office Service
// Manages IntakeRequest → BlueprintContract → EstimateReport → LaunchDecision pipeline
// All approvals go through the canonical Approval entity — no boolean flags.

import { GuardError } from "@/guards/GuardError";
import { writeEventLog } from "@/lib/eventLogWriter";

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
   * IntakeRequest must exist and not be cancelled.
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
   * Blueprint must have an approved Approval entity record.
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
      await tx.blueprint_contracts.findUniqueOrThrow({
        where: { id: params.blueprintContractId },
      });

      // Check for approved Approval entity instead of boolean flag
      const blueprintApproval = await this.findApprovedApproval(
        tx, "blueprint_contract", params.blueprintContractId,
      );
      if (!blueprintApproval) {
        throw new GuardError({
          message: "Blueprint must have an approved Approval record before creating estimate",
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
   * Record a LaunchDecision. Estimate must have an approved Approval record.
   */
  async createLaunchDecision(params: {
    estimateReportId: string;
    decision: "approved" | "rejected" | "deferred";
    founderNote?: string;
  }) {
    return this.prisma.$transaction(async (tx: any) => {
      await tx.estimate_reports.findUniqueOrThrow({
        where: { id: params.estimateReportId },
      });

      // Check for approved Approval entity instead of boolean flag
      const estimateApproval = await this.findApprovedApproval(
        tx, "estimate_report", params.estimateReportId,
      );
      if (!estimateApproval) {
        throw new GuardError({
          message: "Estimate must have an approved Approval record before launch decision",
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
   * All approvals checked via Approval entity — no boolean flags.
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

      // 2. Validate BlueprintContract + Approval
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
      const blueprintApproval = await this.findApprovedApproval(
        tx, "blueprint_contract", params.blueprintContractId,
      );
      if (!blueprintApproval) {
        throw new GuardError({
          message: "BlueprintContract must have an approved Approval record before project creation",
          entityType: "project",
          entityId: params.blueprintContractId,
          fromState: "unapproved",
          toState: "created",
        });
      }

      // 3. Validate EstimateReport + Approval
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
      const estimateApproval = await this.findApprovedApproval(
        tx, "estimate_report", params.estimateReportId,
      );
      if (!estimateApproval) {
        throw new GuardError({
          message: "EstimateReport must have an approved Approval record before project creation",
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

  /**
   * Helper: find an approved Approval entity for a given target.
   * Returns the approval record or null if none found.
   */
  private async findApprovedApproval(
    tx: any,
    targetType: string,
    targetId: string,
  ): Promise<any | null> {
    return tx.approvals.findFirst({
      where: {
        target_type: targetType,
        target_id: targetId,
        decision: "approved",
        state: { in: ["decided", "closed"] },
      },
      orderBy: { created_at: "desc" },
    });
  }
}
