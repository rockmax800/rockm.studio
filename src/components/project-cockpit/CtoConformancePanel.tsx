// AI CTO Post-Run Conformance Panel
// Engineering guardrail — does NOT replace Review/QA.
// Honest about telemetry gaps on current branch.

import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, AlertTriangle, XCircle, Info, ShieldAlert, ChevronDown, ChevronRight,
} from "lucide-react";
import { useState } from "react";
import type { ConformanceSummary, ConformanceResult, ConformanceCheck, ConformanceStatus } from "@/lib/cto-conformance";

interface Props {
  summary: ConformanceSummary;
}

const STATUS_CONFIG: Record<ConformanceStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  pass: { icon: CheckCircle2, color: "text-status-green", label: "Pass" },
  warning: { icon: AlertTriangle, color: "text-status-amber", label: "Warning" },
  violation: { icon: XCircle, color: "text-destructive", label: "Violation" },
};

function CheckRow({ check }: { check: ConformanceCheck }) {
  const cfg = STATUS_CONFIG[check.status];
  const Icon = cfg.icon;
  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", cfg.color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-foreground">{check.label}</span>
          {!check.telemetryAvailable && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-border text-muted-foreground">
              no telemetry
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug">{check.detail}</p>
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: ConformanceResult }) {
  const [expanded, setExpanded] = useState(result.overallStatus === "violation");
  const cfg = STATUS_CONFIG[result.overallStatus];
  const Icon = cfg.icon;

  return (
    <div className={cn(
      "rounded-xl border px-3 py-2.5",
      result.overallStatus === "violation" ? "border-destructive/30 bg-destructive/5" :
      result.overallStatus === "warning" ? "border-status-amber/30 bg-status-amber/5" :
      "border-border/40 bg-secondary/30",
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Icon className={cn("h-3.5 w-3.5 shrink-0", cfg.color)} />
        <span className="text-[12px] font-bold text-foreground flex-1 truncate">{result.taskSpecTitle}</span>
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-border text-muted-foreground font-mono">
          {result.moduleId}
        </Badge>
        {expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="mt-2 pl-5 space-y-0.5 border-t border-border/20 pt-2">
          {result.checks.map((c) => <CheckRow key={c.checkId} check={c} />)}
        </div>
      )}
    </div>
  );
}

export function CtoConformancePanel({ summary }: Props) {
  if (summary.totalDrafts === 0) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground py-3">
        <Info className="h-3.5 w-3.5" />
        No TaskSpec drafts available for conformance evaluation.
      </div>
    );
  }

  // Group by module
  const byModule: Record<string, ConformanceResult[]> = {};
  for (const r of summary.results) {
    (byModule[r.moduleId] ??= []).push(r);
  }
  const modules = Object.entries(byModule).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-4">
      {/* Telemetry honesty banner */}
      {summary.telemetryPartial && (
        <Alert className="bg-status-amber/5 border-status-amber/30">
          <ShieldAlert className="h-4 w-4 text-status-amber" />
          <AlertDescription className="text-[11px] text-muted-foreground">
            Conformance telemetry partial on this branch — checks derived from draft structure only. 
            Live run evidence (file diffs, artifact registry) unavailable until delivery pipeline is connected.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary strip */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 border-border font-mono gap-1">
          <CheckCircle2 className="h-3 w-3 text-status-green" /> {summary.passCount} pass
        </Badge>
        <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 border-border font-mono gap-1">
          <AlertTriangle className="h-3 w-3 text-status-amber" /> {summary.warningCount} warning
        </Badge>
        <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 border-border font-mono gap-1">
          <XCircle className="h-3 w-3 text-destructive" /> {summary.violationCount} violation
        </Badge>
        <span className="text-[10px] text-muted-foreground/50 ml-auto">
          Engineering guardrail — does not replace Review/QA
        </span>
      </div>

      {/* Per-module groups */}
      {modules.map(([moduleId, results]) => (
        <div key={moduleId}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold text-foreground/70 uppercase tracking-wider">{moduleId}</span>
            <span className="text-[10px] text-muted-foreground font-mono">{results.length} drafts</span>
          </div>
          <div className="space-y-1.5">
            {results.map((r) => <ResultCard key={r.taskSpecDraftId} result={r} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
