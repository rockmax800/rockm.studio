import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Activity } from "lucide-react";
import type { OfficeEvent } from "@/hooks/use-office-data";

interface OfficeEventStreamProps {
  officeEvents: OfficeEvent[];
  activityEvents: any[];
}

const CHIP_STYLES: Record<string, string> = {
  "task.assigned": "bg-status-blue/15 text-status-blue border-status-blue/30",
  "run.started": "bg-status-amber/15 text-status-amber border-status-amber/30",
  "run.completed": "bg-status-green/15 text-status-green border-status-green/30",
  "run.failed": "bg-status-red/15 text-status-red border-status-red/30",
  "artifact.submitted": "bg-status-cyan/15 text-status-cyan border-status-cyan/30",
  "review.approved": "bg-status-green/15 text-status-green border-status-green/30",
  "review.rejected": "bg-status-red/15 text-status-red border-status-red/30",
  "deploy.live": "bg-status-green/15 text-status-green border-status-green/30",
  "deploy.failed": "bg-status-red/15 text-status-red border-status-red/30",
  prompt_updated: "bg-primary/15 text-primary border-primary/30",
  auto_retry: "bg-status-red/15 text-status-red border-status-red/30",

  // activity_events style
  task_assigned: "bg-status-blue/15 text-status-blue border-status-blue/30",
  run_started: "bg-status-amber/15 text-status-amber border-status-amber/30",
  run_completed: "bg-status-green/15 text-status-green border-status-green/30",
  run_failed: "bg-status-red/15 text-status-red border-status-red/30",
  artifact_submitted: "bg-status-cyan/15 text-status-cyan border-status-cyan/30",
  review_approved: "bg-status-green/15 text-status-green border-status-green/30",
  review_rejected: "bg-status-red/15 text-status-red border-status-red/30",
  deployment_started: "bg-status-cyan/15 text-status-cyan border-status-cyan/30",
  deployment_completed: "bg-status-green/15 text-status-green border-status-green/30",
  approval_created: "bg-status-amber/15 text-status-amber border-status-amber/30",
  task_escalated: "bg-lifecycle-escalated/15 text-lifecycle-escalated border-lifecycle-escalated/30",
};

const DOT_COLORS: Record<string, string> = {
  "run.started": "bg-status-amber",
  "run.completed": "bg-status-green",
  "run.failed": "bg-status-red",
  "review.approved": "bg-status-green",
  "review.rejected": "bg-status-red",
  "deploy.live": "bg-status-green",
  "deploy.failed": "bg-status-red",
  run_started: "bg-status-amber",
  run_completed: "bg-status-green",
  run_failed: "bg-status-red",
  review_approved: "bg-status-green",
  deployment_completed: "bg-status-green",
  task_escalated: "bg-lifecycle-escalated",
};

const DEFAULT_CHIP = "bg-muted/50 text-muted-foreground border-border/50";

export function OfficeEventStream({ officeEvents, activityEvents }: OfficeEventStreamProps) {
  // Merge and sort by time, most recent first
  const merged = [
    ...officeEvents.map((e) => ({
      id: e.id,
      type: e.event_type,
      time: e.timestamp,
      source: "office" as const,
      meta: e.from_zone && e.to_zone ? `${e.from_zone} → ${e.to_zone}` : undefined,
    })),
    ...activityEvents.slice(0, 50).map((e: any) => ({
      id: e.id,
      type: e.event_type,
      time: e.created_at,
      source: "activity" as const,
      meta: `${e.entity_type} · ${e.actor_type}`,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 80);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
          Live Events
        </h2>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-status-green animate-pulse" />
          <span className="text-[7px] text-muted-foreground">Live</span>
        </div>
      </div>

      {merged.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground/20" />
          <span className="text-[8px] text-muted-foreground">Waiting for events…</span>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-1 pr-1">
          <div className="space-y-0.5">
            {merged.map((evt) => (
              <div
                key={evt.id}
                className="flex items-start gap-1.5 px-1.5 py-1 rounded hover:bg-surface-glass/30 transition-colors"
              >
                <div
                  className={`h-1.5 w-1.5 rounded-full shrink-0 mt-1 ${
                    DOT_COLORS[evt.type] ?? "bg-muted-foreground/40"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <Badge
                    variant="outline"
                    className={`text-[7px] px-1 py-0 h-3.5 font-medium border ${
                      CHIP_STYLES[evt.type] ?? DEFAULT_CHIP
                    }`}
                  >
                    {evt.type.replace(/[._]/g, " ")}
                  </Badge>
                  {evt.meta && (
                    <p className="text-[7px] text-muted-foreground mt-0.5 truncate">{evt.meta}</p>
                  )}
                </div>
                <span className="text-[7px] font-mono text-muted-foreground whitespace-nowrap shrink-0">
                  {formatDistanceToNow(new Date(evt.time), { addSuffix: false })}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
