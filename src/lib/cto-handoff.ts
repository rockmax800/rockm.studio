// Deterministic builder for CTO Handoff Contract.
// Evaluates Company Lead planning state and produces a structured handoff artifact.

import type { CtoHandoffContract, HandoffMissingItem, HandoffBuildInput } from "@/types/cto-handoff";

/** Build a CTO Handoff Contract from current planning state */
export function buildHandoffContract(input: HandoffBuildInput): CtoHandoffContract {
  const missing: HandoffMissingItem[] = [];

  if (!input.clarificationComplete) {
    missing.push({
      key: "clarification",
      label: "Clarification incomplete",
      detail: "The clarification loop must be completed before CTO engineering can begin.",
      severity: "blocker",
    });
  }

  if (input.modules.length === 0) {
    missing.push({
      key: "modules",
      label: "No modules defined",
      detail: "System decomposition must produce at least one module definition.",
      severity: "blocker",
    });
  }

  if (input.modules.length > 1 && input.dependencyEdgeCount === 0 && !input.independenceAcknowledged) {
    missing.push({
      key: "dependencies",
      label: "Dependency graph missing",
      detail: "Define module dependencies or confirm modules are independent.",
      severity: "blocker",
    });
  }

  if (input.isMvpProject && !input.mvpReductionComplete) {
    missing.push({
      key: "mvp_reduction",
      label: "MVP reduction incomplete",
      detail: "MVP scope boundaries must be confirmed before engineering decomposition.",
      severity: "blocker",
    });
  }

  if (!input.approvedByFounder) {
    missing.push({
      key: "approval",
      label: "Blueprint not approved",
      detail: "Founder must approve the blueprint via the Approval entity before CTO work begins.",
      severity: "blocker",
    });
  }

  if (input.backlogCardCount === 0) {
    missing.push({
      key: "backlog",
      label: "No CTO backlog cards",
      detail: "At least one CTO backlog card is needed for engineering normalization.",
      severity: "blocker",
    });
  }

  if (input.taskDraftCount === 0 && input.backlogCardCount > 0) {
    missing.push({
      key: "task_drafts",
      label: "No AI task drafts",
      detail: "Backlog cards have not been decomposed into atomic task drafts yet.",
      severity: "warning",
    });
  }

  if (!input.deliveryMode) {
    missing.push({
      key: "delivery_mode",
      label: "Delivery mode not set",
      detail: "Select mvp_first, full_scope, or phased_rollout.",
      severity: "warning",
    });
  }

  const blockers = missing.filter((m) => m.severity === "blocker");

  return {
    blueprintId: input.blueprintId,
    clarificationComplete: input.clarificationComplete,
    modulesPresent: input.modules.length > 0,
    moduleCount: input.modules.length,
    dependencyGraphPresent: input.dependencyEdgeCount > 0 || input.independenceAcknowledged,
    deliveryMode: input.deliveryMode,
    mvpReductionComplete: input.mvpReductionComplete,
    approvedByFounder: input.approvedByFounder,
    backlogCardsPresent: input.backlogCardCount > 0,
    backlogCardCount: input.backlogCardCount,
    taskDraftsPresent: input.taskDraftCount > 0,
    missingItems: missing,
    readyForEngineering: blockers.length === 0,
  };
}
