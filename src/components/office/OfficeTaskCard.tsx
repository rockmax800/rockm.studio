import {
  AlertTriangle,
  GitPullRequest,
  FileCode,
  Rocket,
  Eye,
  Play,
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

const NEXT_ACTION_ICON: Record<string, { icon: typeof Play; color: string; label: string }> = {
  blocked: { icon: AlertTriangle, color: "text-status-red", label: "Unblock" },
  escalated: { icon: AlertTriangle, color: "text-lifecycle-escalated", label: "Resolve" },
  waiting_review: { icon: Eye, color: "text-lifecycle-review", label: "Review" },
  ready: { icon: Play, color: "text-lifecycle-ready", label: "Start" },
};

export function OfficeTaskCard({ task, onClick }: OfficeTaskCardProps) {
  const isRunning = task.latestRunState === "running" || task.latestRunState === "preparing";
  const isBlocked = task.state === "blocked";
  const isEscalated = task.state === "escalated";
  const nextAction = NEXT_ACTION_ICON[task.state];

  return (
    <div
      onClick={onClick}
      className={`
        group relative flex items-center gap-2 px-2.5 py-2 rounded-[10px] cursor-pointer
        border transition-all duration-150
        hover:shadow-elevated hover:-translate-y-px
        ${isBlocked
          ? "border-l-[3px] border-l-status-red border-t-border border-r-border border-b-border bg-status-red/[0.03]"
          : isEscalated
            ? "border-l-[3px] border-l-lifecycle-escalated border-t-border border-r-border border-b-border bg-lifecycle-escalated/[0.03]"
            : "border-border bg-card hover:bg-secondary/40"
        }
      `}
    >
      {/* Running pulse strip */}
      {isRunning && (
        <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-status-cyan animate-pulse" />
      )}

      {/* Role avatar */}
      <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0">
        <span className="text-[8px] font-mono font-bold text-muted-foreground">
          {(task.roleCode ?? "??").slice(0, 2).toUpperCase()}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-[10px] font-semibold text-muted-foreground truncate max-w-[70px]">
            {task.projectName}
          </span>
          {task.roleName && (
            <>
              <span className="text-[10px] text-muted-foreground/30">·</span>
              <span className="text-[10px] font-mono text-muted-foreground/50 truncate">{task.roleName}</span>
            </>
          )}
        </div>
        <p className="text-[12px] font-medium text-foreground leading-snug truncate">{task.title}</p>
        {task.updatedAt && (
          <span className="text-[9px] font-mono text-muted-foreground/40 mt-0.5 block">
            {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
          </span>
        )}
      </div>

      {/* Right indicators */}
      <div className="flex items-center gap-1 shrink-0">
        {task.evidenceCount > 0 && (
          <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
            <FileCode className="h-2.5 w-2.5" />
            <span className="font-mono">{task.evidenceCount}</span>
          </div>
        )}

        {task.hasPendingReview && (
          <GitPullRequest className="h-3 w-3 text-lifecycle-review" />
        )}

        {task.hasPendingApproval && (
          <Rocket className="h-3 w-3 text-status-amber" />
        )}

        {/* CI dot */}
        {task.latestRunState && (
          <div
            className={`h-2 w-2 rounded-full ${
              task.latestRunState === "completed" ? "bg-status-green"
                : task.latestRunState === "failed" ? "bg-status-red"
                : isRunning ? "bg-status-cyan animate-pulse"
                : "bg-muted"
            }`}
          />
        )}

        {task.hasPrediction && (
          <AlertTriangle className="h-2.5 w-2.5 text-status-amber" />
        )}

        {/* Next action */}
        {nextAction && (
          <div className={`h-4 w-4 rounded flex items-center justify-center bg-secondary ${nextAction.color}`}>
            <nextAction.icon className="h-2.5 w-2.5" />
          </div>
        )}
      </div>
    </div>
  );
}
