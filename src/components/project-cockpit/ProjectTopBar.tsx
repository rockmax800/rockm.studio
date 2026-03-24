import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Rocket,
  ExternalLink,
  GitBranch,
  Globe,
  Server,
  Pause,
  Upload,
  Building2,
} from "lucide-react";

interface ProjectTopBarProps {
  project: {
    id: string;
    name: string;
    state: string;
    slug: string;
    updated_at: string;
  };
  riskLevel: "low" | "medium" | "high";
  nextAction: string | null;
  pendingApprovalsCount: number;
  hasStagingLive: boolean;
  hasProductionLive: boolean;
  tasksDone: number;
  tasksTotal: number;
}

const RISK_COLORS = {
  low: "bg-status-green/10 text-status-green",
  medium: "bg-status-amber/10 text-status-amber",
  high: "bg-status-red/10 text-status-red",
};

export function ProjectTopBar({
  project,
  riskLevel,
  nextAction,
  pendingApprovalsCount,
  hasStagingLive,
  hasProductionLive,
  tasksDone,
  tasksTotal,
}: ProjectTopBarProps) {
  const progress = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

  return (
    <div className="ds-card px-5 py-4 space-y-3">
      {/* Row 1 — Title + Badges + Actions */}
      <div className="flex items-center gap-3">
        <Link to="/projects">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <h1 className="text-[32px] font-bold tracking-[-0.02em] text-foreground truncate leading-none">
          {project.name}
        </h1>

        <StatusBadge state={project.state} />

        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${RISK_COLORS[riskLevel]}`}>
          {riskLevel}
        </span>

        {/* Env indicators */}
        <div className="flex items-center gap-2 ml-2">
          <span className={`flex items-center gap-1 text-[11px] font-mono ${hasStagingLive ? "text-status-green" : "text-muted-foreground/40"}`}>
            <Server className="h-3 w-3" /> STG {hasStagingLive ? "●" : "○"}
          </span>
          <span className={`flex items-center gap-1 text-[11px] font-mono ${hasProductionLive ? "text-status-green" : "text-muted-foreground/40"}`}>
            <Globe className="h-3 w-3" /> PRD {hasProductionLive ? "●" : "○"}
          </span>
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {pendingApprovalsCount > 0 && (
            <Link to="/founder">
              <Button size="sm" className="h-8 text-[12px] gap-1.5 bg-foreground text-background hover:bg-foreground/90 rounded-lg font-bold">
                Review {pendingApprovalsCount}
              </Button>
            </Link>
          )}
          <Button variant="outline" size="sm" className="h-8 text-[12px] gap-1.5 border-border text-foreground hover:bg-secondary rounded-lg">
            <Upload className="h-3.5 w-3.5" /> Deploy Staging
          </Button>
          <Button
            size="sm"
            className="h-8 text-[12px] gap-1.5 bg-foreground text-background hover:bg-foreground/90 rounded-lg font-semibold"
            disabled={!hasStagingLive}
          >
            <Rocket className="h-3.5 w-3.5" /> Production
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-[12px] gap-1.5 border-status-amber/30 text-status-amber hover:bg-status-amber/5 rounded-lg">
            <Pause className="h-3.5 w-3.5" />
          </Button>
          <Link to={`/office`}>
            <Button variant="ghost" size="sm" className="h-8 text-[12px] gap-1 text-muted-foreground hover:text-foreground rounded-lg">
              <Building2 className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="h-8 text-[12px] gap-1 text-muted-foreground hover:text-foreground rounded-lg">
            <GitBranch className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Row 2 — Progress + Next Action */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-[11px] font-mono text-muted-foreground shrink-0">
            {tasksDone}/{tasksTotal} tasks
          </span>
          <Progress value={progress} className="h-1.5 flex-1 max-w-[200px]" />
          <span className="text-[11px] font-mono font-bold text-foreground">{progress}%</span>
        </div>

        {nextAction && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-status-amber/5 border border-status-amber/15">
            <Clock className="h-3 w-3 text-status-amber shrink-0" />
            <span className="text-[12px] text-status-amber font-medium">{nextAction}</span>
          </div>
        )}
      </div>
    </div>
  );
}
