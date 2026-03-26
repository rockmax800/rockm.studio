import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Boxes, ChevronDown, ChevronUp, Plus, Merge, Shield,
  AlertTriangle, CheckCircle2, ArrowRight, Trash2, Edit3,
  GitBranch,
} from "lucide-react";
import type {
  SystemModule,
  DependencyEdge,
  RiskLevel,
  ComplexityEstimate,
} from "@/types/front-office-planning";
import { createEmptyModule, mergeModules } from "@/lib/system-decomposition";

interface SystemDecompositionPanelProps {
  modules: SystemModule[];
  dependencyGraph: DependencyEdge[];
  onModulesChange: (modules: SystemModule[], graph: DependencyEdge[]) => void;
  locked: boolean;
  onConfirm: () => void;
}

const RISK_COLORS: Record<RiskLevel, { color: string; bg: string }> = {
  low: { color: "hsl(152 60% 42%)", bg: "hsl(152 60% 42% / 0.08)" },
  medium: { color: "hsl(38 92% 50%)", bg: "hsl(38 92% 50% / 0.08)" },
  high: { color: "hsl(0 72% 51%)", bg: "hsl(0 72% 51% / 0.08)" },
  critical: { color: "hsl(0 72% 51%)", bg: "hsl(0 72% 51% / 0.12)" },
};

const COMPLEXITY_LABELS: Record<ComplexityEstimate, string> = {
  trivial: "Trivial",
  small: "Small",
  medium: "Medium",
  large: "Large",
  xlarge: "XL",
};

