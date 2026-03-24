import {
  AlertTriangle, GitPullRequest, FileCode, Rocket, Eye, Play,
  CheckCircle2, XCircle, Clock, Shield,
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
  blocked: "border-l-red-500",
  escalated: "border-l-pink-600",
  in_progress: "border-l-amber-400",
  waiting_review: "border-l-violet-500",
  rework_required: "border-l-orange-500",
  ready: "border-l-blue-400",
  assigned: "border-l-blue-300",
  validated: "border-l-emerald-500",
  done: "border-l-green-500",
};

const CI_DOT: Record<string, string> = {
  running: "bg-blue-500 animate-pulse",
  preparing: "bg-amber-400 animate-pulse",
  completed: "bg-green-500",
  failed: "bg-red-500",
  produced_output: "bg-green-400",
  finalized: "bg-green-500",
  timed_out: "bg-red-400",
};

export function OfficeTaskCard({ task, onClick }: OfficeTaskCardProps) {
  const isRunning = task.latestRunState === "running" || task.latestRunState === "preparing";
  const isBlocked = task.state === "blocked";
  const isEscalated = task.state === "escalated";
  const persona = task.roleCode ? getPersona(task.roleCode) : null;
  const accentBorder = STATE_ACCENT[task.state] ?? "border-l-border";

  return (
    <div
      onClick={onClick}
      className={`
        group relative flex items-start gap-3 px-3.5 py-3 rounded-xl cursor-pointer
        border border-l-[3px] transition-all duration-150
        hover:shadow-md hover:-translate-y-px
        ${accentBorder}
        ${isBlocked
          ? "bg-red-50/30 border-t-red-100 border-r-red-100 border-b-red-100"
          : isEscalated
            ? "bg-pink-50/20 border-t-pink-100 border-r-pink-100 border-b-pink-100"
            : "bg-card border-t-border border-r-border border-b-border hover:bg-secondary/20"
        }
      `}
    >
      {/* Running pulse overlay */}
      {isRunning && (
        <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-blue-500 animate-pulse" />
      )}

      {/* Employee avatar */}
      {persona ? (
        <div className="relative shrink-0 mt-0.5">
          <img src={persona.avatar} alt="" className={`h-8 w-8 rounded-lg object-cover ring-1 ${persona.ringClass} ring-offset-1 ring-offset-background`}
            width={32} height={32} loading="lazy" />
        </div>
      ) : (
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[9px] font-mono font-bold text-muted-foreground">
            {(task.roleCode ?? "??").slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Project + Role line */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[11px] font-semibold text-primary truncate max-w-[80px]">{task.projectName}</span>
          {task.employeeName && (
            <>
              <span className="text-[10px] text-muted-foreground/30">·</span>
              <span className="text-[11px] text-muted-foreground truncate">{task.employeeName}</span>
            </>
          )}
          {!task.employeeName && task.roleName && (
            <>
              <span className="text-[10px] text-muted-foreground/30">·</span>
              <span className="text-[11px] font-mono text-muted-foreground/50 truncate">{task.roleName}</span>
            </>
          )}
        </div>

        {/* Task title */}
        <p className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2">{task.title}</p>

        {/* Bottom indicators */}
        <div className="flex items-center gap-2 mt-2">
          {/* Age */}
          {task.updatedAt && (
            <span className="text-[10px] font-mono text-muted-foreground/40 flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: false })}
            </span>
          )}

          {/* CI indicator */}
          {task.latestRunState && (
            <div className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${CI_DOT[task.latestRunState] ?? "bg-muted"}`} />
              <span className="text-[10px] text-muted-foreground/50 capitalize">{task.latestRunState === "running" ? "CI" : ""}</span>
            </div>
          )}

          {/* PR */}
          {task.hasPendingReview && (
            <GitPullRequest className="h-3.5 w-3.5 text-violet-500" />
          )}

          {/* Deploy */}
          {task.hasPendingApproval && (
            <Rocket className="h-3.5 w-3.5 text-amber-500" />
          )}

          {/* Evidence */}
          {task.evidenceCount > 0 && (
            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <FileCode className="h-3 w-3" />
              <span className="font-mono">{task.evidenceCount}</span>
            </div>
          )}

          {/* Risk */}
          {task.hasPrediction && (
            <div className="flex items-center gap-0.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              {task.predictionType && (
                <span className="text-[9px] font-semibold text-amber-600 uppercase">{task.predictionType.replace(/_/g, " ")}</span>
              )}
            </div>
          )}

          {/* Priority */}
          {task.priority === "high" && (
            <span className="text-[9px] font-bold text-destructive uppercase tracking-wider">High</span>
          )}
        </div>
      </div>
    </div>
  );
}
