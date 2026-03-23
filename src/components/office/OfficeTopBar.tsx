import { Activity, Bot, Stamp, Cpu, Leaf } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OfficeTopBarProps {
  activeTasks: number;
  runningAgents: number;
  pendingApprovals: number;
  providerCount: number;
  leanMode?: boolean;
}

export function OfficeTopBar({ activeTasks, runningAgents, pendingApprovals, providerCount, leanMode }: OfficeTopBarProps) {
  return (
    <div className="flex items-center gap-4 px-3 py-2 rounded-lg border bg-card">
      {leanMode && (
        <>
          <div className="flex items-center gap-1.5">
            <Leaf className="h-3.5 w-3.5 text-emerald-500" />
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
              Lean Mode
            </Badge>
          </div>
          <div className="w-px h-6 bg-border" />
        </>
      )}
      <Stat icon={<Activity className="h-3.5 w-3.5 text-primary" />} label="Active Tasks" value={activeTasks} />
      <div className="w-px h-6 bg-border" />
      <Stat icon={<Bot className="h-3.5 w-3.5 text-emerald-500" />} label="Running Agents" value={runningAgents} />
      <div className="w-px h-6 bg-border" />
      <Stat icon={<Stamp className="h-3.5 w-3.5 text-amber-500" />} label="Pending Approvals" value={pendingApprovals} />
      <div className="w-px h-6 bg-border" />
      <Stat icon={<Cpu className="h-3.5 w-3.5 text-cyan-500" />} label="Providers" value={providerCount} />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className="text-xs font-mono font-bold leading-none">{value}</p>
        <p className="text-[9px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
