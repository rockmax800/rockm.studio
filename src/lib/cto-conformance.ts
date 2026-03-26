// AI CTO Post-Run Conformance Layer
// Evaluates completed work against originating TaskSpec drafts.
// Engineering guardrail — does NOT replace Review/QA.
// See docs/core/10-role-contracts-and-taskspec.md

import type { TaskSpecDraft } from "@/types/taskspec-draft";

export type ConformanceStatus = "pass" | "warning" | "violation";

export interface ConformanceCheck {
  checkId: string;
  label: string;
  status: ConformanceStatus;
  detail: string;
  telemetryAvailable: boolean;
}

export interface ConformanceResult {
  taskSpecDraftId: string;
  taskSpecTitle: string;
  moduleId: string;
  overallStatus: ConformanceStatus;
  checks: ConformanceCheck[];
  telemetryPartial: boolean;
}

export interface ConformanceSummary {
  results: ConformanceResult[];
  totalDrafts: number;
  passCount: number;
  warningCount: number;
  violationCount: number;
  telemetryPartial: boolean;
}

/**
 * Evaluate a single TaskSpecDraft against (simulated) post-run evidence.
 * On the current branch, real telemetry is unavailable — checks are
 * derived from the draft's own structural quality and known constraints.
 */
function evaluateDraft(draft: TaskSpecDraft, _artifactIds: string[]): ConformanceResult {
  const checks: ConformanceCheck[] = [];
  const noTelemetry = true; // current branch — no live run data

  // 1. Definition of Done met
  const dodPopulated = draft.definitionOfDone.length > 0 && draft.definitionOfDone.every((d) => d.trim().length > 0);
  checks.push({
    checkId: "dod_met",
    label: "Definition of Done met",
    status: noTelemetry ? (dodPopulated ? "warning" : "violation") : "pass",
    detail: noTelemetry
      ? dodPopulated
        ? `${draft.definitionOfDone.length} criteria defined — run evidence unavailable`
        : "Definition of Done is empty — cannot verify completion"
      : `${draft.definitionOfDone.length} criteria verified`,
    telemetryAvailable: !noTelemetry,
  });

  // 2. Touched area within boundary
  const hasAllowed = draft.allowedRepoPaths.length > 0;
  checks.push({
    checkId: "boundary_allowed",
    label: "Work stayed within allowed area",
    status: noTelemetry ? (hasAllowed ? "warning" : "violation") : "pass",
    detail: noTelemetry
      ? hasAllowed
        ? `${draft.allowedRepoPaths.length} allowed paths defined — file diff unavailable`
        : "No allowed area defined — boundary check impossible"
      : "All changed files within allowed paths",
    telemetryAvailable: !noTelemetry,
  });

  // 3. Forbidden areas untouched
  const hasForbidden = draft.forbiddenRepoPaths.length > 0;
  checks.push({
    checkId: "boundary_forbidden",
    label: "Forbidden areas untouched",
    status: noTelemetry ? (hasForbidden ? "warning" : "violation") : "pass",
    detail: noTelemetry
      ? hasForbidden
        ? `${draft.forbiddenRepoPaths.length} forbidden paths defined — file diff unavailable`
        : "No forbidden area defined — isolation not enforceable"
      : "No forbidden paths were touched",
    telemetryAvailable: !noTelemetry,
  });

  // 4. Required artifacts present
  const hasArtifacts = draft.requiredArtifacts.length > 0;
  checks.push({
    checkId: "artifacts_present",
    label: "Required artifacts present",
    status: noTelemetry ? (hasArtifacts ? "warning" : "violation") : "pass",
    detail: noTelemetry
      ? hasArtifacts
        ? `${draft.requiredArtifacts.length} artifact types required — artifact registry unavailable`
        : "No required artifacts specified"
      : "All required artifacts found",
    telemetryAvailable: !noTelemetry,
  });

  // 5. Shortcut pattern detection (production mode)
  const complexityOk = draft.complexityScore <= 8;
  const riskOk = draft.riskClass !== "high";
  checks.push({
    checkId: "no_shortcut",
    label: "No obvious shortcut pattern",
    status: !complexityOk || !riskOk ? "warning" : "pass",
    detail: !complexityOk
      ? `Complexity ${draft.complexityScore} exceeds threshold 8 — may indicate oversized scope`
      : !riskOk
        ? "High risk class — requires extra scrutiny for shortcuts"
        : "Complexity and risk within normal bounds",
    telemetryAvailable: false, // always structural check
  });

  const statuses = checks.map((c) => c.status);
  const overallStatus: ConformanceStatus = statuses.includes("violation")
    ? "violation"
    : statuses.includes("warning")
      ? "warning"
      : "pass";

  return {
    taskSpecDraftId: draft.id,
    taskSpecTitle: draft.title,
    moduleId: draft.moduleId,
    overallStatus,
    checks,
    telemetryPartial: noTelemetry,
  };
}

/**
 * Run conformance evaluation across all TaskSpec drafts.
 */
export function evaluateConformance(
  drafts: TaskSpecDraft[],
  artifactIds: string[] = [],
): ConformanceSummary {
  const results = drafts.map((d) => evaluateDraft(d, artifactIds));

  return {
    results,
    totalDrafts: results.length,
    passCount: results.filter((r) => r.overallStatus === "pass").length,
    warningCount: results.filter((r) => r.overallStatus === "warning").length,
    violationCount: results.filter((r) => r.overallStatus === "violation").length,
    telemetryPartial: results.some((r) => r.telemetryPartial),
  };
}
