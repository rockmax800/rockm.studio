import { Progress } from "@/components/ui/progress";

interface DeliveryLaneProps {
  stages: {
    label: string;
    status: "done" | "active" | "pending" | "failed";
    timestamp?: string;
  }[];
}

const STATUS_DOT = {
  done: "bg-status-green",
  active: "bg-status-cyan animate-pulse",
  pending: "bg-muted",
  failed: "bg-status-red",
};

const STATUS_TEXT = {
  done: "text-status-green",
  active: "text-status-cyan",
  pending: "text-muted-foreground/50",
  failed: "text-status-red",
};

const STATUS_LABEL = {
  done: "Complete",
  active: "Active",
  pending: "Pending",
  failed: "Failed",
};

export function DeliveryLane({ stages }: DeliveryLaneProps) {
  const completedCount = stages.filter((s) => s.status === "done").length;
  const progress = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-card-title text-foreground">Delivery Lane</h3>
        <span className="text-[13px] font-mono font-bold text-muted-foreground">{progress}%</span>
      </div>

      <Progress value={progress} className="h-1.5 mb-4" />

      {/* Vertical lane */}
      <div className="flex-1 flex flex-col gap-0">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex items-stretch gap-3">
            {/* Timeline column */}
            <div className="flex flex-col items-center w-4 shrink-0">
              <div className={`h-3 w-3 rounded-full shrink-0 ${STATUS_DOT[stage.status]}`} />
              {i < stages.length - 1 && (
                <div className={`flex-1 w-px min-h-[16px] ${
                  stage.status === "done" ? "bg-status-green/30" : "bg-border"
                }`} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-3">
              <div className="flex items-center gap-2">
                <span className={`text-[14px] font-medium ${
                  stage.status === "pending" ? "text-muted-foreground/50" : "text-foreground"
                }`}>
                  {stage.label}
                </span>
                {stage.status === "failed" && (
                  <span className="ds-badge bg-status-red/10 text-status-red text-[10px]">ERR</span>
                )}
              </div>
              <span className={`text-[11px] font-mono ${STATUS_TEXT[stage.status]}`}>
                {STATUS_LABEL[stage.status]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
