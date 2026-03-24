import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Activity } from "lucide-react";

interface FlowEvent {
  id: string;
  event_type: string;
  entity_type: string;
  actor_type: string;
  created_at: string;
  project_id?: string;
}

interface LiveFlowProps {
  events: FlowEvent[];
}

const EVENT_CHIP_COLORS: Record<string, string> = {
  task_assigned: "bg-status-blue/15 text-status-blue border-status-blue/30",
  run_started: "bg-status-amber/15 text-status-amber border-status-amber/30",
  run_completed: "bg-status-green/15 text-status-green border-status-green/30",
  run_failed: "bg-status-red/15 text-status-red border-status-red/30",
  artifact_submitted: "bg-status-cyan/15 text-status-cyan border-status-cyan/30",
  review_approved: "bg-status-green/15 text-status-green border-status-green/30",
  review_rejected: "bg-status-red/15 text-status-red border-status-red/30",
  approval_created: "bg-status-amber/15 text-status-amber border-status-amber/30",
  approval_resolved: "bg-status-green/15 text-status-green border-status-green/30",
  task_escalated: "bg-lifecycle-escalated/15 text-lifecycle-escalated border-lifecycle-escalated/30",
  deployment_started: "bg-status-cyan/15 text-status-cyan border-status-cyan/30",
  deployment_completed: "bg-status-green/15 text-status-green border-status-green/30",
};

const EVENT_DOT_COLORS: Record<string, string> = {
  task_assigned: "bg-status-blue",
  run_started: "bg-status-amber",
  run_completed: "bg-status-green",
  run_failed: "bg-status-red",
  artifact_submitted: "bg-status-cyan",
  review_approved: "bg-status-green",
  review_rejected: "bg-status-red",
  approval_created: "bg-status-amber",
  approval_resolved: "bg-status-green",
  task_escalated: "bg-lifecycle-escalated",
  deployment_started: "bg-status-cyan",
  deployment_completed: "bg-status-green",
};

const DEFAULT_CHIP = "bg-muted/50 text-muted-foreground border-border/50";

export function LiveFlow({ events }: LiveFlowProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Live Flow
        </h2>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-status-green animate-pulse" />
          <span className="text-[8px] text-muted-foreground">Live</span>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 border border-dashed border-border/50 rounded-lg p-6">
          <Activity className="h-5 w-5 text-muted-foreground/30" />
          <p className="text-[10px] text-muted-foreground text-center">Waiting for events…</p>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-1 pr-1">
          <div className="space-y-0.5">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-surface-glass/40 transition-colors"
              >
                <div
                  className={`h-1.5 w-1.5 rounded-full shrink-0 mt-1.5 ${
                    EVENT_DOT_COLORS[evt.event_type] ?? "bg-muted-foreground"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <Badge
                    variant="outline"
                    className={`text-[8px] px-1.5 py-0 h-4 font-medium border ${
                      EVENT_CHIP_COLORS[evt.event_type] ?? DEFAULT_CHIP
                    }`}
                  >
                    {evt.event_type.replace(/_/g, " ")}
                  </Badge>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[7px] text-muted-foreground">{evt.entity_type}</span>
                    <span className="text-[7px] text-muted-foreground/50">·</span>
                    <span className="text-[7px] text-muted-foreground">{evt.actor_type}</span>
                  </div>
                </div>
                <span className="text-[8px] font-mono text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                  {formatDistanceToNow(new Date(evt.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
