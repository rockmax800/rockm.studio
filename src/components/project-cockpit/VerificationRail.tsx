import { useMemo } from "react";
import type { VerificationSection, VerificationStatus, ProjectVerificationState } from "@/types/verification";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, AlertTriangle, XCircle, HelpCircle,
  Code2, TestTube2, ShieldCheck, Rocket,
} from "lucide-react";

/* ── Status helpers ── */

const STATUS_ICON: Record<VerificationStatus, React.ElementType> = {
  pass: CheckCircle2,
  warning: AlertTriangle,
  missing: HelpCircle,
  blocked: XCircle,
};

const STATUS_STYLES: Record<VerificationStatus, string> = {
  pass: "text-status-green bg-status-green/10 border-status-green/20",
  warning: "text-status-amber bg-status-amber/10 border-status-amber/20",
  missing: "text-muted-foreground bg-muted/30 border-border/30",
  blocked: "text-destructive bg-destructive/10 border-destructive/20",
};

const STATUS_DOT: Record<VerificationStatus, string> = {
  pass: "bg-status-green",
  warning: "bg-status-amber",
  missing: "bg-muted-foreground/30",
  blocked: "bg-destructive",
};

const SECTION_ICONS: Record<string, React.ElementType> = {
  implementation: Code2,
  qa: TestTube2,
  security: ShieldCheck,
  release: Rocket,
};

/* ── Props ── */

interface VerificationRailProps {
  tasks: any[];
  artifacts: any[];
  approvals: any[];
  deployments: any[];
  checkSuites: any[];
  failedRuns: any[];
  domainBindings: any[];
  reviews?: any[];
}

/* ── Derive verification state ── */

function deriveVerification(props: VerificationRailProps): ProjectVerificationState {
  const { tasks, artifacts, approvals, deployments, checkSuites, failedRuns, domainBindings } = props;

  const sections: VerificationSection[] = [];

  /* 1 — Implementation Verification */
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t: any) => t.state === "done").length;
  const blockedTasks = tasks.filter((t: any) => t.state === "blocked").length;
  const implArtifacts = artifacts.filter((a: any) =>
    ["implementation_patch", "code_output", "pull_request_ref"].includes(a.artifact_type)
  );

  const implStatus: VerificationStatus =
    totalTasks === 0 ? "missing"
      : blockedTasks > 0 || failedRuns.length >= 3 ? "blocked"
      : doneTasks < totalTasks ? "warning"
      : "pass";

  sections.push({
    id: "implementation",
    title: "Implementation",
    status: implStatus,
    checks: [
      {
        label: "Task completion",
        status: totalTasks === 0 ? "missing" : doneTasks === totalTasks ? "pass" : "warning",
        detail: totalTasks === 0 ? "No tasks created yet" : `${doneTasks}/${totalTasks} tasks done`,
        evidenceCount: doneTasks,
      },
      {
        label: "Failed runs",
        status: failedRuns.length === 0 ? "pass" : failedRuns.length >= 3 ? "blocked" : "warning",
        detail: failedRuns.length === 0 ? "No failures" : `${failedRuns.length} failed run(s) detected`,
        evidenceCount: failedRuns.length,
      },
      {
        label: "Implementation artifacts",
        status: implArtifacts.length > 0 ? "pass" : "missing",
        detail: implArtifacts.length > 0
          ? `${implArtifacts.length} artifact(s) produced`
          : "No implementation artifacts on this branch yet",
        evidenceCount: implArtifacts.length,
      },
    ],
  });

  /* 2 — QA Verification */
  const testArtifacts = artifacts.filter((a: any) =>
    ["test_result", "qa_evidence"].includes(a.artifact_type)
  );
  const reviewArtifacts = artifacts.filter((a: any) => a.artifact_type === "review_report");

  const qaStatus: VerificationStatus =
    testArtifacts.length === 0 && reviewArtifacts.length === 0 ? "missing"
      : testArtifacts.length === 0 ? "warning"
      : "pass";

  sections.push({
    id: "qa",
    title: "QA",
    status: qaStatus,
    checks: [
      {
        label: "Test results",
        status: testArtifacts.length > 0 ? "pass" : "missing",
        detail: testArtifacts.length > 0
          ? `${testArtifacts.length} test result(s) recorded`
          : "No test results on this branch yet",
        evidenceCount: testArtifacts.length,
      },
      {
        label: "Review reports",
        status: reviewArtifacts.length > 0 ? "pass" : "missing",
        detail: reviewArtifacts.length > 0
          ? `${reviewArtifacts.length} review report(s)`
          : "No review reports produced yet",
        evidenceCount: reviewArtifacts.length,
      },
    ],
  });

  /* 3 — Security Verification */
  const securityArtifacts = artifacts.filter((a: any) =>
    a.artifact_type === "security_scan" || a.artifact_category === "security"
  );
  const pendingSecurity = approvals.filter(
    (a: any) => a.state === "pending" && a.approval_type?.includes("security")
  );

  const secStatus: VerificationStatus =
    securityArtifacts.length === 0 ? "missing"
      : pendingSecurity.length > 0 ? "warning"
      : "pass";

  sections.push({
    id: "security",
    title: "Security",
    status: secStatus,
    checks: [
      {
        label: "Security scans",
        status: securityArtifacts.length > 0 ? "pass" : "missing",
        detail: securityArtifacts.length > 0
          ? `${securityArtifacts.length} scan(s) recorded`
          : "No security scans on this branch yet",
        evidenceCount: securityArtifacts.length,
      },
      {
        label: "Security approvals",
        status: pendingSecurity.length > 0 ? "warning" : securityArtifacts.length > 0 ? "pass" : "missing",
        detail: pendingSecurity.length > 0
          ? `${pendingSecurity.length} pending security approval(s)`
          : securityArtifacts.length > 0 ? "No pending issues" : "Not yet available",
      },
    ],
  });

  /* 4 — Release Readiness */
  const ciPassed = checkSuites.some((c: any) => c.status === "passed");
  const ciFailed = checkSuites.some((c: any) => c.status === "failed");
  const hasStagingLive = deployments.some((d: any) => d.environment === "staging" && d.status === "live");
  const pendingApprovals = approvals.filter((a: any) => a.state === "pending");

  const releaseStatus: VerificationStatus =
    ciFailed || pendingApprovals.length > 0 ? "blocked"
      : !ciPassed && checkSuites.length === 0 ? "missing"
      : ciPassed && hasStagingLive && domainBindings.length > 0 ? "pass"
      : "warning";

  sections.push({
    id: "release",
    title: "Release Readiness",
    status: releaseStatus,
    checks: [
      {
        label: "CI status",
        status: ciFailed ? "blocked" : ciPassed ? "pass" : checkSuites.length > 0 ? "warning" : "missing",
        detail: ciFailed ? "CI failed" : ciPassed ? "CI passed" : checkSuites.length > 0 ? "CI running" : "No CI runs on this branch yet",
      },
      {
        label: "Staging deployment",
        status: hasStagingLive ? "pass" : deployments.length > 0 ? "warning" : "missing",
        detail: hasStagingLive ? "Staging live" : deployments.length > 0 ? "Staging not live yet" : "No deployments yet",
      },
      {
        label: "Pending approvals",
        status: pendingApprovals.length === 0 ? "pass" : "blocked",
        detail: pendingApprovals.length === 0 ? "All approvals resolved" : `${pendingApprovals.length} approval(s) pending`,
        evidenceCount: pendingApprovals.length,
      },
      {
        label: "Domain binding",
        status: domainBindings.length > 0 ? "pass" : "missing",
        detail: domainBindings.length > 0
          ? `${domainBindings.length} domain(s) bound`
          : "No domain configured yet",
      },
    ],
  });

  const passCount = sections.filter((s) => s.status === "pass").length;
  const issueCount = sections.filter((s) => s.status !== "pass").length;
  const overallStatus: VerificationStatus =
    sections.some((s) => s.status === "blocked") ? "blocked"
      : sections.some((s) => s.status === "missing") ? "missing"
      : sections.some((s) => s.status === "warning") ? "warning"
      : "pass";

  return { projectId: "", sections, overallStatus, passCount, issueCount };
}

