import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import {
  Activity, Play, CheckCircle, XCircle, Upload,
  ThumbsUp, ThumbsDown, Stamp, AlertTriangle, Rocket, Loader2,
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

const EVENT_CFG: Record<string, { dot: string; text: string; icon: typeof Activity; label: string }> = {
  task_assigned:        { dot: "bg-status-blue",          text: "text-status-blue",          icon: Activity,       label: "Task Assigned" },
  run_started:          { dot: "bg-status-amber",         text: "text-status-amber",         icon: Play,           label: "Run Started" },
  run_completed:        { dot: "bg-status-green",         text: "text-status-green",         icon: CheckCircle,    label: "Run Completed" },
  run_failed:           { dot: "bg-destructive",          text: "text-destructive",          icon: XCircle,        label: "Run Failed" },
  artifact_submitted:   { dot: "bg-status-cyan",          text: "text-status-cyan",          icon: Upload,         label: "Artifact Submitted" },
  review_approved:      { dot: "bg-status-green",         text: "text-status-green",         icon: ThumbsUp,       label: "Review Approved" },
  review_rejected:      { dot: "bg-destructive",          text: "text-destructive",          icon: ThumbsDown,     label: "Review Rejected" },
  approval_created:     { dot: "bg-status-amber",         text: "text-status-amber",         icon: Stamp,          label: "Approval Created" },
  approval_resolved:    { dot: "bg-status-green",         text: "text-status-green",         icon: CheckCircle,    label: "Approval Resolved" },
  task_escalated:       { dot: "bg-lifecycle-escalated",   text: "text-lifecycle-escalated",  icon: AlertTriangle,  label: "Task Escalated" },
  deployment_started:   { dot: "bg-lifecycle-deploying",   text: "text-lifecycle-deploying",  icon: Rocket,         label: "Deploy Started" },
  deployment_completed: { dot: "bg-status-green",         text: "text-status-green",         icon: Rocket,         label: "Deploy Completed" },
};

const DEFAULT_CFG = { dot: "bg-muted-foreground/30", text: "text-muted-foreground", icon: Activity, label: "Event" };

export function LiveFlow({ events }: LiveFlowProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-bold text-foreground tracking-tight">Live Events</h3>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-status-green animate-pulse" />
          <span className="text-[11px] font-bold text-status-green">Live</span>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary/50 text-[12px] text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Listening for events…</span>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-1 pr-1">
          <div className="space-y-0">
            {events.map((evt, i) => {
              const cfg = EVENT_CFG[evt.event_type] ?? DEFAULT_CFG;
              const Icon = cfg.icon;
              return (
                <div
                  key={evt.id}
                  className="flex items-stretch gap-3 animate-fade-in hover:bg-card/50 rounded-lg transition-colors px-1.5 py-0.5"
                  style={{ animationDelay: `${Math.min(i * 12, 120)}ms` }}
                >
                  {/* Timeline */}
                  <div className="flex flex-col items-center w-3 shrink-0 pt-2.5">
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                    {i < events.length - 1 && <div className="flex-1 w-px bg-border/50 min-h-[6px]" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-3 w-3 ${cfg.text} shrink-0`} />
                      <span className={`text-[12px] font-semibold ${cfg.text} truncate`}>
                        {cfg.label}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground/40 block mt-0.5">
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
