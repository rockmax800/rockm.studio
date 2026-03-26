// TaskSpec Sanity Validator — pre-delivery quality gate for TaskSpec drafts.
// Intent Plane artifact — blocks vague/oversized tasks before delivery materialization.

import type { TaskSpecDraft } from "@/types/taskspec-draft";
import type { ExecutionPlanDraft } from "@/types/execution-plan";

// ── Thresholds ──

const MAX_COMPLEXITY = 8;

// ── Check types ──

export type SanityStatus = "valid" | "warning" | "blocked";

export interface SanityFinding {
  check: string;
  status: SanityStatus;
  message: string;
}

export interface DraftSanityResult {
  draftId: string;
  draftTitle: string;
  status: SanityStatus;
  findings: SanityFinding[];
}

export interface SanityReport {
  overallStatus: SanityStatus;
  results: DraftSanityResult[];
  validCount: number;
  warningCount: number;
  blockedCount: number;
}

/**
 * Run all sanity checks over a set of TaskSpec drafts.
 * Returns per-draft results plus an aggregate status.
 */
export function validateTaskSpecDrafts(
  drafts: TaskSpecDraft[],
  executionPlan?: ExecutionPlanDraft,
): SanityReport {
  const results: DraftSanityResult[] = drafts.map((d) => {
    const findings: SanityFinding[] = [
      checkSingleLayer(d),
      checkDefinitionOfDone(d),
      checkAllowedArea(d),
      checkForbiddenArea(d),
      checkCrossModuleBleed(d, drafts),
      checkComplexity(d),
    ];

    if (executionPlan) {
      findings.push(checkDependencyOrder(d, executionPlan));
    }

    const status = resolveStatus(findings);
    return { draftId: d.id, draftTitle: d.title, status, findings };
  });

  const blockedCount = results.filter((r) => r.status === "blocked").length;
  const warningCount = results.filter((r) => r.status === "warning").length;
  const validCount = results.filter((r) => r.status === "valid").length;

  const overallStatus: SanityStatus =
    blockedCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "valid";

  return { overallStatus, results, validCount, warningCount, blockedCount };
}

// ── Individual checks ──

function checkSingleLayer(d: TaskSpecDraft): SanityFinding {
  const validLayers = [
    "domain_model", "dto_or_contract", "application_service",
    "api_handler", "ui_component", "test", "migration", "integration_adapter",
  ];
  if (!validLayers.includes(d.engineeringLayer)) {
    return { check: "Single layer", status: "blocked", message: `Unknown engineering layer: "${d.engineeringLayer}"` };
  }
  return { check: "Single layer", status: "valid", message: `Maps to exactly one layer: ${d.engineeringLayer}` };
}

function checkDefinitionOfDone(d: TaskSpecDraft): SanityFinding {
  if (!d.definitionOfDone || d.definitionOfDone.length === 0) {
    return { check: "Definition of Done", status: "blocked", message: "Empty definition of done — task cannot be verified as complete." };
  }
  if (d.definitionOfDone.length < 2) {
    return { check: "Definition of Done", status: "warning", message: "Only 1 item — consider adding more specific completion criteria." };
  }
  return { check: "Definition of Done", status: "valid", message: `${d.definitionOfDone.length} criteria defined.` };
}

function checkAllowedArea(d: TaskSpecDraft): SanityFinding {
  if (!d.allowedRepoPaths || d.allowedRepoPaths.length === 0) {
    return { check: "Allowed area", status: "blocked", message: "No allowed repo paths defined — agent has no permitted workspace." };
  }
  // Warn if overly broad
  if (d.allowedRepoPaths.some((p) => p === "**" || p === "*")) {
    return { check: "Allowed area", status: "warning", message: "Allowed area is unrestricted (**) — consider scoping." };
  }
  return { check: "Allowed area", status: "valid", message: `${d.allowedRepoPaths.length} path pattern(s) defined.` };
}

function checkForbiddenArea(d: TaskSpecDraft): SanityFinding {
  if (!d.forbiddenRepoPaths || d.forbiddenRepoPaths.length === 0) {
    return { check: "Forbidden area", status: "warning", message: "No forbidden paths — agent is not explicitly constrained from any area." };
  }
  return { check: "Forbidden area", status: "valid", message: `${d.forbiddenRepoPaths.length} forbidden pattern(s) defined.` };
}

function checkCrossModuleBleed(d: TaskSpecDraft, allDrafts: TaskSpecDraft[]): SanityFinding {
  // Check if this draft's allowed paths overlap with another module's allowed paths
  const otherModuleDrafts = allDrafts.filter(
    (other) => other.moduleId !== d.moduleId && other.id !== d.id,
  );
  const overlaps: string[] = [];
  for (const other of otherModuleDrafts) {
    for (const myPath of d.allowedRepoPaths) {
      for (const otherPath of other.allowedRepoPaths) {
        // Simple prefix overlap check
        const myBase = myPath.replace(/\*+$/, "");
        const otherBase = otherPath.replace(/\*+$/, "");
        if (myBase && otherBase && (myBase.startsWith(otherBase) || otherBase.startsWith(myBase))) {
          if (!overlaps.includes(other.moduleId)) {
            overlaps.push(other.moduleId);
          }
        }
      }
    }
  }

  if (overlaps.length > 0) {
    return {
      check: "Cross-module bleed",
      status: "warning",
      message: `Allowed paths overlap with module(s): ${overlaps.join(", ")}. Review boundaries.`,
    };
  }
  return { check: "Cross-module bleed", status: "valid", message: "No cross-module path overlap detected." };
}

function checkComplexity(d: TaskSpecDraft): SanityFinding {
  if (d.complexityScore > MAX_COMPLEXITY) {
    return {
      check: "Complexity",
      status: "blocked",
      message: `Score ${d.complexityScore} exceeds max ${MAX_COMPLEXITY} — must be split further.`,
    };
  }
  if (d.complexityScore >= MAX_COMPLEXITY - 1) {
    return {
      check: "Complexity",
      status: "warning",
      message: `Score ${d.complexityScore} is near threshold (${MAX_COMPLEXITY}). Consider splitting.`,
    };
  }
  return { check: "Complexity", status: "valid", message: `Score ${d.complexityScore}/${MAX_COMPLEXITY}.` };
}

function checkDependencyOrder(d: TaskSpecDraft, plan: ExecutionPlanDraft): SanityFinding {
  // Verify the draft appears in at least one batch
  const inBatch = plan.batches.some((b) => b.taskDraftIds.includes(d.id));
  if (!inBatch) {
    return {
      check: "Dependency order",
      status: "blocked",
      message: "Not placed in any execution batch — dependency resolution failed.",
    };
  }
  // Check if it's in the cycle notes
  if (plan.notes.some((n) => n.includes("cycle") && n.includes(d.id))) {
    return {
      check: "Dependency order",
      status: "warning",
      message: "Part of a dependency cycle — review ordering.",
    };
  }
  return { check: "Dependency order", status: "valid", message: "Resolvable in execution plan." };
}

// ── Helpers ──

function resolveStatus(findings: SanityFinding[]): SanityStatus {
  if (findings.some((f) => f.status === "blocked")) return "blocked";
  if (findings.some((f) => f.status === "warning")) return "warning";
  return "valid";
}
