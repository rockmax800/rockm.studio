/**
 * TaskSpec Drafts Panel — founder-visible rendering of TaskSpecDraft[]
 * compiled from engineering slices.
 *
 * Intent Plane artifact — does NOT create Delivery Plane state.
 * Pre-delivery engineering planning only.
 */

import { useState, useMemo } from "react";
import {
  ChevronDown, ChevronRight, Shield, FileText, AlertTriangle,
  BarChart3, Users, Layers, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskSpecDraft } from "@/types/taskspec-draft";
import type { EngineeringLayer } from "@/types/engineering-slices";
import { getTaskSpecDraftStats } from "@/lib/taskspec-draft-compiler";

interface TaskSpecDraftsPanelProps {
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

const RISK_STYLES: Record<string, string> = {
  low: "bg-status-green/10 text-status-green",
  medium: "bg-status-amber/10 text-status-amber",
  high: "bg-destructive/10 text-destructive",
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

export function TaskSpecDraftsPanel({ drafts }: TaskSpecDraftsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const stats = useMemo(() => getTaskSpecDraftStats(drafts), [drafts]);

  // Group by module
  const grouped = useMemo(() => {
    const map = new Map<string, TaskSpecDraft[]>();
    for (const d of drafts) {
      const group = map.get(d.moduleId) ?? [];
      group.push(d);
      map.set(d.moduleId, group);
    }
    return map;
  }, [drafts]);

  if (drafts.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Summary stats */}
      <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          <BarChart3 className="h-3 w-3" />
          Compilation Summary
        </div>
        <div className="grid grid-cols-4 gap-2">
          <StatCell label="Total" value={String(stats.total)} />
          <StatCell label="Avg C" value={String(stats.avgComplexity)} />
          <StatCell label="Auto-split" value={String(stats.autoSplitCount)} />
          <StatCell label="High risk" value={String(stats.byRisk.high)} warn={stats.byRisk.high > 0} />
        </div>

        {/* Role distribution */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Users className="h-3 w-3 text-muted-foreground/40" />
          {Object.entries(stats.byRole).map(([role, count]) => (
            <span key={role} className="text-[9px] font-mono text-muted-foreground">
              {role} ×{count}
            </span>
          ))}
        </div>

        {stats.autoSplitCount > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-status-amber">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span>
              {stats.autoSplitCount} spec{stats.autoSplitCount !== 1 ? "s" : ""} auto-split due to high complexity
            </span>
          </div>
        )}
      </div>

      {/* Module groups */}
      {[...grouped.entries()].map(([moduleId, moduleDrafts]) => (
        <ModuleGroup
          key={moduleId}
          moduleId={moduleId}
          drafts={moduleDrafts}
          expandedId={expandedId}
          onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
        />
      ))}

      {/* Footer */}
      <div className="flex items-center gap-1.5 px-1 pt-1">
        <Shield className="h-3 w-3 text-muted-foreground/30" />
        <span className="text-[8px] text-muted-foreground/40">
          TaskSpec Drafts · pre-delivery engineering planning · aligned with canonical TaskSpec model · no live tasks created
        </span>
      </div>
    </div>
  );
}

/* ── Stat Cell ── */

function StatCell({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg px-2.5 py-1.5 bg-muted">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block">{label}</span>
      <span className={cn("text-[13px] font-bold font-mono", warn ? "text-destructive" : "text-foreground")}>{value}</span>
    </div>
  );
}

/* ── Module Group ── */

function ModuleGroup({
  moduleId,
  drafts,
  expandedId,
  onToggle,
}: {
  moduleId: string;
  drafts: TaskSpecDraft[];
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-1 py-1">
        <Layers className="h-3 w-3 text-muted-foreground/50" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {moduleId}
        </span>
        <span className="text-[9px] text-muted-foreground/40">
          {drafts.length} spec{drafts.length !== 1 ? "s" : ""}
        </span>
      </div>

      {drafts.map((draft) => (
        <TaskSpecRow
          key={draft.id}
          draft={draft}
          isExpanded={expandedId === draft.id}
          onToggle={() => onToggle(draft.id)}
        />
      ))}
    </div>
  );
}

/* ── TaskSpec Row ── */

function TaskSpecRow({
  draft,
  isExpanded,
  onToggle,
}: {
  draft: TaskSpecDraft;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const layerStyle = LAYER_STYLES[draft.engineeringLayer] ?? "bg-muted text-muted-foreground";
  const riskStyle = RISK_STYLES[draft.riskClass] ?? RISK_STYLES.low;

  return (
    <div className="rounded-xl border border-border/40 bg-card">
      {/* Header */}
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-2.5 text-left">
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground/50 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
        )}
        <span className={cn("inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase", layerStyle)}>
          {LAYER_LABELS[draft.engineeringLayer]}
        </span>
        <span className="text-[11px] font-semibold text-foreground truncate flex-1">
          {draft.title}
        </span>
        <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold uppercase", riskStyle)}>
          {draft.riskClass}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
          C:{draft.complexityScore}
        </span>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/20 pt-2">
          <Field label="Goal" value={draft.goal} />
          <Field label="Owner Role" value={draft.ownerRole} />
          <Field label="Source Slice" value={draft.sourceSliceId} mono />

          <ListField label="Allowed Repo Paths" items={draft.allowedRepoPaths} />
          <ListField label="Forbidden Repo Paths" items={draft.forbiddenRepoPaths} />
          <ListField label="Acceptance Criteria" items={draft.acceptanceCriteria} icon={CheckCircle2} />
          <ListField label="Verification Plan" items={draft.verificationPlan} />
          <ListField label="Definition of Done" items={draft.definitionOfDone} icon={CheckCircle2} />

          <div className="flex items-center gap-1.5 flex-wrap">
            <FileText className="h-3 w-3 text-muted-foreground/40" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Required Artifacts
            </span>
            {draft.requiredArtifacts.map((a) => (
              <span key={a} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Field helpers ── */

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <p className={cn("text-[10px] text-foreground/80 mt-0.5 leading-relaxed", mono && "font-mono")}>{value}</p>
    </div>
  );
}

function ListField({
  label,
  items,
  icon: Icon,
}: {
  label: string;
  items: string[];
  icon?: React.ElementType;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <ul className="mt-0.5 space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="text-[10px] text-foreground/70 flex items-start gap-1.5">
            {Icon ? (
              <Icon className="h-3 w-3 text-status-green/60 mt-0.5 shrink-0" />
            ) : (
              <span className="text-muted-foreground/30 mt-0.5">·</span>
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
