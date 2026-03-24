import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { OfficeEvent } from "@/hooks/use-office-data";

const EVENT_DOTS: Record<string, string> = {
  "task.assigned": "bg-status-blue",
  "run.started": "bg-status-amber",
  "artifact.submitted": "bg-status-cyan",
  "review.approved": "bg-status-green",
  "review.rejected": "bg-destructive",
  "auto_retry": "bg-destructive",
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
      <div className="flex items-center gap-0.5 mb-2 p-0.5 rounded-lg bg-muted/30">
        <button
          className={`flex-1 px-2 py-1 text-[9px] font-medium rounded-md transition-colors ${
            feedMode === "office"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground/50 hover:text-foreground"
          }`}
          onClick={() => onFeedModeChange("office")}
        >
          Events
        </button>
        <button
          className={`flex-1 px-2 py-1 text-[9px] font-medium rounded-md transition-colors ${
            feedMode === "activity"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground/50 hover:text-foreground"
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
                <div key={e.id} className="rounded-lg border border-border/20 bg-card p-2 hover:bg-secondary/20 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${EVENT_DOTS[e.event_type] ?? "bg-muted-foreground/20"}`} />
                    <p className="text-[10px] font-medium text-foreground truncate">
                      {e.event_type}
                    </p>
                  </div>
                  {e.from_zone && e.to_zone && (
                    <div className="flex items-center gap-1 mt-1 ml-3">
                      <span className="text-[8px] text-muted-foreground/40 font-mono">{e.from_zone}</span>
                      <ArrowRight className="h-2 w-2 text-muted-foreground/20" />
                      <span className="text-[8px] text-muted-foreground/40 font-mono">{e.to_zone}</span>
                    </div>
                  )}
                  <span className="text-[8px] text-muted-foreground/30 mt-0.5 block ml-3">
                    {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-muted-foreground/30 text-center py-6">Waiting for events…</p>
            )
          ) : (
            activityEvents.length > 0 ? (
              activityEvents.map((e: any) => (
                <div key={e.id} className="rounded-lg border border-border/20 bg-card p-2 hover:bg-secondary/20 transition-colors">
                  <p className="text-[10px] font-medium text-foreground">{e.event_type}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[8px] text-muted-foreground/40">{e.entity_type} · {e.actor_type}</span>
                    <span className="text-[8px] text-muted-foreground/30">
                      {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-muted-foreground/30 text-center py-6">No activity</p>
            )
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
