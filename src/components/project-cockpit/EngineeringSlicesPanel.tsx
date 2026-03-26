/**
 * Engineering Slices Panel — founder-visible, editable view of
 * engineering slices generated from the planning package.
 *
 * Intent Plane artifact — does NOT create Delivery Plane state.
 * Founder controls: split, merge, mark unclear, lower complexity.
 */

import { useState, useMemo } from "react";
import {
  Scissors, Merge, AlertTriangle, ChevronDown, ChevronRight,
  Layers, Shield, ArrowDownNarrowWide,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EngineeringSliceDraft, EngineeringLayer } from "@/types/engineering-slices";
import { splitSlice, mergeSlices } from "@/lib/engineering-slices";

interface EngineeringSlicesPanelProps {
  slices: EngineeringSliceDraft[];
  onSlicesChange?: (slices: EngineeringSliceDraft[]) => void;
  locked?: boolean;
}

const LAYER_LABELS: Record<EngineeringLayer, string> = {
  domain_model: "Domain Model",
  dto_or_contract: "DTO / Contract",
  application_service: "Service",
  api_handler: "API Handler",
  ui_component: "UI Component",
  test: "Test Suite",
  migration: "Migration",
  integration_adapter: "Integration",
};

const LAYER_COLORS: Record<EngineeringLayer, string> = {
  domain_model: "bg-primary/10 text-primary",
  dto_or_contract: "bg-status-cyan/10 text-status-cyan",
  application_service: "bg-status-amber/10 text-status-amber",
  api_handler: "bg-lifecycle-review/10 text-lifecycle-review",
  ui_component: "bg-status-green/10 text-status-green",
  test: "bg-muted text-muted-foreground",
  migration: "bg-destructive/10 text-destructive",
  integration_adapter: "bg-accent/80 text-accent-foreground",
};

