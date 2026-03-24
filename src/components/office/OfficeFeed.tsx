import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { OfficeEvent } from "@/hooks/use-office-data";

const EVENT_COLORS: Record<string, string> = {
  "task.assigned": "text-status-blue",
  "run.started": "text-status-amber",
  "artifact.submitted": "text-status-cyan",
  "review.approved": "text-status-green",
  "review.rejected": "text-status-red",
  "prompt_updated": "text-primary",
  "adaptive_route": "text-lifecycle-escalated",
  "auto_retry": "text-status-red",
  "dual_validation_failed": "text-status-red",
  "prompt_experiment_started": "text-lifecycle-review",
  "prompt_suggestion_generated": "text-lifecycle-review",
};

const EVENT_DOTS: Record<string, string> = {
  "task.assigned": "bg-status-blue",
  "run.started": "bg-status-amber",
  "artifact.submitted": "bg-status-cyan",
  "review.approved": "bg-status-green",
  "review.rejected": "bg-status-red",
  "auto_retry": "bg-status-red",
};

interface OfficeFeedProps {
  officeEvents: OfficeEvent[];
  activityEvents: any[];
  feedMode: "office" | "activity";
  onFeedModeChange: (mode: "office" | "activity") => void;
}

export function OfficeFeed({ officeEvents, activityEvents, feedMode, onFeedModeChange }: OfficeFeedProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-0.5 mb-2 p-0.5 rounded bg-muted/50">
        <button
          className={`flex-1 px-2 py-1 text-[9px] font-medium rounded transition-colors ${
            feedMode === "office"
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => onFeedModeChange("office")}
        >
          Events
        </button>
        <button
          className={`flex-1 px-2 py-1 text-[9px] font-medium rounded transition-colors ${
            feedMode === "activity"
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => onFeedModeChange("activity")}
        >
          Activity
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-0.5 pr-1">
          {feedMode === "office" ? (
            officeEvents.length > 0 ? (
              officeEvents.map((e) => (
                <div key={e.id} className="rounded border border-border/30 bg-card p-2 hover:bg-surface-glass transition-colors">
                  <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${EVENT_DOTS[e.event_type] ?? "bg-muted-foreground"}`} />
                    <p className={`text-[10px] font-medium truncate ${EVENT_COLORS[e.event_type] ?? "text-foreground"}`}>
                      {e.event_type}
                    </p>
                  </div>
                  {e.from_zone && e.to_zone && (
                    <div className="flex items-center gap-1 mt-1 ml-3">
                      <Badge variant="outline" className="text-[7px] px-0.5 py-0 h-3 border-border/50">{e.from_zone}</Badge>
                      <ArrowRight className="h-2 w-2 text-muted-foreground" />
                      <Badge variant="outline" className="text-[7px] px-0.5 py-0 h-3 border-border/50">{e.to_zone}</Badge>
                    </div>
                  )}
                  <span className="text-[8px] text-muted-foreground mt-0.5 block ml-3">
                    {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-muted-foreground text-center py-6">Waiting for events…</p>
            )
          ) : (
            activityEvents.length > 0 ? (
              activityEvents.map((e: any) => (
                <div key={e.id} className="rounded border border-border/30 bg-card p-2 hover:bg-surface-glass transition-colors">
                  <p className="text-[10px] font-medium">{e.event_type}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[8px] text-muted-foreground">{e.entity_type} · {e.actor_type}</span>
                    <span className="text-[8px] text-muted-foreground">
                      {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-muted-foreground text-center py-6">No activity</p>
            )
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
