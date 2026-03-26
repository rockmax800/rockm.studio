// CTO Readiness Gate — validates whether planning is mature enough
// for AI CTO engineering decomposition.
// Intent Plane contract: no engineering normalization without complete planning.

export type CtoGateStatus = "ready" | "blocked";

export interface CtoGateCheck {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface CtoReadinessResult {
  status: CtoGateStatus;
  checks: CtoGateCheck[];
  passedCount: number;
  totalCount: number;
}

export interface CtoReadinessInput {
  clarificationComplete: boolean;
  moduleCount: number;
  dependencyEdgeCount: number;
  /** true if founder acknowledged modules are independent */
  independenceAcknowledged?: boolean;
  deliveryMode: string | null;
  blueprintApproved: boolean;
  mvpReductionComplete: boolean;
  isMvpProject: boolean;
}

/** Validate all prerequisites for AI CTO engineering decomposition */
export function validateCtoReadiness(input: CtoReadinessInput): CtoReadinessResult {
  const checks: CtoGateCheck[] = [];

  checks.push({
    key: "clarification",
    label: "Clarification",
    passed: input.clarificationComplete,
    detail: input.clarificationComplete
      ? "Clarification loop completed and confirmed"
      : "Clarification loop must be completed before engineering decomposition",
  });

  checks.push({
    key: "modules",
    label: "Module map",
    passed: input.moduleCount > 0,
    detail: input.moduleCount > 0
      ? `${input.moduleCount} module${input.moduleCount !== 1 ? "s" : ""} defined`
      : "At least one module must be defined via System Decomposition",
  });

  const depsOk = input.moduleCount <= 1
    || input.dependencyEdgeCount > 0
    || !!input.independenceAcknowledged;
  checks.push({
    key: "dependencies",
    label: "Dependencies",
    passed: depsOk,
    detail: depsOk
      ? input.moduleCount <= 1
        ? "Single module — dependencies not required"
        : input.independenceAcknowledged
        ? "Module independence confirmed by founder"
        : `${input.dependencyEdgeCount} dependency edge${input.dependencyEdgeCount !== 1 ? "s" : ""} defined`
      : "Dependency graph required for multi-module projects",
  });

  checks.push({
    key: "delivery_mode",
    label: "Delivery mode",
    passed: !!input.deliveryMode,
    detail: input.deliveryMode
      ? `Delivery mode: ${input.deliveryMode.replace(/_/g, " ")}`
      : "Delivery mode must be set (mvp_first / full_scope / phased_rollout)",
  });

  checks.push({
    key: "blueprint",
    label: "Blueprint approval",
    passed: input.blueprintApproved,
    detail: input.blueprintApproved
      ? "Blueprint approved by founder"
      : "Blueprint must be approved via Approval entity before engineering decomposition",
  });

  if (input.isMvpProject) {
    checks.push({
      key: "mvp_reduction",
      label: "MVP reduction",
      passed: input.mvpReductionComplete,
      detail: input.mvpReductionComplete
        ? "MVP scope reduction completed"
        : "MVP Reduction Pass must be completed for MVP projects",
    });
  }

  const passedCount = checks.filter((c) => c.passed).length;
  return {
    status: passedCount === checks.length ? "ready" : "blocked",
    checks,
    passedCount,
    totalCount: checks.length,
  };
}
