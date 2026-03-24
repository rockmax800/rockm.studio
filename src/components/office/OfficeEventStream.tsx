import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import {
  Activity, Play, CheckCircle, XCircle, Upload, ThumbsUp, ThumbsDown,
  Stamp, AlertTriangle, Rocket, Loader2,
} from "lucide-react";
import type { OfficeEvent } from "@/hooks/use-office-data";

interface OfficeEventStreamProps {
  officeEvents: OfficeEvent[];
  activityEvents: any[];
}

const EVENT_CFG: Record<string, { dot: string; text: string; icon: typeof Activity }> = {
  "task.assigned":        { dot: "bg-status-blue",        text: "text-status-blue",       icon: Activity },
  "run.started":          { dot: "bg-status-amber",       text: "text-status-amber",      icon: Play },
  "run.completed":        { dot: "bg-status-green",       text: "text-status-green",      icon: CheckCircle },
  "run.failed":           { dot: "bg-status-red",         text: "text-status-red",        icon: XCircle },
  "artifact.submitted":   { dot: "bg-status-cyan",        text: "text-status-cyan",       icon: Upload },
  "review.approved":      { dot: "bg-status-green",       text: "text-status-green",      icon: ThumbsUp },
  "review.rejected":      { dot: "bg-status-red",         text: "text-status-red",        icon: ThumbsDown },
  "deploy.live":          { dot: "bg-status-green",       text: "text-status-green",      icon: Rocket },
  "deploy.failed":        { dot: "bg-status-red",         text: "text-status-red",        icon: XCircle },
  task_assigned:          { dot: "bg-status-blue",        text: "text-status-blue",       icon: Activity },
  run_started:            { dot: "bg-status-amber",       text: "text-status-amber",      icon: Play },
  run_completed:          { dot: "bg-status-green",       text: "text-status-green",      icon: CheckCircle },
  run_failed:             { dot: "bg-status-red",         text: "text-status-red",        icon: XCircle },
  artifact_submitted:     { dot: "bg-status-cyan",        text: "text-status-cyan",       icon: Upload },
  review_approved:        { dot: "bg-status-green",       text: "text-status-green",      icon: ThumbsUp },
  review_rejected:        { dot: "bg-status-red",         text: "text-status-red",        icon: ThumbsDown },
  deployment_started:     { dot: "bg-lifecycle-deploying", text: "text-lifecycle-deploying", icon: Rocket },
  deployment_completed:   { dot: "bg-status-green",       text: "text-status-green",      icon: Rocket },
  approval_created:       { dot: "bg-status-amber",       text: "text-status-amber",      icon: Stamp },
  task_escalated:         { dot: "bg-lifecycle-escalated", text: "text-lifecycle-escalated", icon: AlertTriangle },
};

const DEFAULT_CFG = { dot: "bg-muted-foreground", text: "text-muted-foreground", icon: Activity };

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
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[13px] font-bold text-foreground tracking-tight">Live Wall</h3>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-status-green animate-pulse" />
          <span className="text-[10px] font-bold text-status-green">Live</span>
        </div>
      </div>

      {merged.length === 0 ? (
        <div className="flex items-center gap-1.5 px-2 py-2 rounded-lg bg-secondary text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Waiting for events…</span>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-1 pr-1">
          <div className="space-y-0">
            {merged.map((evt, i) => {
              const cfg = EVENT_CFG[evt.type] ?? DEFAULT_CFG;
              const Icon = cfg.icon;
              return (
                <div
                  key={evt.id}
                  className="flex items-stretch gap-2.5 animate-fade-in cursor-pointer hover:bg-secondary/60 rounded-lg transition-colors px-1.5"
                  style={{ animationDelay: `${Math.min(i * 12, 120)}ms` }}
                >
                  {/* Timeline dot + line */}
                  <div className="flex flex-col items-center w-3 shrink-0 pt-2">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                    {i < merged.length - 1 && <div className="flex-1 w-px bg-border min-h-[6px]" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 py-1.5">
                    <div className="flex items-center gap-1">
                      <Icon className={`h-3 w-3 ${cfg.text} shrink-0`} />
                      <span className={`text-[11px] font-medium ${cfg.text} truncate`}>
                        {evt.type.replace(/[._]/g, " ")}
                      </span>
                    </div>
                    {evt.meta && (
                      <span className="text-[9px] text-muted-foreground/50 truncate block">{evt.meta}</span>
                    )}
                    <span className="text-[9px] font-mono text-muted-foreground/40">
                      {formatDistanceToNow(new Date(evt.time), { addSuffix: false })}
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
