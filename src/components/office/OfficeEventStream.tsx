import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { Activity, Loader2 } from "lucide-react";
import type { OfficeEvent } from "@/hooks/use-office-data";

interface OfficeEventStreamProps {
  officeEvents: OfficeEvent[];
  activityEvents: any[];
}

const CHIP_COLORS: Record<string, { bg: string; text: string }> = {
  "task.assigned":        { bg: "bg-status-blue/10",     text: "text-status-blue" },
  "run.started":          { bg: "bg-status-amber/10",    text: "text-status-amber" },
  "run.completed":        { bg: "bg-status-green/10",    text: "text-status-green" },
  "run.failed":           { bg: "bg-status-red/10",      text: "text-status-red" },
  "artifact.submitted":   { bg: "bg-status-cyan/10",     text: "text-status-cyan" },
  "review.approved":      { bg: "bg-status-green/10",    text: "text-status-green" },
  "review.rejected":      { bg: "bg-status-red/10",      text: "text-status-red" },
  "deploy.live":          { bg: "bg-status-green/10",    text: "text-status-green" },
  "deploy.failed":        { bg: "bg-status-red/10",      text: "text-status-red" },
  task_assigned:          { bg: "bg-status-blue/10",     text: "text-status-blue" },
  run_started:            { bg: "bg-status-amber/10",    text: "text-status-amber" },
  run_completed:          { bg: "bg-status-green/10",    text: "text-status-green" },
  run_failed:             { bg: "bg-status-red/10",      text: "text-status-red" },
  artifact_submitted:     { bg: "bg-status-cyan/10",     text: "text-status-cyan" },
  review_approved:        { bg: "bg-status-green/10",    text: "text-status-green" },
  review_rejected:        { bg: "bg-status-red/10",      text: "text-status-red" },
  deployment_started:     { bg: "bg-lifecycle-deploying/10", text: "text-lifecycle-deploying" },
  deployment_completed:   { bg: "bg-status-green/10",    text: "text-status-green" },
  approval_created:       { bg: "bg-status-amber/10",    text: "text-status-amber" },
  task_escalated:         { bg: "bg-lifecycle-escalated/10", text: "text-lifecycle-escalated" },
};

const DEFAULT_CHIP = { bg: "bg-muted", text: "text-muted-foreground" };

export function OfficeEventStream({ officeEvents, activityEvents }: OfficeEventStreamProps) {
  const merged = [
    ...officeEvents.map((e) => ({
      id: e.id,
      type: e.event_type,
      time: e.timestamp,
      meta: e.from_zone && e.to_zone ? `${e.from_zone} → ${e.to_zone}` : undefined,
    })),
    ...activityEvents.slice(0, 50).map((e: any) => ({
      id: e.id,
      type: e.event_type,
      time: e.created_at,
      meta: `${e.entity_type} · ${e.actor_type}`,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 80);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-card-title text-foreground">Live Flow</h3>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-status-green animate-pulse" />
          <span className="text-[11px] font-medium text-status-green">Live</span>
        </div>
      </div>

      {merged.length === 0 ? (
        <div className="flex items-center gap-1.5 px-2 py-2 rounded-lg bg-secondary text-[12px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Waiting for events…</span>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-1 pr-1">
          <div className="space-y-px">
            {merged.map((evt, i) => {
              const cfg = CHIP_COLORS[evt.type] ?? DEFAULT_CHIP;
              return (
                <div
                  key={evt.id}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors duration-180 animate-fade-in cursor-pointer"
                  style={{ animationDelay: `${Math.min(i * 15, 150)}ms` }}
                >
                  <div className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Activity className={`h-3 w-3 ${cfg.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-[12px] font-medium ${cfg.text} truncate block`}>
                      {evt.type.replace(/[._]/g, " ")}
                    </span>
                    {evt.meta && (
                      <span className="text-[10px] text-muted-foreground truncate block">{evt.meta}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground tabular-nums whitespace-nowrap shrink-0">
                    {formatDistanceToNow(new Date(evt.time), { addSuffix: false })}
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
