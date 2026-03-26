/* ═══════════════════════════════════════════════════════════
   Verification Rail — typed model for project verification
   status across implementation, QA, security, and release.

   These types drive the VerificationRail component and
   related summaries. Data is derived from existing entities
   (tasks, runs, artifacts, reviews, approvals, deployments,
   check_suites) — no new backend required.

   See docs/integrations/02-agent-harness-patterns-adoption.md
   ═══════════════════════════════════════════════════════════ */

/** Verification status for a single rail section */
export type VerificationStatus = "pass" | "warning" | "missing" | "blocked";

/** A single verification check within a section */
export interface VerificationCheck {
  label: string;
  status: VerificationStatus;
  detail: string;
  evidenceCount?: number;
}

/** A verification rail section (e.g. Implementation, QA, Security, Release) */
export interface VerificationSection {
  id: string;
  title: string;
  status: VerificationStatus;
  checks: VerificationCheck[];
}

/** Aggregate verification state for a project */
export interface ProjectVerificationState {
  projectId: string;
  sections: VerificationSection[];
  overallStatus: VerificationStatus;
  /** How many sections have full pass */
  passCount: number;
  /** How many sections have issues */
  issueCount: number;
}
