import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Stamp,
  AlertTriangle,
  Rocket,
  Clock,
} from "lucide-react";

interface FounderStatusStripProps {
  systemMode: string;
  pendingDecisions: number;
  highRiskCount: number;
  deployReadyCount: number;
  blockedCritical: number;
}

const MODE_STYLES: Record<string, string> = {
  production: "bg-status-green/15 text-status-green border-status-green/30",
  experimental: "bg-status-amber/15 text-status-amber border-status-amber/30",
};

export function FounderStatusStrip({
  systemMode,
  pendingDecisions,
  highRiskCount,
  deployReadyCount,
  blockedCritical,
}: FounderStatusStripProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap bg-surface-sunken border border-border/40 rounded-lg px-3 py-1.5">
      <Badge
        variant="outline"
        className={`text-[8px] uppercase tracking-wider font-semibold px-2 py-0.5 border ${MODE_STYLES[systemMode] ?? MODE_STYLES.production}`}
      >
        <Shield className="h-3 w-3 mr-1" />
        {systemMode}
      </Badge>

      <Indicator icon={<Stamp className="h-3 w-3" />} value={pendingDecisions} label="Decisions" color={pendingDecisions > 0 ? "text-status-amber" : undefined} />
      <Indicator icon={<AlertTriangle className="h-3 w-3" />} value={highRiskCount} label="High Risk" color={highRiskCount > 0 ? "text-status-red" : undefined} />
      <Indicator icon={<Rocket className="h-3 w-3" />} value={deployReadyCount} label="Deploy Ready" color={deployReadyCount > 0 ? "text-status-cyan" : undefined} />
      <Indicator icon={<Clock className="h-3 w-3" />} value={blockedCritical} label="Blocked" color={blockedCritical > 0 ? "text-status-red" : undefined} />
    </div>
  );
}

function Indicator({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color?: string }) {
  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 ${color ?? "text-muted-foreground"}`}>
      {icon}
      <span className="text-xs font-bold font-mono leading-none">{value}</span>
      <span className="text-[8px] opacity-60 hidden lg:inline">{label}</span>
    </div>
  );
}
