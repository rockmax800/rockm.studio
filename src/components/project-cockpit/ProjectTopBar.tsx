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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
    <div className="bg-surface-sunken border border-border/40 rounded-lg px-3 py-2 space-y-1.5">
      {/* Row 1 */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link to="/projects">
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
            <ArrowLeft className="h-3 w-3" />
          </Button>
        </Link>

        <h1 className="text-sm font-semibold truncate">{project.name}</h1>
        <StatusBadge state={project.state} className="text-[8px]" />

        <Badge variant="outline" className={`text-[8px] px-1.5 py-0 h-4 border ${RISK_STYLES[riskLevel]}`}>
          {riskLevel} risk
        </Badge>

        <div className="flex items-center gap-1 text-muted-foreground">
          <GitBranch className="h-3 w-3" />
          <span className="text-[9px] font-mono">main</span>
        </div>

        <div className="flex items-center gap-1">
          <Server className="h-3 w-3 text-muted-foreground" />
          <span className={`text-[8px] font-mono ${hasStagingLive ? "text-status-green" : "text-muted-foreground/50"}`}>
            STG {hasStagingLive ? "●" : "○"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Globe className="h-3 w-3 text-muted-foreground" />
          <span className={`text-[8px] font-mono ${hasProductionLive ? "text-status-green" : "text-muted-foreground/50"}`}>
            PRD {hasProductionLive ? "●" : "○"}
          </span>
        </div>

        <div className="flex-1" />

        {/* Right actions */}
        <Link to={`/control/projects/${project.id}`}>
          <Button variant="outline" size="sm" className="h-6 text-[9px] gap-1 border-border/50">
            <ExternalLink className="h-3 w-3" /> Control
          </Button>
        </Link>
      </div>

      {/* Row 2 — Next Action Banner */}
      {nextAction && (
        <div className="flex items-center gap-2 px-2 py-1 rounded bg-status-amber/5 border border-status-amber/20">
          <Clock className="h-3 w-3 text-status-amber shrink-0" />
          <span className="text-[9px] text-status-amber font-medium">Action required:</span>
          <span className="text-[9px] text-foreground">{nextAction}</span>
          {pendingApprovalsCount > 0 && (
            <Link to={`/founder`} className="ml-auto">
              <Button size="sm" className="h-5 text-[8px] px-2">
                <Rocket className="h-2.5 w-2.5 mr-0.5" /> Review
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
