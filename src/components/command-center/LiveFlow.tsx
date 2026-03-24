import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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

const EVENT_CONFIG: Record<string, { chip: string; dot: string; icon: typeof Activity }> = {
  task_assigned: { chip: "bg-status-blue/15 text-status-blue border-status-blue/30", dot: "bg-status-blue", icon: Activity },
  run_started: { chip: "bg-status-amber/15 text-status-amber border-status-amber/30", dot: "bg-status-amber", icon: Play },
  run_completed: { chip: "bg-status-green/15 text-status-green border-status-green/30", dot: "bg-status-green", icon: CheckCircle },
  run_failed: { chip: "bg-status-red/15 text-status-red border-status-red/30", dot: "bg-status-red", icon: XCircle },
  artifact_submitted: { chip: "bg-status-cyan/15 text-status-cyan border-status-cyan/30", dot: "bg-status-cyan", icon: Upload },
  review_approved: { chip: "bg-status-green/15 text-status-green border-status-green/30", dot: "bg-status-green", icon: ThumbsUp },
  review_rejected: { chip: "bg-status-red/15 text-status-red border-status-red/30", dot: "bg-status-red", icon: ThumbsDown },
  approval_created: { chip: "bg-status-amber/15 text-status-amber border-status-amber/30", dot: "bg-status-amber", icon: Stamp },
  approval_resolved: { chip: "bg-status-green/15 text-status-green border-status-green/30", dot: "bg-status-green", icon: CheckCircle },
  task_escalated: { chip: "bg-lifecycle-escalated/15 text-lifecycle-escalated border-lifecycle-escalated/30", dot: "bg-lifecycle-escalated", icon: AlertTriangle },
  deployment_started: { chip: "bg-status-cyan/15 text-status-cyan border-status-cyan/30", dot: "bg-status-cyan", icon: Rocket },
  deployment_completed: { chip: "bg-status-green/15 text-status-green border-status-green/30", dot: "bg-status-green", icon: Rocket },
};

const DEFAULT_CONFIG = { chip: "bg-muted/50 text-muted-foreground border-border/50", dot: "bg-muted-foreground", icon: Activity };

export function LiveFlow({ events }: LiveFlowProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">
          Live Flow
        </h2>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-status-green animate-pulse" />
          <span className="text-[8px] text-status-green font-medium">Live</span>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 text-muted-foreground/30 animate-spin" />
          <p className="text-[10px] text-muted-foreground animate-pulse">Listening for events…</p>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-1 pr-1">
          <div className="space-y-0.5">
            {events.map((evt, i) => {
              const cfg = EVENT_CONFIG[evt.event_type] ?? DEFAULT_CONFIG;
              const Icon = cfg.icon;
              return (
                <div
                  key={evt.id}
                  className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-surface-glass/40 transition-colors animate-fade-in"
                  style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                >
                  <Icon className={`h-3 w-3 shrink-0 mt-0.5 ${cfg.chip.split(" ")[1] ?? "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <Badge
                      variant="outline"
                      className={`text-[8px] px-1.5 py-0 h-4 font-semibold border ${cfg.chip}`}
                    >
                      {evt.event_type.replace(/_/g, " ")}
                    </Badge>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[7px] text-muted-foreground font-medium">{evt.entity_type}</span>
                      <span className="text-[7px] text-muted-foreground/40">·</span>
                      <span className="text-[7px] text-muted-foreground">{evt.actor_type}</span>
                    </div>
                  </div>
                  <span className="text-[8px] font-mono text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
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
