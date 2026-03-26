/**
 * TaskSpec Sanity Panel — CTO Sanity Check gate.
 * Founder-visible pre-delivery quality validation of TaskSpec drafts.
 *
 * Intent Plane artifact — must pass before live task creation.
 */

import { useState } from "react";
import {
  ShieldCheck, ShieldAlert, ShieldX, ChevronDown, ChevronRight,
  Shield, CheckCircle2, AlertTriangle, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SanityReport, DraftSanityResult, SanityStatus, SanityFinding } from "@/lib/taskspec-sanity";

interface TaskSpecSanityPanelProps {
  report: SanityReport;
}

const STATUS_CONFIG: Record<SanityStatus, {
  label: string;
  icon: React.ElementType;
  badge: string;
  headerBg: string;
}> = {
  valid: {
    label: "All checks passed",
    icon: ShieldCheck,
    badge: "bg-status-green/10 text-status-green border-status-green/20",
    headerBg: "bg-status-green/[0.04]",
  },
  warning: {
    label: "Warnings detected",
    icon: ShieldAlert,
    badge: "bg-status-amber/10 text-status-amber border-status-amber/20",
    headerBg: "bg-status-amber/[0.04]",
  },
  blocked: {
    label: "Blocked — issues must be resolved",
    icon: ShieldX,
    badge: "bg-destructive/10 text-destructive border-destructive/20",
    headerBg: "bg-destructive/[0.04]",
  },
};

const FINDING_ICONS: Record<SanityStatus, React.ElementType> = {
  valid: CheckCircle2,
  warning: AlertTriangle,
  blocked: XCircle,
};

const FINDING_STYLES: Record<SanityStatus, string> = {
  valid: "text-status-green",
  warning: "text-status-amber",
  blocked: "text-destructive",
};

export function TaskSpecSanityPanel({ report }: TaskSpecSanityPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const config = STATUS_CONFIG[report.overallStatus];
  const OverallIcon = config.icon;

  // Show blocked/warning first
  const sorted = [...report.results].sort((a, b) => {
    const order: Record<SanityStatus, number> = { blocked: 0, warning: 1, valid: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="space-y-3">
      {/* Overall status */}
      <div className={cn("rounded-xl border p-3", config.badge)}>
        <div className="flex items-center gap-2">
          <OverallIcon className="h-4 w-4" />
          <span className="text-[12px] font-bold">{config.label}</span>
          <div className="ml-auto flex items-center gap-3 text-[10px] font-mono">
            <span className="text-status-green">{report.validCount} valid</span>
            {report.warningCount > 0 && (
              <span className="text-status-amber">{report.warningCount} warn</span>
            )}
            {report.blockedCount > 0 && (
              <span className="text-destructive">{report.blockedCount} blocked</span>
            )}
          </div>
        </div>
      </div>

      {/* Per-draft results */}
      {sorted.map((result) => (
        <DraftResult
          key={result.draftId}
          result={result}
          isExpanded={expandedId === result.draftId}
          onToggle={() => setExpandedId(expandedId === result.draftId ? null : result.draftId)}
        />
      ))}

      {/* Footer */}
      <div className="flex items-center gap-1.5 px-1 pt-1">
        <Shield className="h-3 w-3 text-muted-foreground/30" />
        <span className="text-[8px] text-muted-foreground/40">
          CTO Sanity Check · pre-delivery gate · must pass before live task materialization
        </span>
      </div>
    </div>
  );
}

/* ── Draft Result Row ── */

function DraftResult({
  result,
  isExpanded,
  onToggle,
}: {
  result: DraftSanityResult;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const StatusIcon = STATUS_CONFIG[result.status].icon;
  const nonValidFindings = result.findings.filter((f) => f.status !== "valid");
  const hasIssues = nonValidFindings.length > 0;

  return (
    <div className={cn(
      "rounded-xl border transition-colors",
      result.status === "blocked" && "border-destructive/20 bg-destructive/[0.02]",
      result.status === "warning" && "border-status-amber/20 bg-status-amber/[0.02]",
      result.status === "valid" && "border-border/40 bg-card",
    )}>
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-2.5 text-left">
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground/50 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
        )}
        <StatusIcon className={cn("h-3.5 w-3.5 shrink-0", FINDING_STYLES[result.status])} />
        <span className="text-[11px] font-semibold text-foreground truncate flex-1">
          {result.draftTitle}
        </span>
        {!hasIssues && (
          <span className="text-[9px] font-mono text-status-green/60">
            {result.findings.length}/{result.findings.length} pass
          </span>
        )}
        {hasIssues && (
          <span className={cn(
            "text-[9px] font-bold px-1.5 py-0.5 rounded",
            result.status === "blocked" ? "bg-destructive/10 text-destructive" : "bg-status-amber/10 text-status-amber",
          )}>
            {nonValidFindings.length} issue{nonValidFindings.length !== 1 ? "s" : ""}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-1 border-t border-border/20 pt-2">
          {result.findings.map((f, i) => (
            <FindingRow key={i} finding={f} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Finding Row ── */

function FindingRow({ finding }: { finding: SanityFinding }) {
  const Icon = FINDING_ICONS[finding.status];
  return (
    <div className="flex items-start gap-2 py-0.5">
      <Icon className={cn("h-3 w-3 mt-0.5 shrink-0", FINDING_STYLES[finding.status])} />
      <div className="min-w-0">
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          {finding.check}
        </span>
        <p className={cn(
          "text-[10px] mt-0.5 leading-relaxed",
          finding.status === "valid" ? "text-muted-foreground/60" : "text-foreground/80",
        )}>
          {finding.message}
        </p>
      </div>
    </div>
  );
}
