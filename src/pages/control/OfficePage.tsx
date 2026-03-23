import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { PixelZone } from "@/components/office/PixelZone";
import { PixelAgent } from "@/components/office/PixelAgent";
import { OfficeFeed } from "@/components/office/OfficeFeed";
import { OfficeTopBar } from "@/components/office/OfficeTopBar";
import { TeamZone } from "@/components/office/TeamZone";
import { useOfficeData, useRefreshOffice, useOfficeRealtime } from "@/hooks/use-office-data";
import { RefreshCw, Building2 } from "lucide-react";

const ZONES = [
  { key: "ready", label: "Ready", states: ["ready", "assigned"], icon: "/pixel/desk.png", col: 1, row: 1 },
  { key: "in_progress", label: "In Progress", states: ["in_progress"], icon: "/pixel/monitor.png", col: 2, row: 1 },
  { key: "waiting_review", label: "Review Room", states: ["waiting_review"], icon: "/pixel/review.png", col: 3, row: 1 },
  { key: "rework", label: "Rework", states: ["rework_required"], icon: "/pixel/desk.png", col: 1, row: 2 },
  { key: "escalated", label: "Escalated", states: ["escalated"], icon: "/pixel/qa.png", col: 2, row: 2 },
  { key: "blocked", label: "Blocked", states: ["blocked"], icon: "/pixel/server.png", col: 3, row: 2 },
  { key: "approved", label: "Approved", states: ["approved"], icon: "/pixel/review.png", col: 1, row: 3 },
  { key: "done", label: "Done", states: ["done"], icon: "/pixel/release.png", col: 2, row: 3 },
  { key: "qa", label: "QA Lab", states: [], icon: "/pixel/qa.png", col: 3, row: 3 },
  { key: "release", label: "Release Room", states: [], icon: "/pixel/release.png", col: 1, row: 4 },
] as const;

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
  role_code: string | null;
  role_name: string | null;
  role_success_rate: number | null;
  role_performance_score: number | null;
  role_team_id?: string | null;
  has_prediction: boolean;
  prediction_type: string | null;
}

type FeedMode = "office" | "activity";
type ViewMode = "zones" | "teams";

