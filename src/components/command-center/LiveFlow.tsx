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

const EVENT_CFG: Record<string, { border: string; text: string; icon: typeof Activity }> = {
  task_assigned:        { border: "border-l-status-blue",       text: "text-status-blue",       icon: Activity },
  run_started:          { border: "border-l-status-amber",      text: "text-status-amber",      icon: Play },
  run_completed:        { border: "border-l-status-green",      text: "text-status-green",      icon: CheckCircle },
  run_failed:           { border: "border-l-status-red",        text: "text-status-red",        icon: XCircle },
  artifact_submitted:   { border: "border-l-status-cyan",       text: "text-status-cyan",       icon: Upload },
  review_approved:      { border: "border-l-status-green",      text: "text-status-green",      icon: ThumbsUp },
  review_rejected:      { border: "border-l-status-red",        text: "text-status-red",        icon: ThumbsDown },
  approval_created:     { border: "border-l-status-amber",      text: "text-status-amber",      icon: Stamp },
  approval_resolved:    { border: "border-l-status-green",      text: "text-status-green",      icon: CheckCircle },
  task_escalated:       { border: "border-l-lifecycle-escalated", text: "text-lifecycle-escalated", icon: AlertTriangle },
  deployment_started:   { border: "border-l-lifecycle-deploying", text: "text-lifecycle-deploying", icon: Rocket },
  deployment_completed: { border: "border-l-status-green",      text: "text-status-green",      icon: Rocket },
};

const DEFAULT_CFG = { border: "border-l-border-strong", text: "text-muted-foreground", icon: Activity };

export function LiveFlow({ events }: LiveFlowProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-section-title text-foreground">Live Flow</h3>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-status-green animate-pulse" />
          <span className="text-[12px] font-medium text-status-green">Live</span>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-secondary">
          <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
          <span className="text-[14px] text-muted-foreground">Listening for events…</span>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-2 pr-2">
          <div className="space-y-0.5">
            {events.map((evt, i) => {
              const cfg = EVENT_CFG[evt.event_type] ?? DEFAULT_CFG;
              const Icon = cfg.icon;
              return (
                <div
                  key={evt.id}
                  className={`flex items-start gap-2.5 pl-3 pr-2 py-2 rounded-r-[12px] border-l-2 ${cfg.border} hover:bg-secondary transition-colors duration-180 animate-fade-in`}
                  style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${cfg.text}`} />
                  <div className="flex-1 min-w-0">
                    <span className={`text-[13px] font-medium ${cfg.text}`}>
                      {evt.event_type.replace(/_/g, " ")}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[12px] text-muted-foreground">{evt.entity_type}</span>
                      <span className="text-[12px] text-muted-foreground/40">·</span>
                      <span className="text-[12px] text-muted-foreground">{evt.actor_type}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground tabular-nums whitespace-nowrap shrink-0 mt-0.5">
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
