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
    { icon: AlertTriangle, label: "Blocked", value: blockedTasks, color: "text-lifecycle-blocked", bg: "bg-lifecycle-blocked" },
    { icon: Zap, label: "Failed", value: failedRuns, color: "text-status-red", bg: "bg-status-red" },
    { icon: Clock, label: "Stalled", value: stalledRuns, color: "text-status-amber", bg: "bg-status-amber" },
    { icon: Stamp, label: "Approvals", value: pendingApprovals, color: "text-status-amber", bg: "bg-status-amber" },
    { icon: AlertTriangle, label: "Escalated", value: escalations, color: "text-lifecycle-escalated", bg: "bg-lifecycle-escalated" },
  ];

  const activeItems = items.filter((i) => i.value > 0);

  if (activeItems.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-status-green/5 border border-status-green/15">
        <ShieldCheck className="h-4 w-4 text-status-green" />
        <span className="text-[13px] font-semibold text-status-green">No active risks</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-[12px] bg-card border border-border">
      {activeItems.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`h-5 w-5 rounded-md flex items-center justify-center ${item.bg}/10`}>
              <Icon className={`h-3 w-3 ${item.color}`} />
            </div>
            <span className={`text-[14px] font-bold font-mono tabular-nums ${item.color}`}>{item.value}</span>
            <span className="text-[11px] text-muted-foreground">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