export default function OfficePage() {
  const { data, isLoading, error } = useOfficeData();
  useOfficeRealtime();
  const refresh = useRefreshOffice();
  const navigate = useNavigate();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [feedMode, setFeedMode] = useState<FeedMode>("office");
  const [viewMode, setViewMode] = useState<ViewMode>("zones");

  const filteredTasks: TaskCard[] = data
    ? selectedProjectId
      ? data.allTasks.filter((t: TaskCard) => t.project_id === selectedProjectId)
      : data.allTasks
    : [];

  const qaTasks = filteredTasks.filter(t => t.domain === "qa" && !["done", "cancelled"].includes(t.state));
  const releaseTasks = filteredTasks.filter(t => t.domain === "release" && !["done", "cancelled"].includes(t.state));

  const stats = useMemo(() => {
    if (!data) return { activeTasks: 0, runningAgents: 0, pendingApprovals: 0, providerCount: 0 };
    const active = filteredTasks.filter(t => !["done", "cancelled"].includes(t.state)).length;
    const running = filteredTasks.filter(t => t.latest_run_state === "running" || t.latest_run_state === "preparing").length;
    const approvals = filteredTasks.filter(t => t.has_pending_approval).length;
    return { activeTasks: active, runningAgents: running, pendingApprovals: approvals, providerCount: data.projects.length };
  }, [data, filteredTasks]);

  const hasTeams = (data?.teams ?? []).length > 0;

  return (
    <AppLayout title="Office">
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive">Error: {(error as Error).message}</p>}
      {data && (
        <div className="flex flex-col gap-3 h-[calc(100vh-6rem)]">
          <OfficeTopBar
            {...stats}
            leanMode={data.leanMode}
            pendingInboxCount={data.pendingInboxCount}
            roleOverloads={data.roleOverloads}
          />

          <div className="flex gap-3 flex-1 min-h-0">
            {/* LEFT — Project selector */}
            <div className="w-48 shrink-0 flex flex-col gap-1.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Projects</span>
                <div className="flex items-center gap-0.5">
                  {hasTeams && (
                    <Button
                      size="icon"
                      variant={viewMode === "teams" ? "default" : "ghost"}
                      className="h-5 w-5"
                      onClick={() => setViewMode(viewMode === "teams" ? "zones" : "teams")}
                      title="Toggle team view"
                    >
                      <Building2 className="h-3 w-3" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={refresh}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="space-y-1 pr-1">
                  <ProjectItem
                    name="All Projects"
                    count={data.allTasks.length}
                    active={!selectedProjectId}
                    onClick={() => setSelectedProjectId(null)}
                  />
                  {data.projects.map((p: any) => (
                    <ProjectItem
                      key={p.id}
                      name={p.name}
                      state={p.state}
                      count={p.tasks.length}
                      active={selectedProjectId === p.id}
                      onClick={() => setSelectedProjectId(p.id)}
                      onDoubleClick={() => navigate(`/control/projects/${p.id}`)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* CENTER */}
            <div className="flex-1 overflow-auto">
              {viewMode === "teams" && hasTeams ? (
                /* PART 7 — Team-based visualization */
                <div className="space-y-4">
                  {data.teams.map((team: any) => {
                    const teamTasks = filteredTasks.filter(t => t.role_team_id === team.id);
                    return (
                      <TeamZone
                        key={team.id}
                        teamName={team.name}
                        focusDomain={team.focus_domain}
                        loadStatus={team.load_status}
                        activeTasks={team.active_tasks}
                        maxCapacity={team.max_capacity}
                      >
                        {teamTasks.map((task) => (
                          <PixelAgent
                            key={task.id}
                            taskTitle={task.title}
                            roleName={task.role_name}
                            roleCode={task.role_code}
                            state={task.state}
                            latestRunState={task.latest_run_state}
                            hasPendingReview={task.has_pending_review}
                            successRate={task.role_success_rate}
                            hasPrediction={task.has_prediction}
                            predictionType={task.prediction_type}
                            onClick={() => navigate(`/control/tasks/${task.id}`)}
                          />
                        ))}
                      </TeamZone>
                    );
                  })}
                  {/* Unassigned team tasks */}
                  {(() => {
                    const unassigned = filteredTasks.filter(t => !t.role_team_id && !["done", "cancelled"].includes(t.state));
                    if (unassigned.length === 0) return null;
                    return (
                      <TeamZone teamName="Unassigned" focusDomain="mixed" loadStatus="balanced" activeTasks={unassigned.length} maxCapacity={0}>
                        {unassigned.map((task) => (
                          <PixelAgent
                            key={task.id}
                            taskTitle={task.title}
                            roleName={task.role_name}
                            roleCode={task.role_code}
                            state={task.state}
                            latestRunState={task.latest_run_state}
                            hasPendingReview={task.has_pending_review}
                            successRate={task.role_success_rate}
                            hasPrediction={task.has_prediction}
                            predictionType={task.prediction_type}
                            onClick={() => navigate(`/control/tasks/${task.id}`)}
                          />
                        ))}
                      </TeamZone>
                    );
                  })()}
                </div>
              ) : (
                /* Standard zone-based view */
                <div
                  className="grid gap-3 h-full"
                  style={{
                    gridTemplateColumns: "repeat(3, minmax(170px, 1fr))",
                    gridTemplateRows: "repeat(4, minmax(120px, 1fr))",
                  }}
                >
                  {ZONES.map((zone) => {
                    let zoneTasks: TaskCard[];
                    if (zone.key === "qa") {
                      zoneTasks = qaTasks;
                    } else if (zone.key === "release") {
                      zoneTasks = releaseTasks;
                    } else {
                      zoneTasks = filteredTasks.filter((t) =>
                        (zone.states as readonly string[]).includes(t.state)
                      );
                    }
                    return (
                      <div key={zone.key} style={{ gridColumn: zone.col, gridRow: zone.row }}>
                        <PixelZone label={zone.label} zoneKey={zone.key} icon={zone.icon} count={zoneTasks.length}>
                          {zoneTasks.map((task) => (
                            <PixelAgent
                              key={task.id}
                              taskTitle={task.title}
                              roleName={task.role_name}
                              roleCode={task.role_code}
                              state={task.state}
                              latestRunState={task.latest_run_state}
                              hasPendingReview={task.has_pending_review}
                              successRate={task.role_success_rate}
                              hasPrediction={task.has_prediction}
                              predictionType={task.prediction_type}
                              onClick={() => navigate(`/control/tasks/${task.id}`)}
                            />
                          ))}
                        </PixelZone>
                      </div>
                    );
                  })}
                  <div style={{ gridColumn: 2, gridRow: 4 }} className="rounded-lg border-2 border-dashed border-border/30 flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground/40 font-mono">— — —</span>
                  </div>
                  <div style={{ gridColumn: 3, gridRow: 4 }} className="rounded-lg border-2 border-dashed border-border/30 flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground/40 font-mono">— — —</span>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT — Live Feed */}
            <div className="w-52 shrink-0">
              <OfficeFeed
                officeEvents={data.officeEvents ?? []}
                activityEvents={data.recentEvents ?? []}
                feedMode={feedMode}
                onFeedModeChange={setFeedMode}
              />
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function ProjectItem({
  name, state, count, active, onClick, onDoubleClick,
}: {
  name: string; state?: string; count: number; active: boolean; onClick: () => void; onDoubleClick?: () => void;
}) {
  return (
    <div
      className={`rounded border p-2 cursor-pointer text-[11px] transition-colors ${
        active ? "bg-primary/10 border-primary/30 font-medium" : "hover:bg-muted/50"
      }`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <div className="flex items-center justify-between">
        <span className="truncate">{name}</span>
        {state && <StatusBadge state={state} className="text-[8px] scale-75" />}
      </div>
      <p className="text-[9px] text-muted-foreground">{count} tasks</p>
    </div>
  );
}
