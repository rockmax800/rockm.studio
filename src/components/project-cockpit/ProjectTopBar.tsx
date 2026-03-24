import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
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
}

const RISK_STYLES = {
  low: "bg-status-green/10 text-status-green border-status-green/30",
  medium: "bg-status-amber/10 text-status-amber border-status-amber/30",
  high: "bg-status-red/10 text-status-red border-status-red/30",
};

export function ProjectTopBar({
  project,
  riskLevel,
  nextAction,
  pendingApprovalsCount,
  hasStagingLive,
  hasProductionLive,
}: ProjectTopBarProps) {
  return (
    <div className="ds-card px-4 py-3 space-y-2">
      {/* Row 1 — Header */}
      <div className="flex items-center gap-3">
        <Link to="/projects">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <h1 className="text-page-title text-foreground truncate">{project.name}</h1>
        <StatusBadge state={project.state} />

        <Badge variant="outline" className={`text-[11px] font-mono font-medium px-2 py-0.5 h-5 border ${RISK_STYLES[riskLevel]}`}>
          {riskLevel} risk
        </Badge>

        {/* Environment indicators */}
        <div className="flex items-center gap-3 ml-2">
          <div className="flex items-center gap-1">
            <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[12px] font-mono text-muted-foreground">main</span>
          </div>
          <div className="flex items-center gap-1">
            <Server className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={`text-[12px] font-mono ${hasStagingLive ? "text-status-green" : "text-muted-foreground/50"}`}>
              STG {hasStagingLive ? "●" : "○"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={`text-[12px] font-mono ${hasProductionLive ? "text-status-green" : "text-muted-foreground/50"}`}>
              PRD {hasProductionLive ? "●" : "○"}
            </span>
          </div>
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[12px] gap-1.5 border-border text-foreground hover:bg-secondary rounded-lg"
          >
            <Upload className="h-3.5 w-3.5" /> Deploy Staging
          </Button>
          <Button
            size="sm"
            className="h-8 text-[12px] gap-1.5 bg-foreground text-background hover:bg-foreground/90 rounded-lg font-semibold"
            disabled={!hasStagingLive}
          >
            <Rocket className="h-3.5 w-3.5" /> Deploy Production
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[12px] gap-1.5 border-status-amber/30 text-status-amber hover:bg-status-amber/5 rounded-lg"
          >
            <Pause className="h-3.5 w-3.5" /> Pause
          </Button>
          <Link to={`/control/projects/${project.id}`}>
            <Button variant="ghost" size="sm" className="h-8 text-[12px] gap-1 text-muted-foreground hover:text-foreground rounded-lg">
              <ExternalLink className="h-3.5 w-3.5" /> GitHub
            </Button>
          </Link>
        </div>
      </div>

      {/* Row 2 — Next Action Banner */}
      {nextAction && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-status-amber/5 border border-status-amber/20">
          <Clock className="h-3.5 w-3.5 text-status-amber shrink-0" />
          <span className="text-[13px] text-status-amber font-medium">Action required:</span>
          <span className="text-[13px] text-foreground">{nextAction}</span>
          {pendingApprovalsCount > 0 && (
            <Link to="/founder" className="ml-auto">
              <Button size="sm" className="h-7 text-[12px] px-3 bg-foreground text-background hover:bg-foreground/90 rounded-lg font-semibold">
                Review Now
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
