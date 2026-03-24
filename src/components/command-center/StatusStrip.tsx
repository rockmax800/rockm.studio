import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Stamp,
  Activity,
  Server,
  Rocket,
  Clock,
  Search,
  OctagonX,
  Plus,
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
    <div className="flex items-center gap-3 h-16 bg-secondary rounded-[16px] border border-border px-6">
      {/* LEFT — Mode + metrics */}
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-status-green" />
        <span className="text-[13px] font-semibold text-foreground uppercase tracking-wide">
          {systemMode}
        </span>
      </div>

      <Sep />

      <Metric icon={Server} value={workerCount} label="Workers" warn={workerCount === 0} />
      <Metric icon={Activity} value={activeRuns} label="Runs" />
      {stalledRuns > 0 && <Metric icon={Clock} value={stalledRuns} label="Stalled" warn />}
      <Metric icon={Stamp} value={pendingDecisions} label="Decisions" warn={pendingDecisions > 0} />
      <Metric icon={AlertTriangle} value={blockedTasks} label="Blocked" warn={blockedTasks > 0} />
      {deploysInProgress > 0 && <Metric icon={Rocket} value={deploysInProgress} label="Deploying" />}

      <div className="flex-1" />

      {/* RIGHT — Actions */}
      <Link to="/projects">
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
          <Search className="h-3.5 w-3.5" /> Search
        </Button>
      </Link>
      <Link to="/presale/new">
        <Button size="sm" className="h-8 gap-1.5 text-[13px] bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-3.5 w-3.5" /> New Intake
        </Button>
      </Link>
      <Link to="/system">
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[13px] border-destructive/30 text-destructive hover:bg-destructive/5">
          <OctagonX className="h-3.5 w-3.5" /> Stop
        </Button>
      </Link>
    </div>
  );
}

function Sep() {
  return <div className="h-6 w-px bg-border-strong/50 mx-1" />;
}

function Metric({ icon: Icon, value, label, warn }: { icon: any; value: number; label: string; warn?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${warn ? "text-status-red" : "text-muted-foreground"}`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="text-[14px] font-bold font-mono tabular-nums">{value}</span>
      <span className="text-[12px] font-medium hidden xl:inline">{label}</span>
    </div>
  );
}
