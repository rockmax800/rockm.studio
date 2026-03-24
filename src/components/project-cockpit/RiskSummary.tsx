import { AlertTriangle, Clock, Stamp, Zap, ShieldCheck } from "lucide-react";

interface RiskSummaryProps {
  blockedTasks: number;
  stalledRuns: number;
  pendingApprovals: number;
  escalations: number;
  failedRuns: number;
}

export function RiskSummary({ blockedTasks, stalledRuns, pendingApprovals, escalations, failedRuns }: RiskSummaryProps) {
  const items = [
    { icon: AlertTriangle, label: "Blocked", value: blockedTasks, color: "text-status-red", bg: "bg-status-red/8" },
    { icon: Clock, label: "Stalled", value: stalledRuns, color: "text-status-amber", bg: "bg-status-amber/8" },
    { icon: Stamp, label: "Approvals", value: pendingApprovals, color: "text-status-amber", bg: "bg-status-amber/8" },
    { icon: Zap, label: "Failed Runs", value: failedRuns, color: "text-status-red", bg: "bg-status-red/8" },
    { icon: AlertTriangle, label: "Escalated", value: escalations, color: "text-lifecycle-escalated", bg: "bg-lifecycle-escalated/8" },
  ];

  const activeItems = items.filter((i) => i.value > 0);

  return (
    <div>
      <h3 className="text-card-title text-foreground mb-3">Risk & Bottlenecks</h3>

      {activeItems.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary">
          <ShieldCheck className="h-4 w-4 text-status-green" />
          <span className="text-[14px] font-medium text-status-green">No active risks</span>
        </div>
      ) : (
        <div className="space-y-2">
          {activeItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${item.bg} border border-border`}>
                <Icon className={`h-4 w-4 ${item.color}`} />
                <span className={`text-[14px] font-medium flex-1 ${item.color}`}>{item.label}</span>
                <span className={`text-[16px] font-bold font-mono tabular-nums ${item.color}`}>{item.value}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
