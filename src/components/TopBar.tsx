import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useSystemMode } from "@/hooks/use-system-mode";
import { useDashboardCounts } from "@/hooks/use-data";
import { AlertTriangle, Zap, ShieldCheck, Stamp } from "lucide-react";

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const { data: modeData } = useSystemMode();
  const { data: counts } = useDashboardCounts();

  return (
    <header className="h-10 flex items-center justify-between border-b border-border/50 px-3 bg-surface-overlay shrink-0">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="h-7 w-7 text-muted-foreground" />
        {title && (
          <h1 className="text-xs font-semibold tracking-tight text-foreground">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Live counters */}
        {counts && (
          <div className="flex items-center gap-2.5 text-[10px] font-mono">
            <CounterPill
              icon={<AlertTriangle className="h-3 w-3" />}
              value={counts.blockedTasks}
              color="destructive"
            />
            <CounterPill
              icon={<Zap className="h-3 w-3" />}
              value={counts.failedRuns}
              color="destructive"
            />
            <CounterPill
              icon={<Stamp className="h-3 w-3" />}
              value={counts.pendingApprovals}
              color="amber"
            />
            <CounterPill
              icon={<ShieldCheck className="h-3 w-3" />}
              value={counts.waitingReview}
              color="cyan"
            />
          </div>
        )}

        {/* System mode */}
        {modeData && (
          <Badge
            variant="outline"
            className={`text-[9px] font-mono px-2 py-0 h-5 border ${
              modeData.mode === "production"
                ? "border-status-green/40 text-status-green bg-status-green/5"
                : "border-status-amber/40 text-status-amber bg-status-amber/5"
            }`}
          >
            {modeData.mode === "production" ? "PROD" : "EXP"}
          </Badge>
        )}
      </div>
    </header>
  );
}

function CounterPill({
  icon,
  value,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  color: "destructive" | "amber" | "cyan";
}) {
  if (value === 0) return null;

  const colorMap = {
    destructive: "text-status-red",
    amber: "text-status-amber",
    cyan: "text-status-cyan",
  };

  return (
    <div className={`flex items-center gap-1 ${colorMap[color]}`}>
      {icon}
      <span className="font-bold">{value}</span>
    </div>
  );
}
