import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Stamp,
  Activity,
  Server,
  Rocket,
  Clock,
  Plus,
  OctagonX,
} from "lucide-react";

interface StatusStripProps {
  systemMode: string;
  workerCount: number;
  activeRuns: number;
  stalledRuns: number;
  pendingDecisions: number;
  blockedTasks: number;
  deploysInProgress: number;
}

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
    <div className="flex items-center gap-2 h-12 bg-secondary rounded-[12px] border border-border px-4">
      {/* Mode badge */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-card border border-border">
        <div className="h-1.5 w-1.5 rounded-full bg-status-green" />
        <span className="text-[12px] font-semibold text-foreground uppercase tracking-wider">
          {systemMode}
        </span>
      </div>

      <Sep />

      <Metric icon={Server} value={workerCount} label="Workers" warn={workerCount === 0} />
      <Metric icon={Activity} value={activeRuns} label="Runs" />
      {stalledRuns > 0 && <Metric icon={Clock} value={stalledRuns} label="Stalled" warn />}
      <Metric icon={Stamp} value={pendingDecisions} label="Pending" warn={pendingDecisions > 0} />
      <Metric icon={AlertTriangle} value={blockedTasks} label="Blocked" warn={blockedTasks > 0} />
      {deploysInProgress > 0 && <Metric icon={Rocket} value={deploysInProgress} label="Deploy" />}

      <div className="flex-1" />

      {/* Actions */}
      <Link to="/presale/new">
        <Button
          size="sm"
          className="h-7 gap-1 text-[12px] font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-lg"
        >
          <Plus className="h-3 w-3" /> New Intake
        </Button>
      </Link>
      <Link to="/system">
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-[12px] border-destructive/30 text-destructive hover:bg-destructive/5 rounded-lg"
        >
          <OctagonX className="h-3 w-3" /> Stop
        </Button>
      </Link>
    </div>
  );
}

function Sep() {
  return <div className="h-5 w-px bg-border-strong/40 mx-0.5" />;
}

function Metric({ icon: Icon, value, label, warn }: { icon: any; value: number; label: string; warn?: boolean }) {
  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${warn ? "text-status-red" : "text-muted-foreground"}`}>
      <Icon className="h-3 w-3" />
      <span className="text-[13px] font-bold font-mono tabular-nums">{value}</span>
      <span className="text-[11px] font-medium hidden xl:inline">{label}</span>
    </div>
  );
}
