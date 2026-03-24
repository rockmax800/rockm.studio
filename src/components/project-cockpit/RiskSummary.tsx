import { AlertTriangle, Clock, Stamp, Zap } from "lucide-react";

interface RiskSummaryProps {
  blockedTasks: number;
  stalledRuns: number;
  pendingApprovals: number;
  escalations: number;
  failedRuns: number;
}

export function RiskSummary({ blockedTasks, stalledRuns, pendingApprovals, escalations, failedRuns }: RiskSummaryProps) {
  const items = [
    { icon: AlertTriangle, label: "Blocked", value: blockedTasks, color: "text-status-red" },
    { icon: Clock, label: "Stalled", value: stalledRuns, color: "text-status-amber" },
    { icon: Stamp, label: "Approvals", value: pendingApprovals, color: "text-status-amber" },
    { icon: Zap, label: "Failed", value: failedRuns, color: "text-status-red" },
    { icon: AlertTriangle, label: "Escalated", value: escalations, color: "text-lifecycle-escalated" },
  ];

  const activeItems = items.filter((i) => i.value > 0);

  if (activeItems.length === 0) {
    return (
      <div className="border border-border/30 rounded-lg bg-card/30 px-2.5 py-2">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-status-green" />
          <span className="text-[9px] text-status-green font-medium">No active risks</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border/30 rounded-lg bg-card/30 px-2.5 py-2">
      <h2 className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
        Risk & Bottlenecks
      </h2>
      <div className="flex items-center gap-3 flex-wrap">
        {activeItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={`flex items-center gap-1 ${item.color}`}>
              <Icon className="h-3 w-3" />
              <span className="text-xs font-bold font-mono">{item.value}</span>
              <span className="text-[8px] opacity-70">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
