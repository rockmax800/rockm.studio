import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Clock, Zap, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";

interface RiskPanelProps {
  highRiskTasks: { id: string; title: string }[];
  escalatedItems: { id: string; title: string }[];
  stalledRuns: number;
  retryLoops: { taskId: string; failedCount: number }[];
}

export function RiskPanel({ highRiskTasks, escalatedItems, stalledRuns, retryLoops }: RiskPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const totalIssues = highRiskTasks.length + escalatedItems.length + stalledRuns + retryLoops.length;

  if (totalIssues === 0) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-sunken border border-border/30 rounded-lg">
        <div className="h-1.5 w-1.5 rounded-full bg-status-green" />
        <span className="text-[9px] text-status-green font-medium">No active risks</span>
      </div>
    );
  }

  return (
    <div className="bg-surface-sunken border border-border/30 rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-glass/30 transition-colors rounded-lg"
      >
        <ShieldAlert className="h-3 w-3 text-status-red" />
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Risks</span>
        <Badge variant="destructive" className="text-[7px] px-1 py-0 h-3">{totalIssues}</Badge>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {highRiskTasks.length > 0 && <RiskChip icon={<AlertTriangle className="h-2.5 w-2.5" />} value={highRiskTasks.length} color="text-status-red" />}
          {escalatedItems.length > 0 && <RiskChip icon={<Zap className="h-2.5 w-2.5" />} value={escalatedItems.length} color="text-lifecycle-escalated" />}
          {stalledRuns > 0 && <RiskChip icon={<Clock className="h-2.5 w-2.5" />} value={stalledRuns} color="text-status-amber" />}
          {retryLoops.length > 0 && <RiskChip icon={<ShieldAlert className="h-2.5 w-2.5" />} value={retryLoops.length} color="text-status-red" />}
        </div>

        {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-3 pb-2 pt-1 border-t border-border/20">
          <ScrollArea className="max-h-32">
            <div className="space-y-0.5">
              {highRiskTasks.map((t) => (
                <RiskRow key={t.id} label="High Risk" title={t.title} color="text-status-red" />
              ))}
              {escalatedItems.map((e) => (
                <RiskRow key={e.id} label="Escalated" title={e.title} color="text-lifecycle-escalated" />
              ))}
              {retryLoops.map((r) => (
                <RiskRow key={r.taskId} label="Retry Loop" title={`${r.failedCount} failures · ${r.taskId.slice(0, 8)}…`} color="text-status-red" />
              ))}
              {stalledRuns > 0 && (
                <RiskRow label="Stalled" title={`${stalledRuns} stalled run(s)`} color="text-status-amber" />
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

function RiskChip({ icon, value, color }: { icon: React.ReactNode; value: number; color: string }) {
  return (
    <div className={`flex items-center gap-0.5 ${color}`}>
      {icon}
      <span className="text-[8px] font-mono font-bold">{value}</span>
    </div>
  );
}

function RiskRow({ label, title, color }: { label: string; title: string; color: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className={`text-[7px] font-semibold uppercase ${color}`}>{label}</span>
      <span className="text-[8px] text-foreground/70 truncate">{title}</span>
    </div>
  );
}
