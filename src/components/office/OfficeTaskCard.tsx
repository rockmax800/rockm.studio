import {
  AlertTriangle,
  GitPullRequest,
  FileCode,
} from "lucide-react";

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
        group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer
        border transition-all duration-180
        hover:shadow-elevated hover:border-border-strong
        ${isBlocked ? "border-l-2 border-l-status-red border-t-border border-r-border border-b-border bg-status-red/3" :
          isEscalated ? "border-l-2 border-l-lifecycle-escalated border-t-border border-r-border border-b-border bg-lifecycle-escalated/3" :
          "border-border bg-card"}
      `}
    >
      {/* Running pulse strip */}
      {isRunning && (
        <div className="w-0.5 self-stretch rounded-full bg-status-cyan animate-run-pulse shrink-0" />
      )}

      {/* Role avatar */}
      <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0">
        <span className="text-[9px] font-mono font-bold text-muted-foreground">
          {(task.roleCode ?? "??").slice(0, 2).toUpperCase()}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[80px]">
            {task.projectName}
          </span>
          {task.roleCode && (
            <span className="text-[10px] font-mono text-muted-foreground/50">{task.roleCode}</span>
          )}
        </div>
        <p className="text-[12px] font-medium text-foreground leading-snug truncate">{task.title}</p>
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-1.5 shrink-0">
        {task.evidenceCount > 0 && (
          <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <FileCode className="h-3 w-3" />
            <span>{task.evidenceCount}</span>
          </div>
        )}

        {task.hasPendingReview && (
          <GitPullRequest className="h-3 w-3 text-lifecycle-review" />
        )}

        {/* CI status dot */}
        {task.latestRunState && (
          <div
            className={`h-2 w-2 rounded-full ${
              task.latestRunState === "completed"
                ? "bg-status-green"
                : task.latestRunState === "failed"
                  ? "bg-status-red"
                  : isRunning
                    ? "bg-status-cyan animate-pulse"
                    : "bg-muted"
            }`}
          />
        )}

        {task.hasPrediction && (
          <AlertTriangle className="h-3 w-3 text-status-amber" />
        )}
      </div>
    </div>
  );
}
