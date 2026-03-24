import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface DeliveryLaneProps {
  stages: {
    label: string;
    status: "done" | "active" | "pending" | "failed";
    timestamp?: string;
  }[];
}

const STATUS_COLORS = {
  done: "bg-status-green",
  active: "bg-status-cyan animate-pulse",
  pending: "bg-muted-foreground/30",
  failed: "bg-status-red",
};

const STATUS_TEXT = {
  done: "text-status-green",
  active: "text-status-cyan",
  pending: "text-muted-foreground/40",
  failed: "text-status-red",
};

export function DeliveryLane({ stages }: DeliveryLaneProps) {
  const completedCount = stages.filter((s) => s.status === "done").length;
  const progress = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;

  return (
    <div className="border border-border/30 rounded-lg bg-card/30 p-2.5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
          Delivery Lane
        </h2>
        <span className="text-[8px] font-mono text-muted-foreground">{progress}%</span>
      </div>

      <Progress value={progress} className="h-1 mb-2" />

      <div className="flex items-center gap-0">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex items-center flex-1 min-w-0">
            {/* Node */}
            <div className="flex flex-col items-center gap-0.5">
              <div className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[stage.status]}`} />
              <span className={`text-[7px] font-mono whitespace-nowrap ${STATUS_TEXT[stage.status]}`}>
                {stage.label}
              </span>
              {stage.status === "failed" && (
                <Badge variant="destructive" className="text-[6px] px-0.5 py-0 h-2.5">
                  ERR
                </Badge>
              )}
            </div>
            {/* Connector */}
            {i < stages.length - 1 && (
              <div className={`flex-1 h-px mx-1 ${
                stage.status === "done" ? "bg-status-green/40" : "bg-border/30"
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
