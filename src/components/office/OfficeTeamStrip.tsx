interface AgentPresence {
  id: string;
  name: string;
  code: string;
  status: "executing" | "reviewing" | "waiting" | "blocked" | "idle";
  taskTitle: string | null;
  isRunning: boolean;
}

interface OfficeTeamStripProps {
  agents: AgentPresence[];
}

const STATUS_DOT: Record<string, string> = {
  executing: "bg-status-cyan",
  reviewing: "bg-lifecycle-review",
  waiting: "bg-status-amber",
  blocked: "bg-status-red",
  idle: "bg-muted",
};

const STATUS_LABEL: Record<string, string> = {
  executing: "Executing",
  reviewing: "Reviewing",
  waiting: "Waiting",
  blocked: "Blocked",
  idle: "Idle",
};

const STATUS_TEXT: Record<string, string> = {
  executing: "text-status-cyan",
  reviewing: "text-lifecycle-review",
  waiting: "text-status-amber",
  blocked: "text-status-red",
  idle: "text-muted-foreground/40",
};

export function OfficeTeamStrip({ agents }: OfficeTeamStripProps) {
  // Only show agents with real activity
  const activeAgents = agents.filter((a) => a.status !== "idle");
  if (activeAgents.length === 0 && agents.length === 0) return null;

  const displayAgents = activeAgents.length > 0 ? activeAgents : agents.slice(0, 6);

  return (
    <div className="bg-card rounded-[12px] border border-border px-3 py-2 overflow-x-auto">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-1">Team</span>
        {displayAgents.map((agent) => (
          <div
            key={agent.id}
            className={`flex items-center gap-2 px-2 py-1 rounded-lg shrink-0 min-w-[140px] max-w-[200px] border ${
              agent.status === "blocked"
                ? "bg-status-red/3 border-status-red/20"
                : agent.status === "executing"
                  ? "bg-status-cyan/3 border-status-cyan/20"
                  : "bg-secondary border-transparent"
            }`}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                <span className="text-[9px] font-mono font-bold text-muted-foreground">
                  {agent.code.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div
                className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-card ${STATUS_DOT[agent.status]} ${
                  agent.isRunning ? "animate-pulse" : ""
                }`}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-foreground truncate block">{agent.name}</span>
              <div className="flex items-center gap-1">
                <span className={`text-[9px] font-bold uppercase tracking-wider ${STATUS_TEXT[agent.status]}`}>
                  {STATUS_LABEL[agent.status]}
                </span>
                {agent.taskTitle && (
                  <>
                    <span className="text-[9px] text-muted-foreground/30">·</span>
                    <span className="text-[9px] text-muted-foreground truncate">{agent.taskTitle}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {agents.length > displayAgents.length && (
          <span className="text-[10px] text-muted-foreground/50 shrink-0">
            +{agents.length - displayAgents.length} idle
          </span>
        )}
      </div>
    </div>
  );
}
