import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Cpu, ChevronDown, ChevronUp, Shield, Layers, Target,
  AlertTriangle, BarChart3, Users,
} from "lucide-react";
import type { AITaskDraft, LayerType } from "@/types/front-office-planning";
import { LAYER_LABELS, getTaskDraftStats } from "@/lib/ai-task-decomposition";

interface AiTaskDraftPanelProps {
  drafts: AITaskDraft[];
  groupByCardId?: boolean;
  cardTitles?: Record<string, string>; // backlogCardId → featureSlice
}

const LAYER_COLORS: Record<LayerType, { text: string; bg: string }> = {
  dto: { text: "hsl(280 60% 55%)", bg: "hsl(280 60% 55% / 0.08)" },
  entity: { text: "hsl(210 60% 50%)", bg: "hsl(210 60% 50% / 0.08)" },
  service: { text: "hsl(152 55% 42%)", bg: "hsl(152 55% 42% / 0.08)" },
  api: { text: "hsl(38 92% 50%)", bg: "hsl(38 92% 50% / 0.08)" },
  ui: { text: "hsl(330 65% 55%)", bg: "hsl(330 65% 55% / 0.08)" },
  test: { text: "hsl(190 60% 45%)", bg: "hsl(190 60% 45% / 0.08)" },
  migration: { text: "hsl(0 60% 50%)", bg: "hsl(0 60% 50% / 0.08)" },
  integration: { text: "hsl(260 45% 55%)", bg: "hsl(260 45% 55% / 0.08)" },
};

export function AiTaskDraftPanel({ drafts, groupByCardId = true, cardTitles = {} }: AiTaskDraftPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const stats = useMemo(() => getTaskDraftStats(drafts), [drafts]);

  // Group by source backlog card
  const groups = useMemo(() => {
    if (!groupByCardId) return [{ cardId: "all", title: "All Tasks", tasks: drafts }];
    const map = new Map<string, AITaskDraft[]>();
    for (const d of drafts) {
      const key = d.sourceBacklogCardId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return Array.from(map.entries()).map(([cardId, tasks]) => ({
      cardId,
      title: cardTitles[cardId] || cardId.slice(0, 8),
      tasks,
    }));
  }, [drafts, groupByCardId, cardTitles]);

  if (drafts.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] animate-slide-up">
      {/* Header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary" />
          <span className="text-[12px] font-bold tracking-tight text-foreground">
            AI Task Drafts
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-status-amber/10 text-status-amber">
            PRE-DELIVERY
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {stats.total} task{stats.total !== 1 ? "s" : ""}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Stats strip */}
          <StatsStrip stats={stats} />

          {/* Quality note */}
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-primary/[0.04] border border-primary/10">
            <Target className="h-3.5 w-3.5 text-primary/60 mt-0.5 shrink-0" />
            <p className="text-[10px] text-primary/70 leading-relaxed">
              Granular tasks improve implementation stability and estimate accuracy. Each task affects
              exactly one layer and has explicit boundaries.
            </p>
          </div>

          {/* Grouped task drafts */}
          {groups.map((group) => (
            <TaskGroup
              key={group.cardId}
              title={group.title}
              tasks={group.tasks}
              showGroupHeader={groups.length > 1}
            />
          ))}

          {/* Footer */}
          <div className="flex items-center gap-1.5 px-1">
            <Shield className="h-3 w-3 text-muted-foreground/40" />
            <span className="text-[9px] text-muted-foreground/50">
              Intent Plane artifact · draft/planning state · live Delivery tasks created only after launch gate
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Stats Strip ── */

function StatsStrip({ stats }: { stats: ReturnType<typeof getTaskDraftStats> }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        <BarChart3 className="h-3 w-3" />
        Decomposition Summary
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StatCell label="Total tasks" value={String(stats.total)} />
        <StatCell label="Avg complexity" value={String(stats.avgComplexity)} />
        <StatCell label="Layers" value={String(Object.keys(stats.byLayer).length)} />
      </div>

      {/* Layer distribution */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(stats.byLayer).map(([layer, count]) => {
          const colors = LAYER_COLORS[layer as LayerType] ?? { text: "hsl(0 0% 50%)", bg: "hsl(0 0% 50% / 0.08)" };
          return (
            <span
              key={layer}
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ color: colors.text, background: colors.bg }}
            >
              {layer} ×{count}
            </span>
          );
        })}
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

      {stats.highComplexityCount > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-status-amber">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>{stats.highComplexityCount} task{stats.highComplexityCount !== 1 ? "s" : ""} were auto-split due to high complexity</span>
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-2.5 py-1.5 bg-muted">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block">{label}</span>
      <span className="text-[13px] font-bold font-mono text-foreground">{value}</span>
    </div>
  );
}

