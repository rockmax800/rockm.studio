import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useSystemMode } from "@/hooks/use-system-mode";
import { useDashboardCounts } from "@/hooks/use-data";
import { AlertTriangle, Zap, Stamp, ShieldCheck } from "lucide-react";

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const { data: modeData } = useSystemMode();
  const { data: counts } = useDashboardCounts();

  return (
    <header className="h-12 flex items-center justify-between border-b border-border px-4 bg-card shrink-0">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground" />
        {title && (
          <h1 className="text-[16px] font-semibold text-foreground tracking-tight">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-4">
        {counts && (
          <div className="flex items-center gap-3 text-[13px] font-mono">
            <Pill icon={AlertTriangle} value={counts.blockedTasks} color="text-status-red" />
            <Pill icon={Zap} value={counts.failedRuns} color="text-status-red" />
            <Pill icon={Stamp} value={counts.pendingApprovals} color="text-status-amber" />
            <Pill icon={ShieldCheck} value={counts.waitingReview} color="text-status-blue" />
          </div>
        )}

        {modeData && (
          <Badge
            variant="outline"
            className={`text-[12px] font-mono font-medium px-2.5 py-0.5 h-6 border ${
              modeData.mode === "production"
                ? "border-status-green/40 text-status-green bg-status-green/5"
                : "border-status-amber/40 text-status-amber bg-status-amber/5"
            }`}
          >
            {modeData.mode === "production" ? "PROD" : "DEV"}
          </Badge>
        )}
      </div>
    </header>
  );
}

function Pill({ icon: Icon, value, color }: { icon: any; value: number; color: string }) {
  if (value === 0) return null;
  return (
    <div className={`flex items-center gap-1 ${color}`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}
