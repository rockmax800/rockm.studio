import {
  AlertTriangle, GitPullRequest, FileCode, Rocket,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getPersona } from "@/lib/personas";

export interface OfficeTaskCardData {
  id: string;
  title: string;
  state: string;
  projectName: string;
  projectId: string;
  roleName: string | null;
  roleCode: string | null;
  employeeName?: string | null;
  latestRunState: string | null;
  hasPendingReview: boolean;
  hasPendingApproval: boolean;
  hasPrediction: boolean;
  predictionType: string | null;
  updatedAt?: string;
  evidenceCount: number;
  priority?: string | null;
}

interface OfficeTaskCardProps {
  task: OfficeTaskCardData;
  onClick: () => void;
}

const STATE_ACCENT: Record<string, string> = {
  blocked: "border-l-destructive",
  escalated: "border-l-destructive",
  in_progress: "border-l-status-amber",
  waiting_review: "border-l-lifecycle-review",
  rework_required: "border-l-status-amber",
  ready: "border-l-status-blue",
  assigned: "border-l-status-blue",
  validated: "border-l-status-green",
  done: "border-l-status-green",
};

const CI_DOT: Record<string, string> = {
  running: "bg-status-amber animate-pulse",
  preparing: "bg-status-amber animate-pulse",
  completed: "bg-status-green",
  failed: "bg-destructive",
  produced_output: "bg-status-green",
  finalized: "bg-status-green",
  timed_out: "bg-destructive",
};

export function OfficeTaskCard({ task, onClick }: OfficeTaskCardProps) {
  const isRunning = task.latestRunState === "running" || task.latestRunState === "preparing";
  const persona = task.roleCode ? getPersona(task.roleCode) : null;
  const accentBorder = STATE_ACCENT[task.state] ?? "border-l-border";

  return (
    <div
      onClick={onClick}
      className={`
        group relative flex items-start gap-3 px-3.5 py-3 rounded-xl cursor-pointer
        border border-l-[3px] transition-colors duration-150
        hover:bg-secondary/30
        ${accentBorder}
        bg-card border-t-border/40 border-r-border/40 border-b-border/40
      `}
    >
      {/* Running indicator */}
      {isRunning && (
        <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-status-amber animate-pulse" />
      )}

      {/* Employee avatar */}
      {persona ? (
        <div className="relative shrink-0 mt-0.5">
          <img src={persona.avatar} alt="" className="h-8 w-8 rounded-lg object-cover ring-1 ring-border/40 ring-offset-1 ring-offset-card"
            width={32} height={32} loading="lazy" />
        </div>
      ) : (
        <div className="h-8 w-8 rounded-lg bg-muted/30 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[9px] font-mono font-bold text-muted-foreground/50">
            {(task.roleCode ?? "??").slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Project + Role line */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[11px] font-semibold text-foreground truncate max-w-[80px]">{task.projectName}</span>
          {task.employeeName && (
            <>
              <span className="text-[10px] text-muted-foreground/20">·</span>
              <span className="text-[11px] text-muted-foreground/60 truncate">{task.employeeName}</span>
            </>
          )}
          {!task.employeeName && task.roleName && (
            <>
              <span className="text-[10px] text-muted-foreground/20">·</span>
              <span className="text-[11px] font-mono text-muted-foreground/40 truncate">{task.roleName}</span>
            </>
          )}
        </div>

        {/* Task title */}
        <p className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2">{task.title}</p>

        {/* Bottom indicators */}
        <div className="flex items-center gap-2 mt-2">
          {task.updatedAt && (
            <span className="text-[10px] font-mono text-muted-foreground/30 flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: false })}
            </span>
          )}

          {task.latestRunState && (
            <div className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${CI_DOT[task.latestRunState] ?? "bg-muted-foreground/20"}`} />
            </div>
          )}

          {task.hasPendingReview && <GitPullRequest className="h-3.5 w-3.5 text-lifecycle-review" />}
          {task.hasPendingApproval && <Rocket className="h-3.5 w-3.5 text-status-amber" />}

          {task.evidenceCount > 0 && (
            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground/40">
              <FileCode className="h-3 w-3" />
              <span className="font-mono">{task.evidenceCount}</span>
            </div>
          )}

          {task.hasPrediction && (
            <div className="flex items-center gap-0.5">
              <AlertTriangle className="h-3.5 w-3.5 text-status-amber" />
              {task.predictionType && (
                <span className="text-[9px] font-semibold text-muted-foreground uppercase">{task.predictionType.replace(/_/g, " ")}</span>
              )}
            </div>
          )}

          {task.priority === "high" && (
            <span className="text-[9px] font-bold text-destructive uppercase tracking-wider">High</span>
          )}
        </div>
      </div>
    </div>
  );
}