/* ── Task Group ── */

function TaskGroup({
  title,
  tasks,
  showGroupHeader,
}: {
  title: string;
  tasks: AITaskDraft[];
  showGroupHeader: boolean;
}) {
  return (
    <div>
      {showGroupHeader && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <Layers className="h-3 w-3 text-muted-foreground/40" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
            {title}
          </span>
          <span className="text-[9px] font-mono text-muted-foreground/40">{tasks.length}</span>
        </div>
      )}
      <div className="space-y-1.5">
        {tasks.map((draft) => (
          <TaskDraftRow key={draft.id} draft={draft} />
        ))}
      </div>
    </div>
  );
}

/* ── Task Draft Row ── */

function TaskDraftRow({ draft }: { draft: AITaskDraft }) {
  const [showDetail, setShowDetail] = useState(false);
  const colors = LAYER_COLORS[draft.layerType] ?? { text: "hsl(0 0% 50%)", bg: "hsl(0 0% 50% / 0.08)" };

  return (
    <div className="rounded-xl border border-border bg-muted/30 px-3 py-2">
      {/* Top row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => setShowDetail((p) => !p)} className="shrink-0">
            {showDetail ? (
              <ChevronUp className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
          <span className="text-[11px] font-bold text-foreground truncate">{draft.title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
            style={{ color: colors.text, background: colors.bg }}
          >
            {draft.layerType}
          </span>
          <ComplexityDot score={draft.complexityScore} />
        </div>
      </div>

      {/* Collapsed preview */}
      {!showDetail && (
        <div className="flex items-center gap-3 mt-1 pl-5 text-[10px] text-muted-foreground">
          <span>Role: <span className="font-semibold text-foreground/70">{draft.ownerRole}</span></span>
          <span>Score: <span className="font-mono font-semibold text-foreground/70">{draft.complexityScore}</span></span>
        </div>
      )}

      {/* Expanded detail */}
      {showDetail && (
        <div className="mt-2 pl-5 space-y-1.5">
          <DetailRow label="Layer" value={LAYER_LABELS[draft.layerType]} />
          <DetailRow label="Owner Role" value={draft.ownerRole} />
          <DetailRow label="Complexity" value={`${draft.complexityScore}/10`} />
          <DetailRow label="Allowed Area" value={draft.allowedArea} />
          <DetailRow label="Forbidden Area" value={draft.forbiddenArea} />
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Definition of Done</span>
            <p className="text-[10px] text-foreground/80 mt-0.5">{draft.definitionOfDone}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-[10px]">
      <span className="text-muted-foreground font-semibold shrink-0 w-24">{label}</span>
      <span className="text-foreground/80">{value}</span>
    </div>
  );
}

function ComplexityDot({ score }: { score: number }) {
  const color = score >= 7 ? "bg-destructive" : score >= 4 ? "bg-status-amber" : "bg-status-green";
  return (
    <div className="flex items-center gap-1">
      <div className={cn("h-1.5 w-1.5 rounded-full", color)} />
      <span className="text-[9px] font-mono text-muted-foreground">{score}</span>
    </div>
  );
}
