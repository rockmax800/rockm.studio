import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Stamp,
  Activity,
  Server,
  Rocket,
  Clock,
  Search,
  OctagonX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface StatusStripProps {
  systemMode: string;
  workerCount: number;
  activeRuns: number;
  stalledRuns: number;
  pendingDecisions: number;
  blockedTasks: number;
  deploysInProgress: number;
}

const MODE_STYLES: Record<string, string> = {
  production: "bg-status-green/20 text-status-green border-status-green/40 shadow-sm shadow-status-green/10",
  staging: "bg-status-amber/20 text-status-amber border-status-amber/40",
  development: "bg-status-blue/20 text-status-blue border-status-blue/40",
  maintenance: "bg-status-red/20 text-status-red border-status-red/40",
};

export function StatusStrip({
  systemMode,
  workerCount,
  activeRuns,
  stalledRuns,
  pendingDecisions,
  blockedTasks,
  deploysInProgress,
}: StatusStripProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap bg-surface-sunken border border-border/50 rounded-lg px-3 py-2">
      {/* LEFT */}
      <Badge
        variant="outline"
        className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-0.5 ${MODE_STYLES[systemMode] ?? MODE_STYLES.production}`}
      >
        {systemMode}
      </Badge>

      <div className="h-4 w-px bg-border/40 mx-0.5" />

      <Metric icon={<Server className="h-3.5 w-3.5" />} value={workerCount} label="Workers" variant={workerCount > 0 ? "neutral" : "danger"} />
      <Metric icon={<Activity className="h-3.5 w-3.5" />} value={activeRuns} label="Runs" variant={activeRuns > 0 ? "info" : "neutral"} />
      {stalledRuns > 0 && <Metric icon={<Clock className="h-3.5 w-3.5" />} value={stalledRuns} label="Stalled" variant="danger" />}
      <Metric icon={<AlertTriangle className="h-3.5 w-3.5" />} value={blockedTasks} label="Blocked" variant={blockedTasks > 0 ? "danger" : "neutral"} />
      <Metric icon={<Stamp className="h-3.5 w-3.5" />} value={pendingDecisions} label="Decisions" variant={pendingDecisions > 0 ? "warning" : "neutral"} />
      {deploysInProgress > 0 && (
        <Metric icon={<Rocket className="h-3.5 w-3.5 animate-pulse" />} value={deploysInProgress} label="Deploying" variant="info" />
      )}

      <div className="flex-1" />

      {/* RIGHT */}
      <Link to="/system">
        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <OctagonX className="h-3 w-3" /> Stop
        </Button>
      </Link>
      <Link to="/projects">
        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 border-border/50 text-muted-foreground hover:text-foreground">
          <Search className="h-3 w-3" /> Projects
        </Button>
      </Link>
    </div>
  );
}

function Metric({
  icon,
  value,
  label,
  variant,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  variant: "danger" | "warning" | "info" | "neutral";
}) {
  const styles = {
    danger: "text-status-red",
    warning: "text-status-amber",
    info: "text-status-cyan",
    neutral: "text-muted-foreground",
  };

  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${styles[variant]}`}>
      {icon}
      <span className="text-sm font-bold font-mono leading-none">{value}</span>
      <span className="text-[9px] opacity-60 hidden lg:inline uppercase tracking-wider">{label}</span>
    </div>
  );
}
