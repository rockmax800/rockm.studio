import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

const STAGES = [
  { key: "intake", label: "Intake", states: ["draft"] },
  { key: "kickoff", label: "Kickoff", states: ["scoped"] },
  { key: "blueprint", label: "Blueprint", states: [] },
  { key: "delivery", label: "Delivery", states: ["active", "blocked"] },
  { key: "review", label: "Review", states: ["in_review"] },
  { key: "release", label: "Release", states: ["completed", "archived", "paused"] },
] as const;

function resolveStageIndex(projectState?: string): number {
  if (!projectState) return -1;
  const idx = STAGES.findIndex((s) => (s.states as readonly string[]).includes(projectState));
  return idx >= 0 ? idx : -1;
}

const stageColors: Record<string, { active: string; done: string }> = {
  intake:    { active: "bg-blue-500",   done: "bg-blue-400/60" },
  kickoff:   { active: "bg-cyan-500",   done: "bg-cyan-400/60" },
  blueprint: { active: "bg-violet-500", done: "bg-violet-400/60" },
  delivery:  { active: "bg-amber-500",  done: "bg-amber-400/60" },
  review:    { active: "bg-orange-500",  done: "bg-orange-400/60" },
  release:   { active: "bg-green-500",  done: "bg-green-400/60" },
};

interface ProductionFlowProps {
  projectState?: string;
  className?: string;
  onStageClick?: (stageKey: string) => void;
}

export function ProductionFlow({ projectState, className, onStageClick }: ProductionFlowProps) {
  const currentIdx = resolveStageIndex(projectState);

  return (
    <div className={cn("flex items-center gap-0.5 text-[11px] font-medium select-none", className)}>
      {STAGES.map((stage, i) => {
        const isCurrent = i === currentIdx;
        const isDone = currentIdx > i;
        const isFuture = currentIdx < i || currentIdx === -1;

        const colors = stageColors[stage.key];
        const dotClass = isCurrent
          ? cn(colors.active, "ring-2 ring-offset-1 ring-offset-background")
          : isDone
            ? colors.done
            : "bg-muted-foreground/20";

        return (
          <div key={stage.key} className="flex items-center gap-0.5">
            <button
              onClick={() => onStageClick?.(stage.key)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                isCurrent && "bg-secondary",
                !isCurrent && !isDone && "opacity-50",
                isDone && "opacity-75",
                "hover:bg-secondary/80"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full shrink-0", dotClass)} />
              <span
                className={cn(
                  "whitespace-nowrap",
                  isCurrent && "text-foreground font-semibold",
                  isDone && "text-muted-foreground",
                  isFuture && "text-muted-foreground/50"
                )}
              >
                {stage.label}
              </span>
            </button>
            {i < STAGES.length - 1 && (
              <ChevronRight
                className={cn(
                  "w-3 h-3 shrink-0",
                  isDone ? "text-muted-foreground/50" : "text-muted-foreground/20"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
