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
    <div className="flex items-center gap-4 px-3 py-2 rounded-lg border bg-card flex-wrap">
      {/* Founder presence */}
      <div className="relative flex items-center gap-1.5">
        <img src="/pixel/founder.png" alt="Founder" className="w-7 h-7 rounded" style={{ imageRendering: "pixelated" }} />
        {pendingInboxCount > 0 && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center animate-pulse">
            {pendingInboxCount > 9 ? "9+" : pendingInboxCount}
          </span>
        )}
        <span className="text-[9px] font-medium text-muted-foreground">Founder</span>
      </div>
      <div className="w-px h-6 bg-border" />

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

      {/* PART 8 — Role overload heat indicators */}
      {roleOverloads.length > 0 && (
        <>
          <div className="w-px h-6 bg-border" />
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-help">
                <Flame className="h-3.5 w-3.5 text-destructive animate-pulse" />
                <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
                  {roleOverloads.length} Overloaded
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-1">
                {roleOverloads.map(o => (
                  <p key={o.id} className="text-xs">{o.explanation}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </>
      )}
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
