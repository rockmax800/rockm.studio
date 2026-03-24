// OfficeTeamStrip component

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
  idle: "text-muted-foreground/50",
};

export function OfficeTeamStrip({ agents }: OfficeTeamStripProps) {
  if (agents.length === 0) return null;

  return (
    <div className="bg-secondary rounded-[12px] border border-border px-3 py-2 overflow-x-auto">
      <div className="flex items-center gap-3">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center gap-2 px-2 py-1 rounded-lg bg-card border border-border shrink-0 min-w-[160px] max-w-[200px]"
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground">
                    {agent.code.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div
                  className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-card ${STATUS_DOT[agent.status]} ${
                    agent.isRunning ? "animate-pulse" : ""
                  }`}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[12px] font-semibold text-foreground truncate">{agent.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-medium ${STATUS_TEXT[agent.status]}`}>
                    {STATUS_LABEL[agent.status]}
                  </span>
                  {agent.taskTitle && (
                    <>
                      <span className="text-[10px] text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-muted-foreground truncate">{agent.taskTitle}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
