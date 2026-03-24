import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Zap,
  Stamp,
  Activity,
  Server,
  Rocket,
  Clock,
  Plus,
  Search,
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
  production: "bg-status-green/15 text-status-green border-status-green/30",
  staging: "bg-status-amber/15 text-status-amber border-status-amber/30",
  development: "bg-status-blue/15 text-status-blue border-status-blue/30",
  maintenance: "bg-status-red/15 text-status-red border-status-red/30",
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
    <div className="flex items-center gap-1.5 flex-wrap bg-surface-sunken border border-border/50 rounded-lg px-3 py-2">
      {/* LEFT */}
      <Badge
        variant="outline"
        className={`text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 ${MODE_STYLES[systemMode] ?? MODE_STYLES.production}`}
      >
        {systemMode}
      </Badge>

      <Indicator
        icon={<Server className="h-3 w-3" />}
        value={workerCount}
        label="Workers"
        variant={workerCount > 0 ? "neutral" : "danger"}
      />
      <Indicator
        icon={<Activity className="h-3 w-3" />}
        value={activeRuns}
        label="Runs"
        variant={activeRuns > 0 ? "info" : "neutral"}
      />
      {stalledRuns > 0 && (
        <Indicator
          icon={<Clock className="h-3 w-3" />}
          value={stalledRuns}
          label="Stalled"
          variant="danger"
        />
      )}

      <div className="h-4 w-px bg-border/50 mx-1 hidden sm:block" />

      {/* CENTER */}
      <Indicator
        icon={<Stamp className="h-3 w-3" />}
        value={pendingDecisions}
        label="Decisions"
        variant={pendingDecisions > 0 ? "warning" : "neutral"}
      />
      <Indicator
        icon={<AlertTriangle className="h-3 w-3" />}
        value={blockedTasks}
        label="Blocked"
        variant={blockedTasks > 0 ? "danger" : "neutral"}
      />
      {deploysInProgress > 0 && (
        <Indicator
          icon={<Rocket className="h-3 w-3 animate-pulse" />}
          value={deploysInProgress}
          label="Deploying"
          variant="info"
        />
      )}

      <div className="flex-1" />

      {/* RIGHT — Quick Actions */}
      <Link to="/presale/new">
        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 border-border/50 text-muted-foreground hover:text-foreground">
          <Plus className="h-3 w-3" /> Intake
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

function Indicator({
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
      <span className="text-xs font-bold font-mono leading-none">{value}</span>
      <span className="text-[9px] opacity-60 hidden lg:inline">{label}</span>
    </div>
  );
}
