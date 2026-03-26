import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Scissors, ChevronDown, ChevronUp, Shield, CheckCircle2,
  AlertTriangle, Package, Cloud, XOctagon, ArrowRight,
} from "lucide-react";
import type { SystemModule } from "@/types/front-office-planning";
import type { MvpReductionEntry, MvpDecision, MvpReductionResult } from "@/lib/mvp-reduction";
import { MVP_DECISION_LABELS, computeReductionResult } from "@/lib/mvp-reduction";

interface MvpReductionPanelProps {
  modules: SystemModule[];
  entries: MvpReductionEntry[];
  onEntriesChange: (entries: MvpReductionEntry[]) => void;
  locked: boolean;
  onConfirm: () => void;
  isMandatory: boolean; // true when project_type = mvp
}

const DECISION_CONFIG: Record<MvpDecision, { icon: typeof Package; color: string; bg: string }> = {
  keep: { icon: CheckCircle2, color: "hsl(152 60% 42%)", bg: "hsl(152 60% 42% / 0.08)" },
  defer: { icon: Package, color: "hsl(38 92% 50%)", bg: "hsl(38 92% 50% / 0.08)" },
  replace_saas: { icon: Cloud, color: "hsl(210 40% 52%)", bg: "hsl(210 40% 52% / 0.08)" },
  remove_risk: { icon: XOctagon, color: "hsl(0 72% 51%)", bg: "hsl(0 72% 51% / 0.08)" },
};

export function MvpReductionPanel({
  modules,
  entries,
  onEntriesChange,
  locked,
  onConfirm,
  isMandatory,
}: MvpReductionPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const result = computeReductionResult(entries);

  const handleDecisionChange = (moduleName: string, decision: MvpDecision) => {
    if (locked) return;
    onEntriesChange(
      entries.map((e) => (e.moduleName === moduleName ? { ...e, decision } : e))
    );
  };

  const handleNoteChange = (moduleName: string, note: string) => {
    if (locked) return;
    onEntriesChange(
      entries.map((e) => (e.moduleName === moduleName ? { ...e, founderNote: note } : e))
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] animate-slide-up">
      {/* Header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Scissors className="h-4 w-4 text-primary" />
          <span className="text-[12px] font-bold tracking-tight text-foreground">
            MVP Reduction Pass
          </span>
          {isMandatory && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-status-amber/10 text-status-amber">
              MANDATORY
            </span>
          )}
          {locked && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
              CONFIRMED
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Scope summary strip */}
          <ScopeSummary result={result} totalModules={modules.length} />

          {/* Module reduction cards */}
          <div className="space-y-2">
            {entries.map((entry) => {
              const mod = modules.find((m) => m.name === entry.moduleName);
              return (
                <ReductionCard
                  key={entry.moduleName}
                  entry={entry}
                  module={mod}
                  locked={locked}
                  onDecisionChange={(d) => handleDecisionChange(entry.moduleName, d)}
                  onNoteChange={(n) => handleNoteChange(entry.moduleName, n)}
                />
              );
            })}
          </div>

          {/* Confirm */}
          {!locked && (
            <div className="space-y-2">
              <button
                onClick={onConfirm}
                className="w-full h-9 rounded-xl text-[12px] font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all"
              >
                Confirm MVP Scope
              </button>
              <p className="text-[10px] text-muted-foreground/60 italic text-center">
                Estimates will use the post-reduction scope. Decisions are shown explicitly.
              </p>
            </div>
          )}

          {/* Artifact label */}
          <div className="flex items-center gap-1.5 px-1">
            <Shield className="h-3 w-3 text-muted-foreground/40" />
            <span className="text-[9px] text-muted-foreground/50">
              Intent Plane artifact · draft/planning state · founder decisions are auditable
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Scope Summary ── */

function ScopeSummary({ result, totalModules }: { result: MvpReductionResult; totalModules: number }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        <Scissors className="h-3 w-3" />
        Reduction Summary
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SummaryCell label="Full scope" value={`${totalModules} modules`} />
        <SummaryCell label="MVP scope" value={`${result.keptModules.length} modules`} highlight />
        <SummaryCell label="Deferred" value={`${result.deferredModules.length}`} />
        <SummaryCell label="SaaS replaced" value={`${result.replacedModules.length}`} />
      </div>
      {result.removedModules.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-destructive">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>{result.removedModules.length} module{result.removedModules.length > 1 ? "s" : ""} removed for risk</span>
        </div>
      )}
    </div>
  );
}

function SummaryCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg px-2.5 py-1.5 bg-muted">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block">{label}</span>
      <span className={cn("text-[13px] font-bold font-mono", highlight ? "text-primary" : "text-foreground")}>{value}</span>
    </div>
  );
}

/* ── Reduction Card ── */

function ReductionCard({
  entry,
  module: mod,
  locked,
  onDecisionChange,
  onNoteChange,
}: {
  entry: MvpReductionEntry;
  module?: SystemModule;
  locked: boolean;
  onDecisionChange: (d: MvpDecision) => void;
  onNoteChange: (n: string) => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const cfg = DECISION_CONFIG[entry.decision];
  const DecisionIcon = cfg.icon;

  return (
    <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
      {/* Top row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => setShowDetail((p) => !p)} className="shrink-0">
            {showDetail ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
          </button>
          <span className="text-[11px] font-bold text-foreground truncate">{entry.moduleName}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <DecisionIcon className="h-3 w-3" style={{ color: cfg.color }} />
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {MVP_DECISION_LABELS[entry.decision]}
          </span>
        </div>
      </div>

      {/* System signals */}
      {showDetail && (
        <div className="mt-2 space-y-2 pl-5">
          {/* Questions */}
          <div className="space-y-1">
            <SignalRow label="Can be simplified?" value={entry.canSimplify} />
            <SignalRow label="Can be deferred?" value={entry.canDefer} />
            <SignalRow label="SaaS replacement available?" value={entry.canReplaceSaas} />
            <SignalRow label="High risk — better excluded?" value={entry.isHighRiskExclude} />
          </div>

          {/* Decision buttons */}
          {!locked && (
            <div className="flex flex-wrap gap-1.5">
              {(["keep", "defer", "replace_saas", "remove_risk"] as MvpDecision[]).map((d) => {
                const dCfg = DECISION_CONFIG[d];
                return (
                  <button
                    key={d}
                    onClick={() => onDecisionChange(d)}
                    className={cn(
                      "text-[9px] font-semibold px-2 py-1 rounded-lg border transition-all",
                      entry.decision === d
                        ? "border-current"
                        : "border-border hover:border-current"
                    )}
                    style={{
                      color: dCfg.color,
                      background: entry.decision === d ? dCfg.bg : undefined,
                    }}
                  >
                    {MVP_DECISION_LABELS[d]}
                  </button>
                );
              })}
            </div>
          )}

          {/* Founder note */}
          {!locked ? (
            <input
              type="text"
              value={entry.founderNote}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Founder note (optional)..."
              className="w-full text-[10px] px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 transition-colors"
            />
          ) : entry.founderNote ? (
            <p className="text-[10px] italic text-muted-foreground">"{entry.founderNote}"</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SignalRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold", value ? "text-status-amber" : "text-muted-foreground/40")}>
        {value ? "Yes" : "No"}
      </span>
      {value && <span className="text-[8px] px-1 py-0.5 rounded bg-muted text-muted-foreground">Suggested by system</span>}
    </div>
  );
}
