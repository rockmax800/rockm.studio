import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import {
  Activity, Play, CheckCircle, XCircle, Upload, ThumbsUp, ThumbsDown,
  Stamp, AlertTriangle, Rocket, Loader2, ArrowRight, GitPullRequest,
} from "lucide-react";
import type { OfficeEvent } from "@/hooks/use-office-data";

interface OfficeEventStreamProps {
  officeEvents: OfficeEvent[];
  activityEvents: any[];
}

const EVENT_CFG: Record<string, { dot: string; text: string; icon: typeof Activity; label: string }> = {
  "task.assigned":        { dot: "bg-blue-500",    text: "text-blue-600",    icon: Activity,       label: "Task Assigned" },
  "run.started":          { dot: "bg-amber-500",   text: "text-amber-600",   icon: Play,           label: "Run Started" },
  "run.completed":        { dot: "bg-green-500",   text: "text-green-600",   icon: CheckCircle,    label: "Run Completed" },
  "run.failed":           { dot: "bg-red-500",     text: "text-red-600",     icon: XCircle,        label: "Run Failed" },
  "artifact.submitted":   { dot: "bg-cyan-500",    text: "text-cyan-600",    icon: Upload,         label: "Artifact Submitted" },
  "review.approved":      { dot: "bg-green-500",   text: "text-green-600",   icon: ThumbsUp,       label: "Review Approved" },
  "review.rejected":      { dot: "bg-red-500",     text: "text-red-600",     icon: ThumbsDown,     label: "Review Rejected" },
  "deploy.live":          { dot: "bg-green-500",   text: "text-green-600",   icon: Rocket,         label: "Deploy Live" },
  "deploy.failed":        { dot: "bg-red-500",     text: "text-red-600",     icon: XCircle,        label: "Deploy Failed" },
  task_assigned:          { dot: "bg-blue-500",    text: "text-blue-600",    icon: Activity,       label: "Task Assigned" },
  run_started:            { dot: "bg-amber-500",   text: "text-amber-600",   icon: Play,           label: "Run Started" },
  run_completed:          { dot: "bg-green-500",   text: "text-green-600",   icon: CheckCircle,    label: "Run Completed" },
  run_failed:             { dot: "bg-red-500",     text: "text-red-600",     icon: XCircle,        label: "Run Failed" },
  artifact_submitted:     { dot: "bg-cyan-500",    text: "text-cyan-600",    icon: Upload,         label: "Artifact Submitted" },
  review_approved:        { dot: "bg-green-500",   text: "text-green-600",   icon: ThumbsUp,       label: "Review Approved" },
  review_rejected:        { dot: "bg-red-500",     text: "text-red-600",     icon: ThumbsDown,     label: "Review Rejected" },
  deployment_started:     { dot: "bg-indigo-500",  text: "text-indigo-600",  icon: Rocket,         label: "Deploy Started" },
  deployment_completed:   { dot: "bg-green-500",   text: "text-green-600",   icon: Rocket,         label: "Deploy Completed" },
  approval_created:       { dot: "bg-amber-500",   text: "text-amber-600",   icon: Stamp,          label: "Approval Created" },
  task_escalated:         { dot: "bg-pink-600",    text: "text-pink-600",    icon: AlertTriangle,  label: "Task Escalated" },
  handoff_created:        { dot: "bg-blue-400",    text: "text-blue-500",    icon: ArrowRight,     label: "Handoff Created" },
  pr_created:             { dot: "bg-violet-500",  text: "text-violet-600",  icon: GitPullRequest, label: "PR Created" },
};

const DEFAULT_CFG = { dot: "bg-muted-foreground", text: "text-muted-foreground", icon: Activity, label: "Event" };

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
        <h3 className="text-[15px] font-bold text-foreground tracking-tight">Live Flow</h3>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[11px] font-bold text-green-600">Live</span>
        </div>
      </div>

      {merged.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-secondary/50 text-[13px] text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
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
                  className="flex items-stretch gap-3 animate-fade-in hover:bg-secondary/30 rounded-lg transition-colors px-2 py-0.5"
                  style={{ animationDelay: `${Math.min(i * 12, 120)}ms` }}
                >
                  {/* Timeline dot + line */}
                  <div className="flex flex-col items-center w-3 shrink-0 pt-2.5">
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                    {i < merged.length - 1 && <div className="flex-1 w-px bg-border/40 min-h-[8px]" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 py-2">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-3.5 w-3.5 ${cfg.text} shrink-0`} />
                      <span className={`text-[12px] font-semibold ${cfg.text} truncate`}>
                        {cfg.label}
                      </span>
                    </div>
                    {evt.meta && (
                      <span className="text-[11px] text-muted-foreground/50 truncate block mt-0.5">{evt.meta}</span>
                    )}
                    <span className="text-[10px] font-mono text-muted-foreground/40 mt-0.5 block">
                      {formatDistanceToNow(new Date(evt.time), { addSuffix: true })}
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
