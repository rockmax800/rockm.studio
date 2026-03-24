import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import {
  FileText, Layers, Rocket, LayoutGrid, Zap,
  Shield, CheckCircle2, Upload, ChevronRight,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   8-STAGE PRODUCTION PIPELINE
   ═══════════════════════════════════════════════════════════════ */
export const PIPELINE_STAGES = [
  { key: "intake",     label: "Intake",      states: ["draft"],                             href: "/presale/new",  icon: FileText },
  { key: "blueprint",  label: "Blueprint",   states: ["scoped"],                            href: "/projects",     icon: Layers },
  { key: "kickoff",    label: "Kickoff",     states: [],                                    href: "/projects",     icon: Rocket },
  { key: "task_graph", label: "Task Graph",  states: [],                                    href: "/projects",     icon: LayoutGrid },
  { key: "execution",  label: "Execution",   states: ["active", "blocked"],                 href: "/office",       icon: Zap },
  { key: "review",     label: "Review",      states: ["in_review"],                         href: "/founder",      icon: Shield },
  { key: "release",    label: "Release",     states: ["completed"],                         href: "/projects",     icon: CheckCircle2 },
  { key: "deploy",     label: "Deploy",      states: ["archived", "paused"],                href: "/projects",     icon: Upload },
] as const;

export type PipelineStageKey = (typeof PIPELINE_STAGES)[number]["key"];

export const STAGE_COLORS: Record<string, { active: string; activeBg: string; done: string; border: string; dot: string }> = {
  intake:     { active: "text-status-blue",         activeBg: "bg-status-blue/8",        done: "text-status-blue/40",         border: "border-status-blue",        dot: "bg-status-blue" },
  blueprint:  { active: "text-lifecycle-review",    activeBg: "bg-lifecycle-review/8",   done: "text-lifecycle-review/40",    border: "border-lifecycle-review",   dot: "bg-lifecycle-review" },
  kickoff:    { active: "text-status-cyan",         activeBg: "bg-status-cyan/8",        done: "text-status-cyan/40",         border: "border-status-cyan",        dot: "bg-status-cyan" },
  task_graph: { active: "text-primary",             activeBg: "bg-primary/8",            done: "text-primary/40",             border: "border-primary",            dot: "bg-primary" },
  execution:  { active: "text-status-amber",        activeBg: "bg-status-amber/8",       done: "text-status-amber/40",        border: "border-status-amber",       dot: "bg-status-amber" },
  review:     { active: "text-lifecycle-rework",    activeBg: "bg-lifecycle-rework/8",   done: "text-lifecycle-rework/40",    border: "border-lifecycle-rework",   dot: "bg-lifecycle-rework" },
  release:    { active: "text-status-green",        activeBg: "bg-status-green/8",       done: "text-status-green/40",        border: "border-status-green",       dot: "bg-status-green" },
  deploy:     { active: "text-lifecycle-deploying", activeBg: "bg-lifecycle-deploying/8", done: "text-lifecycle-deploying/40", border: "border-lifecycle-deploying", dot: "bg-lifecycle-deploying" },
};

export function resolveStageIndex(projectState?: string): number {
  if (!projectState) return -1;
  return PIPELINE_STAGES.findIndex((s) => (s.states as readonly string[]).includes(projectState));
}

/* ═══════════════════════════════════════════════════════════════
   FULL PIPELINE BAR — used in Command Center, Project, Founder
   ═══════════════════════════════════════════════════════════════ */
interface PipelineBarProps {
  currentStageIndex?: number;
  blockedStageIndex?: number; // -1 or undefined = no blocked
  className?: string;
  compact?: boolean;
  projectId?: string; // if set, href stages link to /projects/:id
}

export function PipelineBar({ currentStageIndex = -1, blockedStageIndex, className, compact, projectId }: PipelineBarProps) {
  return (
    <div className={cn("flex items-center gap-0", className)}>
      {PIPELINE_STAGES.map((stage, i) => {
        const isCurrent = i === currentStageIndex;
        const isDone = currentStageIndex > i && currentStageIndex >= 0;
        const isBlocked = i === blockedStageIndex;
        const colors = STAGE_COLORS[stage.key];
        const Icon = stage.icon;
        const href = projectId ? `/projects/${projectId}` : stage.href;

        return (
          <div key={stage.key} className="flex items-center flex-1 min-w-0">
            <Link to={href} className="flex-1 min-w-0">
              <div className={cn(
                "relative rounded-xl transition-all cursor-pointer border-2",
                compact ? "px-3 py-2" : "px-4 py-3",
                isBlocked
                  ? "bg-destructive/5 border-destructive/30"
                  : isCurrent
                    ? `${colors.activeBg} ${colors.border} shadow-sm`
                    : isDone
                      ? "border-transparent bg-secondary/20 hover:bg-secondary/40"
                      : "border-transparent hover:bg-secondary/20",
              )}>
                {/* Active pulse */}
                {isCurrent && !isBlocked && (
                  <span className={cn("absolute flex", compact ? "top-2 right-2 h-2 w-2" : "top-2.5 right-2.5 h-2.5 w-2.5")}>
                    <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-50", colors.dot)} />
                    <span className={cn("relative inline-flex rounded-full h-full w-full", colors.dot)} />
                  </span>
                )}
                {isBlocked && (
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
                )}

                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "rounded-lg flex items-center justify-center shrink-0",
                    compact ? "h-7 w-7" : "h-8 w-8",
                    isBlocked
                      ? "bg-destructive/10 border border-destructive/20"
                      : isCurrent
                        ? `${colors.activeBg} border ${colors.border}`
                        : "bg-secondary/40",
                  )}>
                    <Icon className={cn(
                      compact ? "h-3.5 w-3.5" : "h-4 w-4",
                      isBlocked ? "text-destructive" : isCurrent ? colors.active : isDone ? colors.done : "text-muted-foreground/20",
                    )} />
                  </div>
                  <div className="min-w-0">
                    <span className={cn(
                      "font-bold block leading-tight truncate",
                      compact ? "text-[12px]" : "text-[14px]",
                      isBlocked ? "text-destructive" : isCurrent ? colors.active : isDone ? "text-foreground/50" : "text-muted-foreground/25",
                    )}>
                      {stage.label}
                    </span>
                    {!compact && isCurrent && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5 block">
                        Current
                      </span>
                    )}
                    {!compact && isDone && (
                      <span className="text-[10px] text-muted-foreground/25 mt-0.5 block">Done</span>
                    )}
                    {!compact && isBlocked && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-destructive mt-0.5 block">
                        Blocked
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>

            {i < PIPELINE_STAGES.length - 1 && (
              <div className="flex items-center px-0.5 shrink-0">
                <ChevronRight className={cn(
                  compact ? "h-3.5 w-3.5" : "h-4 w-4",
                  isDone ? "text-muted-foreground/25" : "text-muted-foreground/10",
                )} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MINI PIPELINE — compact inline bar for project lists
   ═══════════════════════════════════════════════════════════════ */
interface MiniPipelineProps {
  currentStageIndex: number;
  blocked?: boolean;
  className?: string;
}

export function MiniPipeline({ currentStageIndex, blocked, className }: MiniPipelineProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {PIPELINE_STAGES.map((stage, i) => {
        const isCurrent = i === currentStageIndex;
        const isDone = currentStageIndex > i && currentStageIndex >= 0;
        const colors = STAGE_COLORS[stage.key];

        return (
          <div key={stage.key} className="flex items-center gap-1">
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all",
              isCurrent
                ? `${colors.activeBg} border ${colors.border}`
                : isDone
                  ? "bg-secondary/30"
                  : "",
            )}>
              <span className={cn(
                "w-2 h-2 rounded-full shrink-0",
                isCurrent && blocked ? "bg-destructive" :
                isCurrent ? cn(colors.dot, "animate-pulse") :
                isDone ? colors.dot + "/40" :
                "bg-muted-foreground/15",
              )} />
              <span className={cn(
                "text-[11px] font-semibold whitespace-nowrap",
                isCurrent ? colors.active :
                isDone ? "text-foreground/40" :
                "text-muted-foreground/20",
              )}>
                {stage.label}
              </span>
            </div>
            {i < PIPELINE_STAGES.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/10 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
