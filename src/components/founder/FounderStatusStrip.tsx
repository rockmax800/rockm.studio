import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Shield, Stamp, AlertTriangle, Rocket, Clock,
  Pause, HeartPulse, FolderOpen,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface FounderStatusStripProps {
  systemMode: string;
  pendingDecisions: number;
  highRiskCount: number;
  deployReadyCount: number;
  blockedCritical: number;
  projects: { id: string; name: string }[];
}

export function FounderStatusStrip({
  systemMode,
  pendingDecisions,
  highRiskCount,
  deployReadyCount,
  blockedCritical,
  projects,
}: FounderStatusStripProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-2 h-11 bg-card rounded-[12px] border border-border px-4">
      {/* Mode badge */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary border border-border">
        <div className={`h-1.5 w-1.5 rounded-full ${systemMode === "production" ? "bg-status-green" : "bg-status-amber"}`} />
        <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">{systemMode}</span>
      </div>

      <div className="h-5 w-px bg-border mx-0.5" />

      <Metric icon={Stamp} value={pendingDecisions} label="Decisions" warn={pendingDecisions > 0} warnColor="text-status-amber" />
      <Metric icon={AlertTriangle} value={highRiskCount} label="High Risk" warn={highRiskCount > 0} warnColor="text-status-red" />
      <Metric icon={Rocket} value={deployReadyCount} label="Deploy Ready" warn={deployReadyCount > 0} warnColor="text-status-cyan" />
      {blockedCritical > 0 && (
        <Metric icon={Clock} value={blockedCritical} label="Blocked" warn warnColor="text-status-red" />
      )}

      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] px-2 gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/system")}
        >
          <Pause className="h-3 w-3" /> Pause
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] px-2 gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/system")}
        >
          <HeartPulse className="h-3 w-3" /> Health
        </Button>

        {/* Quick Project Jump */}
        <Select onValueChange={(v) => navigate(`/projects/${v}`)}>
          <SelectTrigger className="h-7 w-[130px] text-[11px] bg-secondary border-border rounded-lg">
            <FolderOpen className="h-3 w-3 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Jump to…" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-[11px]">{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, value, label, warn, warnColor }: {
  icon: any; value: number; label: string; warn?: boolean; warnColor?: string;
}) {
  const color = warn && warnColor ? warnColor : "text-muted-foreground";
  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${color}`}>
      <Icon className="h-3 w-3" />
      <span className="text-[13px] font-bold font-mono tabular-nums">{value}</span>
      <span className="text-[11px] font-medium hidden xl:inline">{label}</span>
    </div>
  );
}
