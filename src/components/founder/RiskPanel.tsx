import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, Clock, Zap, ShieldAlert, XCircle, ExternalLink,
} from "lucide-react";

interface RiskPanelProps {
  highRiskTasks: { id: string; title: string; linkTo?: string }[];
  escalatedItems: { id: string; title: string }[];
  stalledRuns: number;
  retryLoops: { taskId: string; failedCount: number }[];
  onNavigate?: (path: string) => void;
}

export function RiskPanel({ highRiskTasks, escalatedItems, stalledRuns, retryLoops, onNavigate }: RiskPanelProps) {
  const totalIssues = highRiskTasks.length + escalatedItems.length + stalledRuns + retryLoops.length;

  if (totalIssues === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-[12px] border border-border">
        <div className="h-1.5 w-1.5 rounded-full bg-status-green" />
        <span className="text-[12px] text-status-green font-semibold">System healthy — no active risks</span>
      </div>
    );
  }

  const allItems: { icon: typeof AlertTriangle; label: string; title: string; color: string; linkTo?: string }[] = [];

  for (const t of highRiskTasks) {
    allItems.push({ icon: AlertTriangle, label: "Critical", title: t.title, color: "text-status-red", linkTo: t.linkTo });
  }
  for (const e of escalatedItems) {
    allItems.push({ icon: Zap, label: "Escalated", title: e.title, color: "text-lifecycle-escalated", linkTo: `/control/tasks/${e.id}` });
  }
  for (const r of retryLoops) {
    allItems.push({ icon: ShieldAlert, label: "Retry Loop", title: `${r.failedCount} failures · ${r.taskId.slice(0, 8)}…`, color: "text-status-red", linkTo: `/control/tasks/${r.taskId}` });
  }
  if (stalledRuns > 0) {
    allItems.push({ icon: Clock, label: "Stalled", title: `${stalledRuns} stalled run(s)`, color: "text-status-amber" });
  }

  return (
    <div className="bg-card rounded-[12px] border border-border px-4 py-2.5">
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="h-3.5 w-3.5 text-status-red" />
        <span className="text-[12px] font-bold text-foreground">System Risk</span>
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 font-bold">{totalIssues}</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5">
        {allItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              onClick={() => item.linkTo && onNavigate?.(item.linkTo)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/60 border border-border/50 ${
                item.linkTo ? "cursor-pointer hover:bg-secondary transition-colors" : ""
              }`}
            >
              <Icon className={`h-3 w-3 shrink-0 ${item.color}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${item.color} shrink-0`}>{item.label}</span>
              <span className="text-[11px] text-foreground/70 truncate flex-1">{item.title}</span>
              {item.linkTo && <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/30 shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
