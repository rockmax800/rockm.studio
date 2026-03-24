import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  Play,
  CheckCircle,
  XCircle,
  Upload,
  ThumbsUp,
  ThumbsDown,
  Stamp,
  AlertTriangle,
  Rocket,
  Loader2,
} from "lucide-react";

interface TimelineEvent {
  id: string;
  event_type: string;
  entity_type: string;
  actor_type: string;
  created_at: string;
}

interface ActivityTimelineProps {
  events: TimelineEvent[];
}

const EVENT_CFG: Record<string, { dot: string; text: string; icon: typeof Activity }> = {
  task_assigned:        { dot: "bg-status-blue",        text: "text-status-blue",       icon: Activity },
  run_started:          { dot: "bg-status-amber",       text: "text-status-amber",      icon: Play },
  run_completed:        { dot: "bg-status-green",       text: "text-status-green",      icon: CheckCircle },
  run_failed:           { dot: "bg-status-red",         text: "text-status-red",        icon: XCircle },
  artifact_submitted:   { dot: "bg-status-cyan",        text: "text-status-cyan",       icon: Upload },
  review_approved:      { dot: "bg-status-green",       text: "text-status-green",      icon: ThumbsUp },
  review_rejected:      { dot: "bg-status-red",         text: "text-status-red",        icon: ThumbsDown },
  approval_created:     { dot: "bg-status-amber",       text: "text-status-amber",      icon: Stamp },
  approval_resolved:    { dot: "bg-status-green",       text: "text-status-green",      icon: CheckCircle },
  task_escalated:       { dot: "bg-lifecycle-escalated", text: "text-lifecycle-escalated", icon: AlertTriangle },
  deployment_started:   { dot: "bg-lifecycle-deploying", text: "text-lifecycle-deploying", icon: Rocket },
  deployment_completed: { dot: "bg-status-green",       text: "text-status-green",      icon: Rocket },
};

const DEFAULT_CFG = { dot: "bg-muted-foreground", text: "text-muted-foreground", icon: Activity };

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  return (
    <div className="flex flex-col h-full">
      <h3 className="text-[18px] font-bold text-foreground tracking-tight mb-3">Activity & Handoffs</h3>

      {events.length === 0 ? (
        <div className="flex items-center gap-1.5 px-2 py-2 rounded-lg bg-secondary text-[12px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>No activity yet</span>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-1 pr-1">
          <div className="space-y-0">
            {events.map((evt, i) => {
              const cfg = EVENT_CFG[evt.event_type] ?? DEFAULT_CFG;
              const Icon = cfg.icon;
              return (
                <div key={evt.id} className="flex items-stretch gap-3">
                  {/* Timeline column */}
                  <div className="flex flex-col items-center w-4 shrink-0">
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1.5 ${cfg.dot}`} />
                    {i < events.length - 1 && (
                      <div className="flex-1 w-px bg-border min-h-[8px]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-2 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-3 w-3 ${cfg.text} shrink-0`} />
                      <span className={`text-[12px] font-medium ${cfg.text} truncate`}>
                        {evt.event_type.replace(/_/g, " ")}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {formatDistanceToNow(new Date(evt.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
