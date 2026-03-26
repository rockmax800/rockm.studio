import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Users, ChevronDown, ChevronRight, Pencil, RotateCcw, Info } from "lucide-react";
import {
  suggestRoleMixFromBlueprint,
  type BlueprintRoleSuggestion,
  type BriefSignals,
} from "@/lib/business/market-benchmarking";

interface Props {
  signals: BriefSignals;
  className?: string;
}

interface OverriddenLine extends BlueprintRoleSuggestion {
  overriddenAllocationPct?: number;
  overriddenEffortMonths?: number;
}

export function HumanTeamSuggestionPanel({ signals, className = "" }: Props) {
  const systemSuggestion = useMemo(() => suggestRoleMixFromBlueprint(signals), [signals]);

  const [lines, setLines] = useState<OverriddenLine[]>(() =>
    systemSuggestion.map((s) => ({ ...s }))
  );
  const [expanded, setExpanded] = useState(true);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  // Re-sync when signals change but preserve overrides
  useMemo(() => {
    setLines((prev) => {
      const overrides = new Map(prev.map((l) => [l.roleCode, { a: l.overriddenAllocationPct, e: l.overriddenEffortMonths }]));
      return systemSuggestion.map((s) => ({
        ...s,
        overriddenAllocationPct: overrides.get(s.roleCode)?.a,
        overriddenEffortMonths: overrides.get(s.roleCode)?.e,
      }));
    });
  }, [systemSuggestion]);

  const hasOverrides = lines.some((l) => l.overriddenAllocationPct !== undefined || l.overriddenEffortMonths !== undefined);

  const resetOverrides = () => {
    setLines(systemSuggestion.map((s) => ({ ...s })));
    setEditingIdx(null);
  };

  const updateLine = (idx: number, field: "alloc" | "effort", value: number) => {
    setLines((prev) => prev.map((l, i) => {
      if (i !== idx) return l;
      if (field === "alloc") return { ...l, overriddenAllocationPct: Math.max(0, Math.min(1, value)) };
      return { ...l, overriddenEffortMonths: Math.max(0.1, value) };
    }));
  };

  const effectiveAlloc = (l: OverriddenLine) => l.overriddenAllocationPct ?? l.suggestedAllocationPct;
  const effectiveEffort = (l: OverriddenLine) => l.overriddenEffortMonths ?? l.suggestedEffortMonths;

  return (
    <div className={`rounded-xl border border-border/40 bg-card overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-secondary/10 transition-colors"
      >
        <Users className="h-4 w-4 text-primary/60 shrink-0" />
        <span className="text-[12px] font-bold text-foreground">Human Equivalent Team</span>
        <Badge variant="secondary" className="text-[9px] h-auto py-0 px-1.5 font-mono">
          {lines.length} roles
        </Badge>
        {hasOverrides && (
          <Badge variant="outline" className="text-[9px] h-auto py-0 px-1.5 border-status-amber/30 text-status-amber">
            Founder edits
          </Badge>
        )}
        <span className="ml-auto">
          {expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground/40" /> : <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Explainer */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/30 border border-border/20 px-3 py-2">
            <Info className="h-3 w-3 text-muted-foreground/50 mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
              <span className="font-semibold text-foreground/60">Suggested by system</span> — deterministic heuristic based on brief signals
              (complexity, modules, frontend/backend needs). Founder can edit allocations and effort. Edits are tracked separately from the original suggestion.
            </p>
          </div>

          {/* Role lines */}
          <div className="rounded-lg border border-border/30 overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_70px_70px_28px] gap-1 px-3 py-1.5 bg-muted/40 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">
              <span>Role</span>
              <span className="text-right">Alloc %</span>
              <span className="text-right">Effort mo</span>
              <span />
            </div>

            {lines.map((line, idx) => {
              const isEditing = editingIdx === idx;
              const allocDisplay = (effectiveAlloc(line) * 100).toFixed(0);
              const effortDisplay = effectiveEffort(line).toFixed(1);
              const isOverridden = line.overriddenAllocationPct !== undefined || line.overriddenEffortMonths !== undefined;

              return (
                <div key={line.roleCode}>
                  <div className={`grid grid-cols-[1fr_70px_70px_28px] gap-1 items-center px-3 py-2 border-t border-border/15 ${isOverridden ? "bg-status-amber/[0.03]" : ""}`}>
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold text-foreground truncate block">{line.roleLabel}</span>
                    </div>

                    {isEditing ? (
                      <>
                        <input
                          type="number"
                          className="w-full text-right text-[11px] font-mono bg-background border border-border rounded px-1.5 py-0.5"
                          value={(effectiveAlloc(line) * 100).toFixed(0)}
                          onChange={(e) => updateLine(idx, "alloc", Number(e.target.value) / 100)}
                          min={0}
                          max={100}
                          step={5}
                        />
                        <input
                          type="number"
                          className="w-full text-right text-[11px] font-mono bg-background border border-border rounded px-1.5 py-0.5"
                          value={effectiveEffort(line).toFixed(1)}
                          onChange={(e) => updateLine(idx, "effort", Number(e.target.value))}
                          min={0.1}
                          step={0.5}
                        />
                      </>
                    ) : (
                      <>
                        <span className={`text-right text-[11px] font-mono ${isOverridden ? "text-status-amber font-bold" : "text-foreground/70"}`}>
                          {allocDisplay}%
                        </span>
                        <span className={`text-right text-[11px] font-mono ${isOverridden ? "text-status-amber font-bold" : "text-foreground/70"}`}>
                          {effortDisplay}
                        </span>
                      </>
                    )}

                    <button
                      onClick={() => setEditingIdx(isEditing ? null : idx)}
                      className="flex items-center justify-center h-6 w-6 rounded hover:bg-secondary/20 transition-colors"
                    >
                      <Pencil className={`h-2.5 w-2.5 ${isEditing ? "text-primary" : "text-muted-foreground/30"}`} />
                    </button>
                  </div>

                  {/* Rationale row */}
                  <div className="px-3 pb-1.5 -mt-0.5">
                    <p className="text-[9px] text-muted-foreground/40 leading-relaxed pl-0.5">{line.rationale}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground/30 font-mono">
              Total alloc: {(lines.reduce((s, l) => s + effectiveAlloc(l), 0) * 100).toFixed(0)}%
            </span>
            {hasOverrides && (
              <button
                onClick={resetOverrides}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-2.5 w-2.5" /> Reset to system suggestion
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
