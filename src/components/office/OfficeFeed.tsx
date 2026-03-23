import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { OfficeEvent } from "@/hooks/use-office-data";

const EVENT_COLORS: Record<string, string> = {
  "task.assigned": "text-blue-500",
  "run.started": "text-yellow-500",
  "artifact.submitted": "text-cyan-500",
  "review.approved": "text-green-500",
  "prompt_updated": "text-indigo-500",
  "adaptive_route": "text-orange-500",
  "auto_retry": "text-red-400",
  "dual_validation_failed": "text-red-500",
  "prompt_experiment_started": "text-purple-500",
  "prompt_suggestion_generated": "text-pink-500",
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
      <div className="flex items-center gap-1 mb-2">
        <button
          className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
            feedMode === "office"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => onFeedModeChange("office")}
        >
          Events
        </button>
        <button
          className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
            feedMode === "activity"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => onFeedModeChange("activity")}
        >
          Activity
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 pr-1">
          {feedMode === "office" ? (
            officeEvents.length > 0 ? (
              officeEvents.map((e) => (
                <div key={e.id} className="rounded border bg-card p-2">
                  <p className={`text-[10px] font-medium ${EVENT_COLORS[e.event_type] ?? "text-foreground"}`}>
                    {e.event_type}
                  </p>
                  {e.from_zone && e.to_zone && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge variant="outline" className="text-[8px] px-1 py-0 h-3">{e.from_zone}</Badge>
                      <ArrowRight className="h-2 w-2 text-muted-foreground" />
                      <Badge variant="outline" className="text-[8px] px-1 py-0 h-3">{e.to_zone}</Badge>
                    </div>
                  )}
                  <span className="text-[8px] text-muted-foreground mt-0.5 block">
                    {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-muted-foreground text-center py-4">No events yet</p>
            )
          ) : (
            activityEvents.length > 0 ? (
              activityEvents.map((e: any) => (
                <div key={e.id} className="rounded border bg-card p-2">
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
              <p className="text-[10px] text-muted-foreground text-center py-4">No activity</p>
            )
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
