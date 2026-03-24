import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useOfficeData, useOfficeRealtime } from "@/hooks/use-office-data";
import { OfficeStatusStrip } from "@/components/office/OfficeStatusStrip";
import { LifecycleRoom } from "@/components/office/LifecycleRoom";
import { OfficeEventStream } from "@/components/office/OfficeEventStream";
import { OfficeTeamStrip } from "@/components/office/OfficeTeamStrip";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";
import type { OfficeTaskCardData } from "@/components/office/OfficeTaskCard";

const ROOMS = [
  { key: "ready", label: "Ready", states: ["ready", "assigned"] },
  { key: "in_progress", label: "In Progress", states: ["in_progress"] },
  { key: "waiting_review", label: "Review", states: ["waiting_review"] },
  { key: "rework", label: "Rework", states: ["rework_required"] },
  { key: "blocked", label: "Blocked", states: ["blocked"] },
  { key: "escalated", label: "Escalated", states: ["escalated"] },
  { key: "validated", label: "Validated", states: ["validated"] },
  { key: "done", label: "Done", states: ["done"] },
  { key: "release", label: "Release", states: [] },
] as const;

export default function OfficePage() {
  const { data, isLoading, error } = useOfficeData();
  useOfficeRealtime();
  const navigate = useNavigate();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedLifecycle, setSelectedLifecycle] = useState<string | null>(null);

  const filteredTasks: OfficeTaskCardData[] = useMemo(() => {
    if (!data) return [];
    const projectMap = Object.fromEntries(data.projects.map((p: any) => [p.id, p.name]));
    let tasks = data.allTasks;
    if (selectedProjectId) tasks = tasks.filter((t: any) => t.project_id === selectedProjectId);
    if (selectedRoleId) tasks = tasks.filter((t: any) => t.owner_role_id === selectedRoleId);
    if (selectedLifecycle) tasks = tasks.filter((t: any) => t.state === selectedLifecycle);
    return tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      state: t.state,
      projectName: projectMap[t.project_id] ?? "—",
      projectId: t.project_id,
      roleName: t.role_name,
      roleCode: t.role_code,
      latestRunState: t.latest_run_state,
      hasPendingReview: t.has_pending_review,
      hasPendingApproval: t.has_pending_approval,
      hasPrediction: t.has_prediction,
      predictionType: t.prediction_type,
      evidenceCount: 0,
    }));
  }, [data, selectedProjectId, selectedRoleId, selectedLifecycle]);

  const stats = useMemo(() => {
    if (!data) return { activeProjects: 0, activeTasks: 0, runningRuns: 0, pendingApprovals: 0, blockedCount: 0 };
    const allTasks = data.allTasks;
    return {
      activeProjects: data.projects.length,
      activeTasks: allTasks.filter((t: any) => !["done", "cancelled"].includes(t.state)).length,
      runningRuns: allTasks.filter((t: any) => t.latest_run_state === "running" || t.latest_run_state === "preparing").length,
      pendingApprovals: allTasks.filter((t: any) => t.has_pending_approval).length,
      blockedCount: allTasks.filter((t: any) => t.state === "blocked").length,
    };
  }, [data]);

  // Team presence data
  const teamPresence = useMemo(() => {
    if (!data) return [];
    const activeRoles = data.roles ?? [];
    const allTasks = data.allTasks;
    return activeRoles.slice(0, 12).map((role: any) => {
      const currentTask = allTasks.find(
        (t: any) => t.owner_role_id === role.id && ["in_progress", "waiting_review", "blocked"].includes(t.state)
      );
      let status: "executing" | "reviewing" | "waiting" | "blocked" | "idle" = "idle";
      if (currentTask) {
        if (currentTask.state === "in_progress") status = currentTask.latest_run_state === "running" ? "executing" : "waiting";
        else if (currentTask.state === "waiting_review") status = "reviewing";
        else if (currentTask.state === "blocked") status = "blocked";
      }
      return {
        id: role.id,
        name: role.name,
        code: role.code,
        status,
        taskTitle: currentTask?.title ?? null,
        isRunning: currentTask?.latest_run_state === "running",
      };
    });
  }, [data]);

  const handleTaskClick = (taskId: string) => navigate(`/control/tasks/${taskId}`);

  if (isLoading) {
    return (
      <AppLayout title="Production Floor">
        <div className="flex items-center gap-2 p-6 text-[13px] text-muted-foreground">Loading…</div>
      </AppLayout>
    );
  }
  if (error) {
    return (
      <AppLayout title="Production Floor">
        <div className="flex items-center gap-2 p-6 text-[13px] text-destructive">Error: {(error as Error).message}</div>
      </AppLayout>
    );
  }
  if (!data) return null;

  const releaseTasks = filteredTasks.filter((t) => {
    const raw = data.allTasks.find((rt: any) => rt.id === t.id);
    return raw?.domain === "release" && !["done", "cancelled"].includes(t.state);
  });

  const totalTasks = filteredTasks.length;
  const isEmpty = totalTasks === 0;

  return (
    <AppLayout title="Production Floor" fullHeight>
      <div className="grid-content flex flex-col gap-3 px-6 py-4 h-full overflow-hidden">
        {/* Status Strip */}
        <OfficeStatusStrip
          systemMode={data.systemMode}
          {...stats}
          projects={data.projects.map((p: any) => ({ id: p.id, name: p.name }))}
          roles={(data.roles ?? []).map((r: any) => ({ id: r.id, name: r.name, code: r.code }))}
          selectedProjectId={selectedProjectId}
          selectedRoleId={selectedRoleId}
          selectedLifecycle={selectedLifecycle}
          onProjectChange={setSelectedProjectId}
          onRoleChange={setSelectedRoleId}
          onLifecycleChange={setSelectedLifecycle}
        />

        {/* Team Presence Strip */}
        <OfficeTeamStrip agents={teamPresence} />

        {isEmpty ? (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-4 px-6 py-4 rounded-[16px] bg-secondary border border-border">
              <div>
                <p className="text-[16px] font-semibold text-foreground">Production floor idle.</p>
                <p className="text-[13px] text-muted-foreground mt-0.5">No active tasks in the pipeline.</p>
              </div>
              <Link to="/presale/new">
                <Button size="sm" className="h-8 text-[13px] gap-1.5 bg-foreground text-background hover:bg-foreground/90 rounded-lg font-semibold">
                  <Rocket className="h-3.5 w-3.5" /> Start Intake
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* Main: Lifecycle Lanes + Live Flow */
          <div className="flex gap-3 flex-1 min-h-0">
            {/* Lifecycle Lanes — 3×3 grid */}
            <div
              className="flex-1 grid gap-2 min-h-0"
              style={{
                gridTemplateColumns: "repeat(3, 1fr)",
                gridTemplateRows: "repeat(3, 1fr)",
              }}
            >
              {ROOMS.map((room) => {
                let roomTasks: OfficeTaskCardData[];
                if (room.key === "release") {
                  roomTasks = releaseTasks;
                } else {
                  roomTasks = filteredTasks.filter((t) =>
                    (room.states as readonly string[]).includes(t.state)
                  );
                }
                return (
                  <LifecycleRoom
                    key={room.key}
                    label={room.label}
                    stateKey={room.key}
                    tasks={roomTasks}
                    onTaskClick={handleTaskClick}
                  />
                );
              })}
            </div>

            {/* Live Flow — right panel */}
            <div className="w-64 shrink-0 ds-card p-3 flex flex-col min-h-0">
              <OfficeEventStream
                officeEvents={data.officeEvents ?? []}
                activityEvents={data.recentEvents ?? []}
              />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