export function SystemDecompositionPanel({
  modules,
  dependencyGraph,
  onModulesChange,
  locked,
  onConfirm,
}: SystemDecompositionPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  const [mergeSelection, setMergeSelection] = useState<string[]>([]);
  const [mergeMode, setMergeMode] = useState(false);

  const mvpCount = modules.filter((m) => !m.mvpOptional).length;
  const optionalCount = modules.length - mvpCount;

  const handleAddModule = () => {
    if (!newModuleName.trim()) return;
    const mod = createEmptyModule(newModuleName.trim());
    onModulesChange([...modules, mod], dependencyGraph);
    setNewModuleName("");
    setAddingModule(false);
  };

  const handleRemoveModule = (name: string) => {
    const updated = modules.filter((m) => m.name !== name);
    const updatedGraph = dependencyGraph.filter((e) => e.from !== name && e.to !== name);
    // Clean dependencies from remaining modules
    for (const m of updated) {
      m.dependencies = m.dependencies.filter((d) => d !== name);
    }
    onModulesChange(updated, updatedGraph);
  };

  const handleToggleMvp = (name: string) => {
    const updated = modules.map((m) =>
      m.name === name ? { ...m, mvpOptional: !m.mvpOptional } : m
    );
    onModulesChange(updated, dependencyGraph);
  };

  const handleChangeRisk = (name: string, risk: RiskLevel) => {
    const updated = modules.map((m) =>
      m.name === name ? { ...m, riskLevel: risk } : m
    );
    onModulesChange(updated, dependencyGraph);
  };

  const handleMergeSelected = () => {
    if (mergeSelection.length !== 2) return;
    const [aName, bName] = mergeSelection;
    const a = modules.find((m) => m.name === aName);
    const b = modules.find((m) => m.name === bName);
    if (!a || !b) return;
    const merged = mergeModules(a, b);
    const remaining = modules.filter((m) => m.name !== aName && m.name !== bName);
    // Update dependency graph: replace references to old names with merged name
    const updatedGraph = dependencyGraph
      .filter((e) => !(
        (e.from === aName && e.to === bName) ||
        (e.from === bName && e.to === aName)
      ))
      .map((e) => ({
        ...e,
        from: e.from === aName || e.from === bName ? merged.name : e.from,
        to: e.to === aName || e.to === bName ? merged.name : e.to,
      }))
      .filter((e) => e.from !== e.to); // remove self-refs
    // Update dependencies in remaining modules
    for (const m of remaining) {
      m.dependencies = m.dependencies.map((d) =>
        d === aName || d === bName ? merged.name : d
      ).filter((d, i, arr) => arr.indexOf(d) === i && d !== m.name);
    }
    onModulesChange([...remaining, merged], updatedGraph);
    setMergeSelection([]);
    setMergeMode(false);
  };

  const toggleMergeSelect = (name: string) => {
    setMergeSelection((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : prev.length < 2 ? [...prev, name] : prev
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
          <Boxes className="h-4 w-4 text-primary" />
          <span className="text-[12px] font-bold tracking-tight text-foreground">
            System Decomposition
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
            {modules.length} modules
          </span>
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
          {/* Summary strip */}
          <div className="flex gap-2 text-[10px]">
            <span className="px-2 py-1 rounded-lg bg-primary/8 text-primary font-semibold">
              {mvpCount} MVP
            </span>
            <span className="px-2 py-1 rounded-lg bg-muted text-muted-foreground font-semibold">
              {optionalCount} optional
            </span>
            <span className="px-2 py-1 rounded-lg bg-muted text-muted-foreground font-semibold">
              {dependencyGraph.length} dependencies
            </span>
          </div>

          {/* Module list */}
          <div className="space-y-2">
            {modules.map((mod) => (
              <ModuleCard
                key={mod.name}
                module={mod}
                locked={locked}
                mergeMode={mergeMode}
                mergeSelected={mergeSelection.includes(mod.name)}
                onToggleMvp={() => handleToggleMvp(mod.name)}
                onChangeRisk={(r) => handleChangeRisk(mod.name, r)}
                onRemove={() => handleRemoveModule(mod.name)}
                onMergeSelect={() => toggleMergeSelect(mod.name)}
              />
            ))}
          </div>

          {/* Dependency graph */}
          {dependencyGraph.length > 0 && (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold text-foreground">Dependency Graph</span>
              </div>
              <div className="space-y-1">
                {dependencyGraph.map((edge, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <span className="font-semibold text-foreground px-1.5 py-0.5 rounded bg-muted">{edge.from}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="font-semibold text-foreground px-1.5 py-0.5 rounded bg-muted">{edge.to}</span>
                    <span className="text-muted-foreground italic truncate ml-1">{edge.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Founder controls */}
          {!locked && (
            <div className="space-y-2">
              {/* Add module */}
              {addingModule ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newModuleName}
                    onChange={(e) => setNewModuleName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddModule()}
                    placeholder="Module name..."
                    className="flex-1 text-[11px] px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50"
                    autoFocus
                  />
                  <button
                    onClick={handleAddModule}
                    disabled={!newModuleName.trim()}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setAddingModule(false); setNewModuleName(""); }}
                    className="text-[10px] font-bold px-2 py-1.5 rounded-lg bg-muted text-muted-foreground"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setAddingModule(true)}
                    className="flex-1 h-8 flex items-center justify-center gap-1.5 text-[11px] font-semibold rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Add Module
                  </button>
                  <button
                    onClick={() => {
                      if (mergeMode) { setMergeMode(false); setMergeSelection([]); }
                      else setMergeMode(true);
                    }}
                    disabled={modules.length < 2}
                    className={cn(
                      "flex-1 h-8 flex items-center justify-center gap-1.5 text-[11px] font-semibold rounded-xl border transition-colors",
                      mergeMode
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-border bg-card text-foreground hover:bg-muted",
                      modules.length < 2 && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <Merge className="h-3 w-3" /> {mergeMode ? "Cancel Merge" : "Merge"}
                  </button>
                </div>
              )}

              {/* Merge confirm */}
              {mergeMode && mergeSelection.length === 2 && (
                <button
                  onClick={handleMergeSelected}
                  className="w-full h-8 rounded-xl text-[11px] font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all"
                >
                  Merge "{mergeSelection[0]}" + "{mergeSelection[1]}"
                </button>
              )}
              {mergeMode && mergeSelection.length < 2 && (
                <p className="text-[10px] text-muted-foreground/60 text-center italic">
                  Select 2 modules to merge
                </p>
              )}

              {/* Confirm decomposition */}
              <button
                onClick={onConfirm}
                disabled={modules.length === 0}
                className={cn(
                  "w-full h-9 rounded-xl text-[12px] font-bold transition-all",
                  modules.length > 0
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                )}
              >
                {modules.length > 0
                  ? "Confirm Decomposition"
                  : "Add at least one module"}
              </button>

              <p className="text-[10px] text-muted-foreground/60 italic text-center">
                Estimate cannot be generated until decomposition is confirmed.
              </p>
            </div>
          )}

          {/* Planning artifact label */}
          <div className="flex items-center gap-1.5 px-1">
            <Shield className="h-3 w-3 text-muted-foreground/40" />
            <span className="text-[9px] text-muted-foreground/50">
              Intent Plane artifact · draft/planning state · not persisted canonically
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Module Card ── */

function ModuleCard({
  module: mod,
  locked,
  mergeMode,
  mergeSelected,
  onToggleMvp,
  onChangeRisk,
  onRemove,
  onMergeSelect,
}: {
  module: SystemModule;
  locked: boolean;
  mergeMode: boolean;
  mergeSelected: boolean;
  onToggleMvp: () => void;
  onChangeRisk: (r: RiskLevel) => void;
  onRemove: () => void;
  onMergeSelect: () => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const riskCfg = RISK_COLORS[mod.riskLevel];

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 transition-all",
        mergeMode && mergeSelected
          ? "border-primary bg-primary/5"
          : "border-border bg-muted/30"
      )}
      onClick={mergeMode ? onMergeSelect : undefined}
      style={mergeMode ? { cursor: "pointer" } : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {!mergeMode && (
            <button onClick={() => setShowDetail((p) => !p)} className="shrink-0">
              {showDetail ? (
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          )}
          {mergeMode && (
            <div className={cn(
              "h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center",
              mergeSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
            )}>
              {mergeSelected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
            </div>
          )}
          <span className="text-[11px] font-bold text-foreground truncate">{mod.name}</span>
          {mod.mvpOptional && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground shrink-0">
              OPTIONAL
            </span>
          )}
          {!mod.mvpOptional && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary shrink-0">
              MVP
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
            style={{ background: riskCfg.bg, color: riskCfg.color }}
          >
            {mod.riskLevel.toUpperCase()}
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
            {COMPLEXITY_LABELS[mod.complexityEstimate]}
          </span>
        </div>
      </div>

      {showDetail && !mergeMode && (
        <div className="mt-2 space-y-2 pl-5">
          <p className="text-[10px] text-muted-foreground">{mod.purpose || "No purpose defined"}</p>

          {mod.coreFeatures.length > 0 && (
            <div>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Features</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {mod.coreFeatures.map((f) => (
                  <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-muted border border-border text-foreground/80">{f}</span>
                ))}
              </div>
            </div>
          )}

          {mod.dependencies.length > 0 && (
            <div>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Depends on</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {mod.dependencies.map((d) => (
                  <span key={d} className="text-[9px] px-1.5 py-0.5 rounded bg-accent border border-border text-foreground/80 font-medium">{d}</span>
                ))}
              </div>
            </div>
          )}

          {/* Founder controls */}
          {!locked && (
            <div className="flex items-center gap-2 pt-1 border-t border-border/50">
              <button
                onClick={onToggleMvp}
                className="text-[9px] font-semibold px-2 py-1 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
              >
                {mod.mvpOptional ? "Mark MVP" : "Mark Optional"}
              </button>
              <select
                value={mod.riskLevel}
                onChange={(e) => onChangeRisk(e.target.value as RiskLevel)}
                className="text-[9px] font-semibold px-2 py-1 rounded-lg border border-border bg-card text-foreground outline-none"
              >
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
                <option value="critical">Critical Risk</option>
              </select>
              <button
                onClick={onRemove}
                className="text-[9px] font-semibold px-2 py-1 rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/5 transition-colors ml-auto"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
