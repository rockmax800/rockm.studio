/**
 * Execution Plan Panel — founder-readable view of the dependency-ordered
 * execution plan for TaskSpec drafts.
 *
 * Intent Plane artifact — does NOT create Delivery Plane state.
 */

import { useState } from "react";
import {
  ChevronDown, ChevronRight, Shield, AlertTriangle, Zap,
  ArrowRight, Layers, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskSpecDraft } from "@/types/taskspec-draft";
import type { ExecutionPlanDraft } from "@/types/execution-plan";
import type { PlanWarning } from "@/lib/execution-planner";
import type { EngineeringLayer } from "@/types/engineering-slices";

interface ExecutionPlanPanelProps {
  plan: ExecutionPlanDraft;
  warnings: PlanWarning[];
  drafts: TaskSpecDraft[];
}

const LAYER_LABELS: Record<EngineeringLayer, string> = {
  domain_model: "Domain",
  dto_or_contract: "DTO",
  application_service: "Service",
  api_handler: "API",
  ui_component: "UI",
  test: "Test",
  migration: "Migration",
  integration_adapter: "Integration",
};

const LAYER_STYLES: Record<EngineeringLayer, string> = {
  domain_model: "bg-primary/10 text-primary",
  dto_or_contract: "bg-accent/60 text-accent-foreground",
  application_service: "bg-status-amber/10 text-status-amber",
  api_handler: "bg-lifecycle-review/10 text-lifecycle-review",
  ui_component: "bg-status-green/10 text-status-green",
  test: "bg-muted text-muted-foreground",
  migration: "bg-destructive/10 text-destructive",
  integration_adapter: "bg-primary/8 text-primary/80",
};

const WARNING_STYLES: Record<PlanWarning["type"], { bg: string; icon: string }> = {
  cycle: { bg: "bg-destructive/[0.06] border-destructive/20", icon: "text-destructive" },
  missing_dependency: { bg: "bg-status-amber/[0.06] border-status-amber/20", icon: "text-status-amber" },
  unsafe_parallel: { bg: "bg-status-amber/[0.06] border-status-amber/20", icon: "text-status-amber" },
};

