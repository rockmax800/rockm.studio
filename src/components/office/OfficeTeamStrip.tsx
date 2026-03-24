import { Link } from "react-router-dom";
import { getPersona, getStatusMeta } from "@/lib/personas";

interface AgentPresence {
  id: string;
  name: string;
  code: string;
  status: "executing" | "reviewing" | "waiting" | "blocked" | "idle";
  taskTitle: string | null;
  isRunning: boolean;
  employeeId?: string | null;
}

interface OfficeTeamStripProps {
  agents: AgentPresence[];
}

const STATUS_META: Record<string, { label: string; dot: string; chipCls: string }> = {
  executing: { label: "Executing",  dot: "bg-blue-500 animate-pulse", chipCls: "bg-blue-100 text-blue-700" },
  reviewing: { label: "Reviewing",  dot: "bg-violet-500",             chipCls: "bg-violet-100 text-violet-700" },
  waiting:   { label: "Waiting",    dot: "bg-amber-500",              chipCls: "bg-amber-100 text-amber-700" },
  blocked:   { label: "Blocked",    dot: "bg-red-500",                chipCls: "bg-red-100 text-red-700" },
  idle:      { label: "Idle",       dot: "bg-muted-foreground/25",    chipCls: "bg-secondary text-muted-foreground" },
};

export function OfficeTeamStrip({ agents }: OfficeTeamStripProps) {
  if (agents.length === 0) return null;

  // Show all agents, active ones first
  const sorted = [...agents].sort((a, b) => {
    if (a.status === "idle" && b.status !== "idle") return 1;
    if (a.status !== "idle" && b.status === "idle") return -1;
    return 0;
  });

  const activeCount = agents.filter(a => a.status !== "idle").length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[13px] font-bold text-foreground">Team Presence</span>
        <span className="text-[12px] text-muted-foreground">{activeCount} active · {agents.length - activeCount} idle</span>
      </div>
      <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1">
        {sorted.map((agent) => {
          const persona = getPersona(agent.code);
          const sm = STATUS_META[agent.status];
          const isActive = agent.status !== "idle";

          const card = (
            <div className={`shrink-0 flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all min-w-[180px] max-w-[240px] ${
              agent.status === "blocked"
                ? "bg-red-50/50 border-red-200/60"
                : agent.status === "executing"
                  ? "bg-blue-50/30 border-blue-200/40"
                  : isActive
                    ? "bg-card border-border"
                    : "bg-secondary/30 border-border/40"
            } hover:-translate-y-0.5 hover:shadow-sm cursor-pointer`}>
              {/* Avatar */}
              <div className="relative shrink-0">
                <img src={persona.avatar} alt={agent.name}
                  className={`h-10 w-10 rounded-xl object-cover ring-2 ${persona.ringClass} ring-offset-1 ring-offset-background`}
                  width={40} height={40} loading="lazy" />
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${sm.dot}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-bold text-foreground truncate block leading-tight">{agent.name}</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sm.chipCls}`}>
                    {sm.label}
                  </span>
                </div>
                {agent.taskTitle && (
                  <p className="text-[11px] text-muted-foreground truncate mt-1 leading-tight">{agent.taskTitle}</p>
                )}
              </div>
            </div>
          );

          if (agent.employeeId) {
            return <Link key={agent.id} to={`/employees/${agent.employeeId}`}>{card}</Link>;
          }
          return <div key={agent.id}>{card}</div>;
        })}
      </div>
    </div>
  );
}
