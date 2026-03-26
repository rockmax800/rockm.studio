// CTO Overview — founder-readable engineering health summary.
// Aggregates readiness gate, slices, drafts, execution plan, sanity, and conformance.

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Cpu, Layers, FileText, Activity, ShieldCheck, AlertTriangle,
  CheckCircle2, XCircle, ChevronRight, Info,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { SanityReport } from "@/lib/taskspec-sanity";
import type { ConformanceSummary } from "@/lib/cto-conformance";
import type { ExecutionPlanDraft } from "@/types/execution-plan";

interface Props {
  readinessStatus: "ready" | "blocked";
  readinessPassedCount: number;
  readinessTotalCount: number;
  slicesCount: number;
  draftsCount: number;
  executionPlan: ExecutionPlanDraft;
  sanityReport: SanityReport;
  conformanceSummary: ConformanceSummary;
  projectId: string;
}

type CellStatus = "good" | "warn" | "bad" | "neutral";

function StatusDot({ status }: { status: CellStatus }) {
  return (
    <span className={cn("h-2 w-2 rounded-full shrink-0", {
      "bg-status-green": status === "good",
      "bg-status-amber": status === "warn",
      "bg-destructive": status === "bad",
      "bg-muted-foreground/30": status === "neutral",
    })} />
  );
}

function MetricCell({ icon: Icon, label, value, status, scrollTo }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  status: CellStatus;
  scrollTo?: string;
}) {
  const content = (
    <div className={cn(
      "flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-colors group",
      status === "bad" ? "border-destructive/20 bg-destructive/5" :
      status === "warn" ? "border-status-amber/20 bg-status-amber/5" :
      "border-border/40 bg-secondary/30",
      scrollTo && "cursor-pointer hover:bg-secondary/60",
    )}>
      <Icon className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-[11px] text-muted-foreground block leading-tight">{label}</span>
        <span className="text-[14px] font-bold font-mono tabular-nums text-foreground">{value}</span>
      </div>
      <StatusDot status={status} />
      {scrollTo && <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />}
    </div>
  );

  if (scrollTo) {
    return (
      <button
        onClick={() => {
          const el = document.getElementById(scrollTo);
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        className="text-left w-full"
      >
        {content}
      </button>
    );
  }

  return content;
}

export function CtoOverview({
  readinessStatus, readinessPassedCount, readinessTotalCount,
  slicesCount, draftsCount, executionPlan,
  sanityReport, conformanceSummary, projectId,
}: Props) {
  const batchCount = executionPlan.batches.length;
  const criticalPathLen = executionPlan.criticalPath.length;

  const sanityStatus: CellStatus =
    sanityReport.overallStatus === "blocked" ? "bad" :
    sanityReport.overallStatus === "warning" ? "warn" : "good";

  const conformanceStatus: CellStatus =
    conformanceSummary.violationCount > 0 ? "bad" :
    conformanceSummary.warningCount > 0 ? "warn" : "good";

  const gateStatus: CellStatus = readinessStatus === "ready" ? "good" : "bad";

  const hasData = slicesCount > 0 || draftsCount > 0;

  return (
    <div className="space-y-3">
      {/* Summary strip */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] px-2 py-0.5 h-5 font-mono gap-1.5",
            gateStatus === "good" ? "border-status-green/40 text-status-green" : "border-destructive/40 text-destructive",
          )}
        >
          <StatusDot status={gateStatus} />
          Gate {readinessStatus}
        </Badge>
        {hasData && (
          <>
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 border-border font-mono">
              {draftsCount} specs
            </Badge>
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 border-border font-mono">
              {batchCount} batches
            </Badge>
            <Badge
              variant="outline"
              className={cn("text-[10px] px-2 py-0.5 h-5 font-mono gap-1", {
                "border-status-green/40 text-status-green": sanityStatus === "good",
                "border-status-amber/40 text-status-amber": sanityStatus === "warn",
                "border-destructive/40 text-destructive": sanityStatus === "bad",
              })}
            >
              sanity: {sanityReport.overallStatus}
            </Badge>
          </>
        )}
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        <MetricCell
          icon={Cpu}
          label="Readiness Gate"
          value={`${readinessPassedCount}/${readinessTotalCount}`}
          status={gateStatus}
          scrollTo="cto-readiness-gate"
        />
        <MetricCell
          icon={Layers}
          label="Engineering Slices"
          value={slicesCount}
          status={slicesCount > 0 ? "good" : "neutral"}
          scrollTo={slicesCount > 0 ? "cto-engineering-slices" : undefined}
        />
        <MetricCell
          icon={FileText}
          label="TaskSpec Drafts"
          value={draftsCount}
          status={draftsCount > 0 ? "good" : "neutral"}
          scrollTo={draftsCount > 0 ? "cto-taskspec-drafts" : undefined}
        />
        <MetricCell
          icon={Activity}
          label="Execution Batches"
          value={batchCount > 0 ? `${batchCount} (CP: ${criticalPathLen})` : "—"}
          status={batchCount > 0 ? "good" : "neutral"}
          scrollTo={batchCount > 0 ? "cto-execution-plan" : undefined}
        />
        <MetricCell
          icon={ShieldCheck}
          label="Sanity Check"
          value={sanityReport.overallStatus}
          status={sanityStatus}
          scrollTo={draftsCount > 0 ? "cto-sanity-check" : undefined}
        />
        <MetricCell
          icon={ShieldCheck}
          label="Conformance"
          value={conformanceSummary.violationCount > 0
            ? `${conformanceSummary.violationCount} violation${conformanceSummary.violationCount > 1 ? "s" : ""}`
            : conformanceSummary.warningCount > 0
              ? `${conformanceSummary.warningCount} warning${conformanceSummary.warningCount > 1 ? "s" : ""}`
              : "clear"}
          status={conformanceStatus}
          scrollTo={draftsCount > 0 ? "cto-conformance" : undefined}
        />
      </div>

      {/* Alerts */}
      {conformanceSummary.violationCount > 0 && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-destructive/5 border border-destructive/20">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
          <span className="text-[11px] text-destructive">
            {conformanceSummary.violationCount} conformance violation{conformanceSummary.violationCount > 1 ? "s" : ""} — 
            review before materialization.
          </span>
        </div>
      )}
      {sanityReport.overallStatus === "blocked" && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-destructive/5 border border-destructive/20">
          <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
          <span className="text-[11px] text-destructive">
            Sanity check blocked — {sanityReport.results.filter((r) => r.status === "blocked").length} draft{sanityReport.results.filter((r) => r.status === "blocked").length > 1 ? "s" : ""} cannot proceed to delivery.
          </span>
        </div>
      )}

      {/* Honesty note */}
      <div className="flex items-start gap-1.5">
        <Info className="h-3 w-3 text-muted-foreground/30 mt-0.5 shrink-0" />
        <span className="text-[10px] text-muted-foreground/40 leading-snug">
          AI CTO engineering overview — planning artifacts only. Click any metric to scroll to its detail panel.
        </span>
      </div>
    </div>
  );
}
