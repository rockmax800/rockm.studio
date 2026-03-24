import { Badge } from "@/components/ui/badge";
import { getStatusVariant } from "@/lib/status";
import { AlertTriangle, OctagonX } from "lucide-react";

const ROLE_SPRITES: Record<string, string> = {
  product_strategist: "/pixel/desk.png",
  solution_architect: "/pixel/board.png",
  frontend_builder: "/pixel/monitor.png",
  backend_implementer: "/pixel/server.png",
  backend_architect: "/pixel/server.png",
  reviewer: "/pixel/review.png",
  qa_agent: "/pixel/qa.png",
  release_coordinator: "/pixel/release.png",
};

interface PixelAgentProps {
  taskTitle: string;
  roleName: string | null;
  roleCode: string | null;
  state: string;
  latestRunState: string | null;
  hasPendingReview: boolean;
  successRate: number | null;
  hasPrediction?: boolean;
  predictionType?: string | null;
  employeeName?: string | null;
  employeeReputation?: number | null;
  employeeStatus?: string | null;
  isNewHire?: boolean;
  isExperiment?: boolean;
  isTopPerformer?: boolean;
  onClick: () => void;
}

export function PixelAgent({
  taskTitle,
  roleName,
  roleCode,
  state,
  latestRunState,
  hasPendingReview,
  successRate,
  hasPrediction,
  predictionType,
  employeeName,
  employeeReputation,
  employeeStatus,
  isNewHire,
  isExperiment,
  isTopPerformer,
  onClick,
}: PixelAgentProps) {
  const isBlocked = state === "blocked";
  const isEscalated = state === "escalated";
  const isRunning = latestRunState === "running" || latestRunState === "preparing";
  const isInProgress = state === "in_progress";

  const sprite = (roleCode && ROLE_SPRITES[roleCode]) || "/pixel/agent.png";

  const isInactive = employeeStatus === "inactive";

  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col items-center cursor-pointer group transition-colors duration-150 ${isInactive ? "opacity-30 grayscale" : ""}`}
      style={{ width: 68 }}
    >
      {/* Status indicators */}
      <div className="h-4 flex items-center justify-center gap-0.5">
        {isRunning && (
          <div className="flex gap-[2px]">
            <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        )}
        {isEscalated && <AlertTriangle className="h-3 w-3 text-destructive" />}
        {isBlocked && <OctagonX className="h-3 w-3 text-destructive" />}
        {hasPrediction && !isEscalated && !isBlocked && (
          <AlertTriangle className="h-3 w-3 text-status-amber" />
        )}
      </div>

      {/* Agent sprite */}
      <div
        className={`
          relative w-10 h-10 rounded-lg overflow-hidden border
          ${isBlocked ? "border-destructive/40 grayscale" : "border-border/40"}
        `}
      >
        <img
          src={sprite}
          alt={roleCode ?? "agent"}
          className="w-full h-full"
          style={{ imageRendering: "pixelated" }}
          loading="lazy"
        />
        {isBlocked && <div className="absolute inset-0 bg-muted/30 rounded-lg" />}
        {isInProgress && !isRunning && (
          <div className="absolute bottom-0 right-0 flex gap-[1px] p-[2px]">
            <span className="w-[3px] h-[3px] rounded-full bg-muted-foreground/60 animate-pulse" style={{ animationDelay: "0ms" }} />
            <span className="w-[3px] h-[3px] rounded-full bg-muted-foreground/60 animate-pulse" style={{ animationDelay: "200ms" }} />
          </div>
        )}
      </div>

      {/* Labels */}
      <div className="mt-0.5 flex flex-col items-center max-w-[68px]">
        {isNewHire && (
          <Badge variant="secondary" className="text-[6px] px-0.5 py-0 h-2.5 mb-0.5">NEW</Badge>
        )}
        {isExperiment && !isNewHire && (
          <Badge variant="secondary" className="text-[6px] px-0.5 py-0 h-2.5 mb-0.5">EXP</Badge>
        )}
        {isTopPerformer && !isNewHire && (
          <Badge variant="secondary" className="text-[6px] px-0.5 py-0 h-2.5 mb-0.5">⭐ TOP</Badge>
        )}
        {employeeName && (
          <span className="text-[8px] font-bold text-foreground truncate max-w-full">{employeeName}</span>
        )}
        {!employeeName && roleName && (
          <span className="text-[8px] font-medium text-muted-foreground truncate max-w-full">{roleName}</span>
        )}
        <span className="text-[8px] font-medium text-muted-foreground/60 truncate max-w-full leading-tight">
          {taskTitle.length > 14 ? taskTitle.slice(0, 14) + "…" : taskTitle}
        </span>
        <Badge variant={getStatusVariant(state)} className="text-[7px] px-1 py-0 h-3 mt-0.5 scale-90">
          {state.replace(/_/g, " ")}
        </Badge>
      </div>
    </div>
  );
}
