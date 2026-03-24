import { Activity, Bot, Stamp, Cpu, Leaf, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { BottleneckPrediction } from "@/hooks/use-office-data";

interface OfficeTopBarProps {
  activeTasks: number;
  runningAgents: number;
  pendingApprovals: number;
  providerCount: number;
  leanMode?: boolean;
  pendingInboxCount?: number;
  roleOverloads?: BottleneckPrediction[];
}

export function OfficeTopBar({ activeTasks, runningAgents, pendingApprovals, providerCount, leanMode, pendingInboxCount = 0, roleOverloads = [] }: OfficeTopBarProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-border/50 bg-card flex-wrap">
      {leanMode && (
        <>
          <div className="flex items-center gap-1.5">
            <Leaf className="h-3.5 w-3.5 text-status-green" />
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-status-green/30 text-status-green">
              Lean
            </Badge>
          </div>
          <div className="w-px h-5 bg-border/50" />
        </>
      )}

      <Stat icon={<Activity className="h-3.5 w-3.5 text-status-cyan" />} label="Tasks" value={activeTasks} />
      <div className="w-px h-5 bg-border/50" />
      <Stat icon={<Bot className="h-3.5 w-3.5 text-status-green" />} label="Running" value={runningAgents} />
      <div className="w-px h-5 bg-border/50" />
      <Stat icon={<Stamp className="h-3.5 w-3.5 text-status-amber" />} label="Approvals" value={pendingApprovals} alert={pendingApprovals > 0} />
      <div className="w-px h-5 bg-border/50" />
      <Stat icon={<Cpu className="h-3.5 w-3.5 text-primary" />} label="Projects" value={providerCount} />

      {roleOverloads.length > 0 && (
        <>
          <div className="w-px h-5 bg-border/50" />
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-help">
                <Flame className="h-3.5 w-3.5 text-status-red animate-pulse" />
                <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
                  {roleOverloads.length} Overloaded
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs bg-card border-border">
              <div className="space-y-1">
                {roleOverloads.map(o => (
                  <p key={o.id} className="text-[10px]">{o.explanation}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value, alert }: { icon: React.ReactNode; label: string; value: number; alert?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className={`text-xs font-mono font-bold leading-none ${alert ? "text-status-amber" : ""}`}>{value}</p>
        <p className="text-[9px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