export function EngineeringSlicesPanel({ slices, onSlicesChange, locked }: EngineeringSlicesPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mergeSelection, setMergeSelection] = useState<string[]>([]);
  const [unclearIds, setUnclearIds] = useState<Set<string>>(new Set());

  // Group slices by module
  const grouped = useMemo(() => {
    const map = new Map<string, EngineeringSliceDraft[]>();
    for (const s of slices) {
      const group = map.get(s.moduleName) ?? [];
      group.push(s);
      map.set(s.moduleName, group);
    }
    return map;
  }, [slices]);

  const handleSplit = (sliceId: string) => {
    if (locked || !onSlicesChange) return;
    const idx = slices.findIndex((s) => s.id === sliceId);
    if (idx === -1) return;
    const [a, b] = splitSlice(slices[idx]);
    const next = [...slices];
    next.splice(idx, 1, a, b);
    onSlicesChange(next);
  };

  const handleMerge = () => {
    if (locked || !onSlicesChange || mergeSelection.length < 2) return;
    const selected = slices.filter((s) => mergeSelection.includes(s.id));
    if (selected.length < 2) return;
    const merged = selected.reduce((acc, s) => mergeSlices(acc, s));
    const remaining = slices.filter((s) => !mergeSelection.includes(s.id));
    onSlicesChange([...remaining, merged]);
    setMergeSelection([]);
  };

  const handleMarkUnclear = (sliceId: string) => {
    setUnclearIds((prev) => {
      const next = new Set(prev);
      if (next.has(sliceId)) next.delete(sliceId); else next.add(sliceId);
      return next;
    });
  };

  const handleLowerComplexity = (sliceId: string) => {
    if (locked || !onSlicesChange) return;
    onSlicesChange(slices.map((s) =>
      s.id === sliceId ? { ...s, maxComplexityScore: Math.max(1, s.maxComplexityScore - 1) } : s,
    ));
  };

  const toggleMergeSelect = (sliceId: string) => {
    setMergeSelection((prev) =>
      prev.includes(sliceId) ? prev.filter((id) => id !== sliceId) : [...prev, sliceId],
    );
  };

  return (
    <div className="space-y-3">
      {/* Merge bar */}
      {mergeSelection.length >= 2 && !locked && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.04] px-3 py-2">
          <Merge className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-semibold text-primary">
            {mergeSelection.length} slices selected
          </span>
          <button
            onClick={handleMerge}
            className="ml-auto text-[10px] font-bold text-primary underline underline-offset-2 hover:opacity-80"
          >
            Merge selected →
          </button>
          <button
            onClick={() => setMergeSelection([])}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Module groups */}
      {[...grouped.entries()].map(([moduleName, moduleSlices]) => (
        <div key={moduleName} className="space-y-1">
          <div className="flex items-center gap-2 px-1 py-1">
            <Layers className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {moduleName}
            </span>
            <span className="text-[9px] text-muted-foreground/40">
              {moduleSlices.length} slice{moduleSlices.length !== 1 ? "s" : ""}
              {moduleSlices[0].executionBatch != null && ` · batch ${moduleSlices[0].executionBatch}`}
            </span>
          </div>

          {moduleSlices.map((slice) => {
            const isExpanded = expandedId === slice.id;
            const isUnclear = unclearIds.has(slice.id);
            const isMergeSelected = mergeSelection.includes(slice.id);
            // Infer layer from ID for badge
            const layerKey = (slice.id.split("-").pop() ?? "application_service") as EngineeringLayer;
            const layerLabel = LAYER_LABELS[layerKey] ?? layerKey;
            const layerColor = LAYER_COLORS[layerKey] ?? "bg-muted text-muted-foreground";

            return (
              <div
                key={slice.id}
                className={cn(
                  "rounded-xl border transition-colors",
                  isUnclear && "border-status-amber/30 bg-status-amber/[0.03]",
                  isMergeSelected && "border-primary/30 bg-primary/[0.03]",
                  !isUnclear && !isMergeSelected && "border-border/40 bg-card",
                )}
              >
                {/* Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : slice.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  )}
                  <span className={cn("inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase", layerColor)}>
                    {layerLabel}
                  </span>
                  <span className="text-[11px] font-semibold text-foreground truncate flex-1">
                    {slice.moduleName}
                  </span>
                  {isUnclear && (
                    <span className="px-1.5 py-0.5 rounded bg-status-amber/10 text-status-amber text-[8px] font-bold uppercase">
                      Unclear
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                    C:{slice.maxComplexityScore}/10
                  </span>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2 border-t border-border/20 pt-2">
                    <DetailRow label="Business Goal" value={slice.businessGoal} />
                    <DetailRow label="Technical Boundary" value={slice.technicalBoundary} />
                    <DetailList label="Allowed Repo Areas" items={slice.allowedRepoAreas} />
                    <DetailList label="Expected Touch Points" items={slice.expectedTouchPoints} />
                    <DetailList label="Expected Interfaces" items={slice.expectedInterfaces} />
                    <DetailList label="Performance Constraints" items={slice.performanceConstraints} />
                    <DetailList label="Test Scope" items={slice.testScope} />

                    {/* Founder controls */}
                    {!locked && (
                      <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-border/20">
                        <SliceAction icon={Scissors} label="Split" onClick={() => handleSplit(slice.id)} />
                        <SliceAction
                          icon={Merge}
                          label={isMergeSelected ? "Deselect" : "Select to merge"}
                          onClick={() => toggleMergeSelect(slice.id)}
                          active={isMergeSelected}
                        />
                        <SliceAction
                          icon={AlertTriangle}
                          label={isUnclear ? "Clear flag" : "Mark unclear"}
                          onClick={() => handleMarkUnclear(slice.id)}
                          active={isUnclear}
                          variant="warn"
                        />
                        <SliceAction
                          icon={ArrowDownNarrowWide}
                          label="Lower complexity"
                          onClick={() => handleLowerComplexity(slice.id)}
                          disabled={slice.maxComplexityScore <= 1}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Footer */}
      <div className="flex items-center gap-1.5 px-1 pt-1">
        <Shield className="h-3 w-3 text-muted-foreground/30" />
        <span className="text-[8px] text-muted-foreground/40">
          Intent Plane draft · engineering slices are planning artifacts · no live Delivery tasks created
        </span>
      </div>
    </div>
  );
}

/* ── Detail helpers ── */

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <p className="text-[10px] text-foreground/80 mt-0.5 leading-relaxed">{value}</p>
    </div>
  );
}

function DetailList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <ul className="mt-0.5 space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="text-[10px] text-foreground/70 flex items-start gap-1.5">
            <span className="text-muted-foreground/30 mt-0.5">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SliceAction({
  icon: Icon,
  label,
  onClick,
  active,
  variant,
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  active?: boolean;
  variant?: "warn";
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold transition-colors border",
        disabled && "opacity-30 pointer-events-none",
        active && variant === "warn" && "border-status-amber/30 bg-status-amber/10 text-status-amber",
        active && !variant && "border-primary/30 bg-primary/10 text-primary",
        !active && "border-border/40 text-muted-foreground hover:text-foreground hover:border-border",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}
