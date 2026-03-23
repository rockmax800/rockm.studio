import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/StatusBadge";
import { useOfficeData, useRefreshOffice } from "@/hooks/use-office-data";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw, Eye, GitBranch, ShieldCheck, Stamp } from "lucide-react";

const ZONES = [
  { key: "ready", label: "Ready", states: ["ready"] },
  { key: "in_progress", label: "In Progress", states: ["assigned", "in_progress"] },
  { key: "waiting_review", label: "Waiting Review", states: ["waiting_review"] },
  { key: "rework", label: "Rework", states: ["rework_required"] },
  { key: "escalated", label: "Escalated", states: ["escalated"] },
  { key: "approved", label: "Approved", states: ["approved"] },
  { key: "done", label: "Done", states: ["done"] },
  { key: "blocked", label: "Blocked", states: ["blocked"] },
] as const;

function zoneBg(key: string) {
  switch (key) {
    case "ready": return "bg-blue-500/5 border-blue-500/20";
    case "in_progress": return "bg-yellow-500/5 border-yellow-500/20";
    case "waiting_review": return "bg-purple-500/5 border-purple-500/20";
    case "rework": return "bg-orange-500/5 border-orange-500/20";
    case "escalated": return "bg-red-500/5 border-red-500/20";
    case "approved": return "bg-green-500/5 border-green-500/20";
    case "done": return "bg-emerald-500/5 border-emerald-500/20";
    case "blocked": return "bg-red-500/5 border-red-500/20";
    default: return "bg-muted/30 border-border";
  }
}

function zoneHeaderColor(key: string) {
  switch (key) {
    case "ready": return "text-blue-600 dark:text-blue-400";
    case "in_progress": return "text-yellow-600 dark:text-yellow-400";
    case "waiting_review": return "text-purple-600 dark:text-purple-400";
    case "rework": return "text-orange-600 dark:text-orange-400";
    case "escalated": return "text-red-600 dark:text-red-400";
    case "approved": return "text-green-600 dark:text-green-400";
    case "done": return "text-emerald-600 dark:text-emerald-400";
    case "blocked": return "text-red-600 dark:text-red-400";
    default: return "text-muted-foreground";
  }
}

interface TaskCard {
  id: string;
  title: string;
  state: string;
  project_id: string;
  owner_role_id: string | null;
  domain: string;
  priority: string;
  latest_run_state: string | null;
  has_pending_review: boolean;
  has_pending_approval: boolean;
}

function OfficeTaskCard({ task, onClick }: { task: TaskCard; onClick: () => void }) {
  return (
    <div
      className="rounded-md border bg-card p-3 cursor-pointer hover:shadow-sm hover:border-primary/30 transition-shadow"
      onClick={onClick}
    >
      <p className="text-sm font-medium leading-tight truncate">{task.title}</p>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <StatusBadge state={task.state} />
        <Badge variant="neutral" className="text-[10px]">{task.domain}</Badge>
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        {task.latest_run_state && (
          <span className="flex items-center gap-0.5">
            <GitBranch className="h-3 w-3" />
            {task.latest_run_state}
          </span>
        )}
        {task.has_pending_review && (
          <span className="flex items-center gap-0.5 text-purple-500">
            <ShieldCheck className="h-3 w-3" />
            review
          </span>
        )}
        {task.has_pending_approval && (
          <span className="flex items-center gap-0.5 text-amber-500">
            <Stamp className="h-3 w-3" />
            approval
          </span>
        )}
      </div>
    </div>
  );
}

export default function OfficePage() {
  const { data, isLoading, error } = useOfficeData();
  const refresh = useRefreshOffice();
  const navigate = useNavigate();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const filteredTasks: TaskCard[] = data
    ? selectedProjectId
      ? data.allTasks.filter((t: TaskCard) => t.project_id === selectedProjectId)
      : data.allTasks
    : [];

  return (
    <AppLayout title="Office">
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive">Error: {(error as Error).message}</p>}
      {data && (
        <div className="flex gap-4 h-[calc(100vh-8rem)]">
          {/* LEFT — Projects */}
          <div className="w-56 shrink-0 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Projects</h3>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={refresh}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-1.5 pr-2">
                <div
                  className={`rounded-md border p-2.5 cursor-pointer text-sm transition-colors ${
                    !selectedProjectId ? "bg-primary/10 border-primary/30 font-medium" : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedProjectId(null)}
                >
                  All Projects
                  <span className="ml-1 text-xs text-muted-foreground">({data.allTasks.length})</span>
                </div>
                {data.projects.map((p: any) => (
                  <div
                    key={p.id}
                    className={`rounded-md border p-2.5 cursor-pointer text-sm transition-colors ${
                      selectedProjectId === p.id ? "bg-primary/10 border-primary/30 font-medium" : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedProjectId(p.id)}
                    onDoubleClick={() => navigate(`/control/projects/${p.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{p.name}</span>
                      <StatusBadge state={p.state} className="text-[10px] scale-90" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.tasks.length} tasks</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* CENTER — Workflow Zones */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-3 h-full min-w-max">
              {ZONES.map((zone) => {
                const zoneTasks = filteredTasks.filter((t) => (zone.states as readonly string[]).includes(t.state));
                return (
                  <div
                    key={zone.key}
                    className={`w-52 shrink-0 rounded-lg border p-3 flex flex-col ${zoneBg(zone.key)}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={`text-xs font-semibold uppercase tracking-wider ${zoneHeaderColor(zone.key)}`}>
                        {zone.label}
                      </h4>
                      <span className="text-xs text-muted-foreground font-mono">{zoneTasks.length}</span>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="space-y-2 pr-1">
                        {zoneTasks.map((task) => (
                          <OfficeTaskCard
                            key={task.id}
                            task={task}
                            onClick={() => navigate(`/control/tasks/${task.id}`)}
                          />
                        ))}
                        {zoneTasks.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">Empty</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT — Activity Feed */}
          <div className="w-64 shrink-0 flex flex-col">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Activity</h3>
            <ScrollArea className="flex-1">
              <div className="space-y-1 pr-2">
                {data.recentEvents.map((e: any) => (
                  <div key={e.id} className="rounded-md border bg-card p-2.5">
                    <p className="text-xs font-medium">{e.event_type}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">{e.entity_type} · {e.actor_type}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
                {data.recentEvents.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No activity</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
