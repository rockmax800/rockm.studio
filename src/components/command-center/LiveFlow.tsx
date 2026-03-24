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

const EVENT_CFG: Record<string, { bg: string; text: string; icon: typeof Activity }> = {
  task_assigned:        { bg: "bg-status-blue/10",              text: "text-status-blue",       icon: Activity },
  run_started:          { bg: "bg-status-amber/10",             text: "text-status-amber",      icon: Play },
  run_completed:        { bg: "bg-status-green/10",             text: "text-status-green",      icon: CheckCircle },
  run_failed:           { bg: "bg-status-red/10",               text: "text-status-red",        icon: XCircle },
  artifact_submitted:   { bg: "bg-status-cyan/10",              text: "text-status-cyan",       icon: Upload },
  review_approved:      { bg: "bg-status-green/10",             text: "text-status-green",      icon: ThumbsUp },
  review_rejected:      { bg: "bg-status-red/10",               text: "text-status-red",        icon: ThumbsDown },
  approval_created:     { bg: "bg-status-amber/10",             text: "text-status-amber",      icon: Stamp },
  approval_resolved:    { bg: "bg-status-green/10",             text: "text-status-green",      icon: CheckCircle },
  task_escalated:       { bg: "bg-lifecycle-escalated/10",      text: "text-lifecycle-escalated", icon: AlertTriangle },
  deployment_started:   { bg: "bg-lifecycle-deploying/10",      text: "text-lifecycle-deploying", icon: Rocket },
  deployment_completed: { bg: "bg-status-green/10",             text: "text-status-green",      icon: Rocket },
};

const DEFAULT_CFG = { bg: "bg-muted", text: "text-muted-foreground", icon: Activity };

export function LiveFlow({ events }: LiveFlowProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-bold text-foreground tracking-tight">Live Flow</h3>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-status-green animate-pulse" />
          <span className="text-[11px] font-semibold text-status-green">Live</span>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="flex items-center gap-1.5 px-2 py-2 rounded-lg bg-secondary text-[12px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Listening…</span>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-1 pr-1">
          <div className="space-y-px">
            {events.map((evt, i) => {
              const cfg = EVENT_CFG[evt.event_type] ?? DEFAULT_CFG;
              const Icon = cfg.icon;
              return (
                <div
                  key={evt.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-card transition-colors duration-150 animate-fade-in cursor-pointer"
                  style={{ animationDelay: `${Math.min(i * 15, 150)}ms` }}
                >
                  <div className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon className={`h-3 w-3 ${cfg.text}`} />
                  </div>
                  <span className={`text-[12px] font-medium ${cfg.text} truncate flex-1`}>
                    {evt.event_type.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground tabular-nums whitespace-nowrap shrink-0">
                    {formatDistanceToNow(new Date(evt.created_at), { addSuffix: true })}
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
