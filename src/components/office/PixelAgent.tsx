import { Badge } from "@/components/ui/badge";
import { getStatusVariant } from "@/lib/status";
import { Loader2, AlertTriangle, OctagonX } from "lucide-react";
import agentImg from "/pixel/agent.png";

interface PixelAgentProps {
  taskTitle: string;
  roleName: string | null;
  state: string;
  latestRunState: string | null;
  hasPendingReview: boolean;
  onClick: () => void;
}

export function PixelAgent({
  taskTitle,
  roleName,
  state,
  latestRunState,
  hasPendingReview,
  onClick,
}: PixelAgentProps) {
  const isBlocked = state === "blocked";
  const isEscalated = state === "escalated";
  const isRunning = latestRunState === "running" || latestRunState === "preparing";
  const isWaitingReview = state === "waiting_review";

  return (
    <div
      onClick={onClick}
      className={`
        relative flex flex-col items-center cursor-pointer group
        transition-transform duration-200 hover:scale-105
        ${isBlocked ? "animate-pulse" : ""}
      `}
      style={{ width: 64 }}
    >
      {/* Visual indicators above sprite */}
      <div className="h-4 flex items-center justify-center gap-0.5">
        {isRunning && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
        {isEscalated && <AlertTriangle className="h-3 w-3 text-amber-500" />}
        {isBlocked && <OctagonX className="h-3 w-3 text-destructive" />}
      </div>

      {/* Agent sprite */}
      <div
        className={`
          relative w-10 h-10 rounded
          ${isBlocked ? "ring-2 ring-destructive/60 animate-[pixel-blink_1s_ease-in-out_infinite]" : ""}
          ${isWaitingReview ? "ring-2 ring-purple-400/50 shadow-[0_0_8px_hsl(270,60%,50%,0.3)]" : ""}
        `}
      >
        <img
          src={agentImg}
          alt="agent"
          className="w-full h-full"
          style={{ imageRendering: "pixelated" }}
          loading="lazy"
        />
      </div>

      {/* Labels */}
      <div className="mt-0.5 flex flex-col items-center max-w-[64px]">
        {roleName && (
          <span className="text-[8px] font-medium text-muted-foreground truncate max-w-full">
            {roleName}
          </span>
        )}
        <span className="text-[8px] font-medium text-foreground/80 truncate max-w-full leading-tight">
          {taskTitle.length > 12 ? taskTitle.slice(0, 12) + "…" : taskTitle}
        </span>
        <Badge variant={getStatusVariant(state)} className="text-[7px] px-1 py-0 h-3 mt-0.5 scale-90">
          {state.replace(/_/g, " ")}
        </Badge>
      </div>
    </div>
  );
}
