import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const STAGES = [
  { key: "intake", label: "Intake", states: ["draft"], href: "/presale/new" },
  { key: "blueprint", label: "Blueprint", states: ["scoped"], href: "/projects" },
  { key: "kickoff", label: "Kickoff", states: [], href: "/projects" },
  { key: "delivery", label: "Delivery", states: ["active", "blocked"], href: "/tasks" },
  { key: "review", label: "Review", states: ["in_review"], href: "/founder" },
  { key: "release", label: "Release", states: ["completed", "archived", "paused"], href: "/projects" },
] as const;

function resolveStageIndex(projectState?: string): number {
  if (!projectState) return -1;
  const idx = STAGES.findIndex((s) => (s.states as readonly string[]).includes(projectState));
  return idx >= 0 ? idx : -1;
}

const STAGE_COLORS: Record<string, { active: string; activeBg: string; done: string }> = {
  intake:    { active: "text-status-blue",           activeBg: "bg-status-blue/10",          done: "text-status-blue/50" },
  blueprint: { active: "text-lifecycle-review",      activeBg: "bg-lifecycle-review/10",     done: "text-lifecycle-review/50" },
  kickoff:   { active: "text-status-cyan",           activeBg: "bg-status-cyan/10",          done: "text-status-cyan/50" },
  delivery:  { active: "text-status-amber",          activeBg: "bg-status-amber/10",         done: "text-status-amber/50" },
  review:    { active: "text-lifecycle-rework",       activeBg: "bg-lifecycle-rework/10",     done: "text-lifecycle-rework/50" },
  release:   { active: "text-status-green",          activeBg: "bg-status-green/10",         done: "text-status-green/50" },
};

const DOT_COLORS: Record<string, { active: string; done: string }> = {
  intake:    { active: "bg-status-blue",        done: "bg-status-blue/40" },
  blueprint: { active: "bg-lifecycle-review",   done: "bg-lifecycle-review/40" },
  kickoff:   { active: "bg-status-cyan",        done: "bg-status-cyan/40" },
  delivery:  { active: "bg-status-amber",       done: "bg-status-amber/40" },
  review:    { active: "bg-lifecycle-rework",    done: "bg-lifecycle-rework/40" },
  release:   { active: "bg-status-green",       done: "bg-status-green/40" },
};

interface ProductionFlowProps {
  projectState?: string;
  className?: string;
  onStageClick?: (stageKey: string) => void;
}

export function ProductionFlow({ projectState, className, onStageClick }: ProductionFlowProps) {
  const currentIdx = resolveStageIndex(projectState);

  return (
    <div className={cn("flex items-center gap-1 text-[13px] font-semibold select-none", className)}>
      {STAGES.map((stage, i) => {
        const isCurrent = i === currentIdx;
        const isDone = currentIdx > i;
        const isFuture = currentIdx < i || currentIdx === -1;

        const colors = STAGE_COLORS[stage.key];
        const dots = DOT_COLORS[stage.key];

        const dotClass = isCurrent
          ? cn(dots.active, "ring-2 ring-offset-2 ring-offset-card")
          : isDone
            ? dots.done
            : "bg-muted-foreground/15";

        const textClass = isCurrent
          ? cn(colors.active, "font-bold")
          : isDone
            ? colors.done
            : "text-muted-foreground/30";

        const bgClass = isCurrent ? colors.activeBg : "";

        const content = (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onStageClick?.(stage.key)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
                bgClass,
                !isCurrent && "hover:bg-secondary/50",
              )}
            >
              <span className={cn("w-2.5 h-2.5 rounded-full shrink-0 transition-all", dotClass)} />
              <span className={cn("whitespace-nowrap", textClass)}>{stage.label}</span>
            </button>
            {i < STAGES.length - 1 && (
              <ChevronRight className={cn(
                "w-3.5 h-3.5 shrink-0",
                isDone ? "text-muted-foreground/30" : "text-muted-foreground/12"
              )} />
            )}
          </div>
        );

        return (
          <Link key={stage.key} to={stage.href}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}
