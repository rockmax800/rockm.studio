import { cn } from "@/lib/utils";
import { FlaskConical, CheckCircle2, HelpCircle } from "lucide-react";

export type ResearchPhase = "researching" | "evidence-gathering" | "ready-to-execute" | "unknown";

interface ResearchModeBadgeProps {
  phase: ResearchPhase;
  detail?: string;
  className?: string;
  compact?: boolean;
}

const PHASE_CONFIG: Record<ResearchPhase, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  description: string;
}> = {
  "researching": {
    label: "Research Mode",
    icon: FlaskConical,
    color: "text-status-amber",
    bg: "bg-status-amber/8 border-status-amber/20",
    description: "Still learning — not ready for execution decisions.",
  },
  "evidence-gathering": {
    label: "Gathering Evidence",
    icon: HelpCircle,
    color: "text-status-blue",
    bg: "bg-status-blue/8 border-status-blue/20",
    description: "Collecting data to validate assumptions before committing.",
  },
  "ready-to-execute": {
    label: "Ready to Execute",
    icon: CheckCircle2,
    color: "text-status-green",
    bg: "bg-status-green/8 border-status-green/20",
    description: "Evidence sufficient — direction can be frozen.",
  },
  "unknown": {
    label: "Phase Unknown",
    icon: HelpCircle,
    color: "text-muted-foreground",
    bg: "bg-muted/40 border-border/30",
    description: "Not enough context to determine readiness.",
  },
};

export function ResearchModeBadge({ phase, detail, className, compact = false }: ResearchModeBadgeProps) {
  const config = PHASE_CONFIG[phase];
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-semibold",
        config.bg, config.color, className,
      )}>
        <Icon className="h-3 w-3" />
        {config.label}
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border",
      config.bg, className,
    )}>
      <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", config.color)} />
      <div className="min-w-0">
        <p className={cn("text-[12px] font-bold", config.color)}>{config.label}</p>
        <p className="text-[11px] text-muted-foreground/60 mt-0.5 leading-relaxed">
          {detail ?? config.description}
        </p>
      </div>
    </div>
  );
}
