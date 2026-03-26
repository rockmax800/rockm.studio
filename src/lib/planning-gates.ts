// Planning Gate Validator — enforces prerequisites before EstimateReport generation.
// Intent Plane contract: no estimate without structured planning artifacts.

import type { SystemModule, DependencyEdge } from "@/types/front-office-planning";

export interface PlanningGateInput {
  clarificationComplete: boolean;
  modules: SystemModule[];
  dependencyEdges: DependencyEdge[];
  mvpReductionComplete: boolean;
  isMvpProject: boolean;
  /** Founder explicitly confirmed modules are independent (no dependency edges needed) */
  independenceAcknowledged?: boolean;
}

export interface GateFailure {
  key: string;
  label: string;
  detail: string;
}

export interface PlanningGateResult {
  passed: boolean;
  failures: GateFailure[];
}

/** Check all planning prerequisites for estimate generation */
export function validatePlanningGate(input: PlanningGateInput): PlanningGateResult {
  const failures: GateFailure[] = [];

  if (!input.clarificationComplete) {
    failures.push({
      key: "clarification",
      label: "Clarification incomplete",
      detail: "The clarification loop must be completed and confirmed by the founder before estimation can begin.",
    });
  }

  if (input.modules.length === 0) {
    failures.push({
      key: "modules",
      label: "Module map missing",
      detail: "System decomposition must produce at least one module definition. Estimation without modular decomposition is blocked.",
    });
  }

  if (input.modules.length > 1 && input.dependencyEdges.length === 0 && !input.independenceAcknowledged) {
    failures.push({
      key: "dependencies",
      label: "Dependency graph missing",
      detail: "A dependency graph between modules is required. Define at least one dependency relationship or confirm modules are independent.",
    });
  }

  if (input.isMvpProject && !input.mvpReductionComplete) {
    failures.push({
      key: "mvp_reduction",
      label: "MVP reduction incomplete",
      detail: "This is an MVP project — the MVP Reduction Pass must be completed to define scope boundaries before estimation.",
    });
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}