export function ExecutionPlanPanel({ plan, warnings, drafts }: ExecutionPlanPanelProps) {
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const draftMap = new Map(drafts.map((d) => [d.id, d]));
  const criticalSet = new Set(plan.criticalPath);

  const totalComplexity = drafts.reduce((s, d) => s + d.complexityScore, 0);

  return (
    <div className="space-y-3">
      {/* Summary strip */}
      <div className="rounded-xl border border-border bg-muted/30 p-3">
        <div className="grid grid-cols-4 gap-2">
          <MiniStat label="Batches" value={String(plan.batches.length)} />
          <MiniStat label="Specs" value={String(plan.taskDraftIds.length)} />
          <MiniStat label="Edges" value={String(plan.edges.length)} />
          <MiniStat
            label="Warnings"
            value={String(warnings.length)}
            warn={warnings.length > 0}
          />
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1.5">
          {warnings.map((w, i) => {
            const style = WARNING_STYLES[w.type];
            return (
              <div
                key={i}
                className={cn("flex items-start gap-2 rounded-xl border px-3 py-2", style.bg)}
              >
                <AlertTriangle className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", style.icon)} />
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    {w.type.replace(/_/g, " ")}
                  </span>
                  <p className="text-[10px] text-foreground/80 mt-0.5">{w.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Batches */}
      {plan.batches.map((batch) => (
        <BatchCard
          key={batch.batchNumber}
          batch={batch}
          draftMap={draftMap}
          criticalSet={criticalSet}
        />
      ))}

      {/* Critical Path */}
      {plan.criticalPath.length > 1 && (
        <div className="rounded-xl border border-border/40 bg-card">
          <button
            onClick={() => setShowCriticalPath((p) => !p)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
          >
            {showCriticalPath ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground/50" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            )}
            <Zap className="h-3.5 w-3.5 text-status-amber" />
            <span className="text-[11px] font-bold text-foreground">Critical Path</span>
            <span className="text-[9px] text-muted-foreground/40 ml-1">
              {plan.criticalPath.length} specs · {totalComplexity} total complexity
            </span>
          </button>

          {showCriticalPath && (
            <div className="px-3 pb-3 border-t border-border/20 pt-2">
              <div className="flex flex-wrap items-center gap-1">
                {plan.criticalPath.map((id, i) => {
                  const d = draftMap.get(id);
                  if (!d) return null;
                  const layerStyle = LAYER_STYLES[d.engineeringLayer] ?? "bg-muted text-muted-foreground";
                  return (
                    <span key={id} className="flex items-center gap-1">
                      <span className={cn(
                        "inline-block px-1.5 py-0.5 rounded text-[8px] font-bold",
                        layerStyle,
                      )}>
                        {d.title}
                      </span>
                      {i < plan.criticalPath.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground/30" />
                      )}
                    </span>
                  );
                })}
              </div>
              <p className="text-[9px] text-muted-foreground/50 mt-2">
                The critical path determines the minimum sequential execution time.
                Optimizing these specs has the highest impact on total delivery timeline.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-1.5 px-1 pt-1">
        <Shield className="h-3 w-3 text-muted-foreground/30" />
        <span className="text-[8px] text-muted-foreground/40">
          Execution Plan Draft · pre-delivery ordering · no live tasks created · founder may reorder
        </span>
      </div>
    </div>
  );
}

/* ── Batch Card ── */

function BatchCard({
  batch,
  draftMap,
  criticalSet,
}: {
  batch: import("@/types/execution-plan").ExecutionBatch;
  draftMap: Map<string, TaskSpecDraft>;
  criticalSet: Set<string>;
}) {
  const batchDrafts = batch.taskDraftIds
    .map((id) => draftMap.get(id))
    .filter(Boolean) as TaskSpecDraft[];
  const batchComplexity = batchDrafts.reduce((s, d) => s + d.complexityScore, 0);
  const isParallel = batchDrafts.length > 1;

  return (
    <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
      {/* Batch header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/20">
        <div className={cn(
          "flex items-center justify-center h-5 w-5 rounded-md text-[10px] font-bold",
          "bg-primary/10 text-primary",
        )}>
          {batch.batchNumber}
        </div>
        <span className="text-[11px] font-bold text-foreground">
          Batch {batch.batchNumber}
        </span>
        {isParallel && (
          <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-status-green/10 text-status-green">
            <Layers className="h-3 w-3" />
            Parallel ×{batchDrafts.length}
          </span>
        )}
        <span className="text-[9px] text-muted-foreground/40 ml-auto flex items-center gap-1">
          <Clock className="h-3 w-3" />
          C:{batchComplexity}
        </span>
      </div>

      {/* Batch specs */}
      <div className="px-3 py-2 space-y-1">
        {batchDrafts.map((d) => {
          const layerStyle = LAYER_STYLES[d.engineeringLayer] ?? "bg-muted text-muted-foreground";
          const onCritical = criticalSet.has(d.id);
          return (
            <div
              key={d.id}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-lg",
                onCritical ? "bg-status-amber/[0.04]" : "bg-transparent",
              )}
            >
              <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold uppercase", layerStyle)}>
                {LAYER_LABELS[d.engineeringLayer]}
              </span>
              <span className="text-[10px] font-semibold text-foreground truncate flex-1">
                {d.title}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                {d.ownerRole}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                C:{d.complexityScore}
              </span>
              {onCritical && (
                <Zap className="h-3 w-3 text-status-amber shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Rationale */}
      <div className="px-3 pb-2">
        <p className="text-[9px] text-muted-foreground/40 italic">{batch.rationale}</p>
      </div>
    </div>
  );
}

/* ── Mini stat ── */

function MiniStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg px-2.5 py-1.5 bg-muted">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block">
        {label}
      </span>
      <span className={cn("text-[13px] font-bold font-mono", warn ? "text-destructive" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}
