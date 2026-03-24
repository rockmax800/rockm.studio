import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import {
  AlertTriangle,
  Clock,
  GitPullRequest,
  CircleCheck,
  CircleX,
  Rocket,
  FileCode,
  User,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface OfficeTaskCardData {
  id: string;
  title: string;
  state: string;
  projectName: string;
  projectId: string;
  roleName: string | null;
  roleCode: string | null;
  latestRunState: string | null;
  hasPendingReview: boolean;
  hasPendingApproval: boolean;
  hasPrediction: boolean;
  predictionType: string | null;
  updatedAt?: string;
  evidenceCount: number;
}

interface OfficeTaskCardProps {
  task: OfficeTaskCardData;
  onClick: () => void;
}

export function OfficeTaskCard({ task, onClick }: OfficeTaskCardProps) {
  const isRunning = task.latestRunState === "running" || task.latestRunState === "preparing";
  const isBlocked = task.state === "blocked";
  const isEscalated = task.state === "escalated";

  return (
    <div
      onClick={onClick}
      className={`
        group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer
        bg-card/40 border transition-all duration-200
        hover:bg-surface-glass/60 hover:border-primary/20
        ${isBlocked ? "border-status-red/40" : isEscalated ? "border-lifecycle-escalated/40" : "border-border/20"}
        ${isRunning ? "animate-pulse" : ""}
      `}
      style={isRunning ? { animationDuration: "2.5s" } : undefined}
    >
      {/* Role indicator */}
      <div className="h-5 w-5 rounded bg-muted/50 flex items-center justify-center shrink-0">
        <User className="h-2.5 w-2.5 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <Badge variant="outline" className="text-[6px] px-1 py-0 h-3 border-border/30 truncate max-w-[70px]">
            {task.projectName}
          </Badge>
          {task.roleCode && (
            <span className="text-[7px] font-mono text-muted-foreground">{task.roleCode}</span>
          )}
        </div>
        <p className="text-[9px] font-medium leading-tight truncate">{task.title}</p>
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Evidence count */}
        {task.evidenceCount > 0 && (
          <div className="flex items-center gap-0.5 text-[7px] text-muted-foreground">
            <FileCode className="h-2.5 w-2.5" />
            <span>{task.evidenceCount}</span>
          </div>
        )}

        {/* PR icon */}
        {task.hasPendingReview && (
          <GitPullRequest className="h-3 w-3 text-lifecycle-review" />
        )}

        {/* CI dot */}
        {task.latestRunState && (
          <div
            className={`h-2 w-2 rounded-full ${
              task.latestRunState === "completed"
                ? "bg-status-green"
                : task.latestRunState === "failed"
                  ? "bg-status-red"
                  : isRunning
                    ? "bg-status-cyan"
                    : "bg-muted-foreground/30"
            }`}
          />
        )}

        {/* Prediction warning */}
        {task.hasPrediction && (
          <AlertTriangle className="h-3 w-3 text-lifecycle-escalated" />
        )}

        {/* Escalated icon */}
        {isEscalated && (
          <AlertTriangle className="h-3 w-3 text-lifecycle-escalated" />
        )}

        {/* Age */}
        {task.updatedAt && (
          <span className="text-[7px] font-mono text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: false })}
          </span>
        )}
      </div>
    </div>
  );
}