/* ── Component ── */

export function VerificationRail(props: VerificationRailProps) {
  const state = useMemo(() => deriveVerification(props), [props]);

  const OverallIcon = STATUS_ICON[state.overallStatus];

  return (
    <div className="space-y-4">
      {/* Overall summary strip */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border",
        STATUS_STYLES[state.overallStatus],
      )}>
        <OverallIcon className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-bold">
            {state.overallStatus === "pass" && "All verification checks passed"}
            {state.overallStatus === "warning" && "Verification incomplete — some checks need attention"}
            {state.overallStatus === "missing" && "Verification data not yet available on this branch"}
            {state.overallStatus === "blocked" && "Verification blocked — resolve issues before release"}
          </span>
        </div>
        <span className="text-[11px] font-mono font-bold shrink-0">
          {state.passCount}/{state.sections.length} pass
        </span>
      </div>

      {/* Section cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {state.sections.map((section) => {
          const SectionIcon = SECTION_ICONS[section.id] ?? CheckCircle2;
          const StIcon = STATUS_ICON[section.status];
          return (
            <div
              key={section.id}
              className="rounded-xl border border-border/40 bg-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SectionIcon className="h-4 w-4 text-muted-foreground/50" />
                  <span className="text-[13px] font-bold text-foreground">{section.title}</span>
                </div>
                <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center", STATUS_STYLES[section.status])}>
                  <StIcon className="h-3.5 w-3.5" />
                </div>
              </div>

              <div className="space-y-2">
                {section.checks.map((check, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", STATUS_DOT[check.status])} />
                    <div className="min-w-0">
                      <span className="text-[12px] font-semibold text-foreground block leading-tight">{check.label}</span>
                      <span className="text-[11px] text-muted-foreground block">{check.detail}</span>
                    </div>
                    {check.evidenceCount !== undefined && check.evidenceCount > 0 && (
                      <span className="text-[10px] font-mono font-bold text-muted-foreground/50 ml-auto shrink-0">
                        {check.evidenceCount}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Export derive function for reuse in summary components */
export { deriveVerification };
export type { VerificationRailProps };
