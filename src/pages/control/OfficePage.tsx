import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useOfficeData, useOfficeRealtime } from "@/hooks/use-office-data";
import { OfficeStatusStrip } from "@/components/office/OfficeStatusStrip";
import { LifecycleRoom } from "@/components/office/LifecycleRoom";
import { OfficeEventStream } from "@/components/office/OfficeEventStream";
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

  // Filter tasks
  const filteredTasks: OfficeTaskCardData[] = useMemo(() => {
    if (!data) return [];

    const projectMap = Object.fromEntries(
      data.projects.map((p: any) => [p.id, p.name])
    );

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

  // Stats
  const stats = useMemo(() => {
    if (!data) return { activeProjects: 0, activeTasks: 0, runningRuns: 0, pendingApprovals: 0 };
    const allTasks = data.allTasks;
    return {
      activeProjects: data.projects.length,
      activeTasks: allTasks.filter((t: any) => !["done", "cancelled"].includes(t.state)).length,
      runningRuns: allTasks.filter((t: any) => t.latest_run_state === "running" || t.latest_run_state === "preparing").length,
      pendingApprovals: allTasks.filter((t: any) => t.has_pending_approval).length,
    };
  }, [data]);

  const handleTaskClick = (taskId: string) => {
    navigate(`/control/tasks/${taskId}`);
  };

  if (isLoading) {
    return <AppLayout title="Office"><p className="text-xs text-muted-foreground p-4">Loading…</p></AppLayout>;
  }
  if (error) {
    return <AppLayout title="Office"><p className="text-xs text-destructive p-4">Error: {(error as Error).message}</p></AppLayout>;
  }
  if (!data) return null;

  // Release room: tasks with domain=release
  const releaseTasks = filteredTasks.filter((t) => {
    const raw = data.allTasks.find((rt: any) => rt.id === t.id);
    return raw?.domain === "release" && !["done", "cancelled"].includes(t.state);
  });

  return (
    <AppLayout title="Office">
      <div className="flex flex-col gap-2 h-[calc(100vh-4rem)]">
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

        {/* Main Grid: Rooms + Event Stream */}
        <div className="flex gap-2 flex-1 min-h-0">
          {/* Lifecycle Rooms Grid */}
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

          {/* Event Stream */}
          <div className="w-56 shrink-0 border border-border/30 rounded-lg bg-card/20 p-2 flex flex-col min-h-0">
            <OfficeEventStream
              officeEvents={data.officeEvents ?? []}
              activityEvents={data.recentEvents ?? []}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
