import { Badge } from "@/components/ui/badge";
import { getStatusVariant } from "@/lib/status";
import { AlertTriangle, OctagonX } from "lucide-react";

// PART 1 — Role-specific sprite mapping
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
  onClick,
}: PixelAgentProps) {
  const isBlocked = state === "blocked";
  const isEscalated = state === "escalated";
  const isRunning = latestRunState === "running" || latestRunState === "preparing";
  const isInProgress = state === "in_progress";
  const isWaitingReview = state === "waiting_review";

  // PART 1 — Role-specific sprite
  const sprite = (roleCode && ROLE_SPRITES[roleCode]) || "/pixel/agent.png";

  // PART 8 — Performance heatmap tint
  let perfOverlay = "";
  if (successRate !== null && successRate !== undefined) {
    if (successRate < 0.4) perfOverlay = "bg-red-500/15";
    else if (successRate >= 0.8) perfOverlay = "bg-emerald-500/10";
  }

  return (
    <div
      onClick={onClick}
      className="relative flex flex-col items-center cursor-pointer group transition-transform duration-200 hover:scale-105"
      style={{ width: 68 }}
    >
      {/* Visual indicators above sprite */}
      <div className="h-4 flex items-center justify-center gap-0.5">
        {/* PART 2 — Running dots animation */}
        {isRunning && (
          <div className="flex gap-[2px]">
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        )}
        {/* PART 4 — Escalation flashing warning */}
        {isEscalated && <AlertTriangle className="h-3 w-3 text-amber-500 animate-ping" />}
        {isBlocked && <OctagonX className="h-3 w-3 text-destructive" />}
      </div>

      {/* Agent sprite with overlays */}
      <div
        className={`
          relative w-10 h-10 rounded overflow-hidden
          ${isBlocked ? "ring-2 ring-destructive/60 grayscale" : ""}
          ${isWaitingReview ? "ring-2 ring-purple-400/50 shadow-[0_0_8px_hsl(270,60%,50%,0.3)]" : ""}
        `}
      >
        <img
          src={sprite}
          alt={roleCode ?? "agent"}
          className="w-full h-full"
          style={{ imageRendering: "pixelated" }}
          loading="lazy"
        />
        {/* PART 5 — Blocked gray overlay + red border */}
        {isBlocked && (
          <div className="absolute inset-0 bg-muted/40 rounded" />
        )}
        {/* PART 8 — Performance heatmap overlay */}
        {perfOverlay && (
          <div className={`absolute inset-0 ${perfOverlay} rounded pointer-events-none`} />
        )}
        {/* PART 2 — Typing animation for in_progress */}
        {isInProgress && !isRunning && (
          <div className="absolute bottom-0 right-0 flex gap-[1px] p-[2px]">
            <span className="w-[3px] h-[3px] rounded-full bg-foreground/60 animate-pulse" style={{ animationDelay: "0ms" }} />
            <span className="w-[3px] h-[3px] rounded-full bg-foreground/60 animate-pulse" style={{ animationDelay: "200ms" }} />
            <span className="w-[3px] h-[3px] rounded-full bg-foreground/60 animate-pulse" style={{ animationDelay: "400ms" }} />
          </div>
        )}
      </div>

      {/* Labels */}
      <div className="mt-0.5 flex flex-col items-center max-w-[68px]">
        {roleName && (
          <span className="text-[8px] font-medium text-muted-foreground truncate max-w-full">
            {roleName}
          </span>
        )}
        <span className="text-[8px] font-medium text-foreground/80 truncate max-w-full leading-tight">
          {taskTitle.length > 14 ? taskTitle.slice(0, 14) + "…" : taskTitle}
        </span>
        <Badge variant={getStatusVariant(state)} className="text-[7px] px-1 py-0 h-3 mt-0.5 scale-90">
          {state.replace(/_/g, " ")}
        </Badge>
      </div>
    </div>
  );
}
