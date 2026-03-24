import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useOfficeData, useOfficeRealtime } from "@/hooks/use-office-data";
import { OfficeTeamStrip } from "@/components/office/OfficeTeamStrip";
import { LifecycleRoom } from "@/components/office/LifecycleRoom";
import { OfficeEventStream } from "@/components/office/OfficeEventStream";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDepartments } from "@/hooks/use-department-data";
import {
  Rocket, Building2, Smartphone, Bot, Globe, Users, Activity,
  Zap, Stamp, FolderKanban, AlertTriangle, Gauge,
} from "lucide-react";
import type { OfficeTaskCardData } from "@/components/office/OfficeTaskCard";

const DEPT_ICONS: Record<string, React.ElementType> = { Smartphone, Bot, Globe, Building2 };

const LANE_ROWS = [
  [
    { key: "ready", label: "Ready", states: ["ready", "assigned"] },
    { key: "in_progress", label: "In Progress", states: ["in_progress"] },
    { key: "waiting_review", label: "Review", states: ["waiting_review"] },
  ],
  [
    { key: "rework", label: "Rework", states: ["rework_required"] },
    { key: "blocked", label: "Blocked", states: ["blocked"] },
    { key: "escalated", label: "Escalated", states: ["escalated"] },
  ],
  [
    { key: "validated", label: "Validated", states: ["validated"] },
    { key: "done", label: "Done", states: ["done"] },
    { key: "release", label: "Release", states: [] },
  ],
] as const;

export default function OfficePage() {
  const { data, isLoading, error } = useOfficeData();
  useOfficeRealtime();
  const navigate = useNavigate();
  const { data: departments = [] } = useDepartments();

  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const filteredTasks: OfficeTaskCardData[] = useMemo(() => {
    if (!data) return [];
    const projectMap = Object.fromEntries(data.projects.map((p: any) => [p.id, p.name]));
    let tasks = data.allTasks;
    if (selectedProjectId) tasks = tasks.filter((t: any) => t.project_id === selectedProjectId);
    if (selectedRoleId) tasks = tasks.filter((t: any) => t.owner_role_id === selectedRoleId);
    return tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      state: t.state,
      projectName: projectMap[t.project_id] ?? "—",
      projectId: t.project_id,
      roleName: t.role_name,
      roleCode: t.role_code,
      employeeName: t.employee_name,
      latestRunState: t.latest_run_state,
      hasPendingReview: t.has_pending_review,
      hasPendingApproval: t.has_pending_approval,
      hasPrediction: t.has_prediction,
      predictionType: t.prediction_type,
      evidenceCount: 0,
      priority: t.priority,
    }));
  }, [data, selectedProjectId, selectedRoleId]);

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

  const teamPresence = useMemo(() => {
    if (!data) return [];
    const activeRoles = data.roles ?? [];
    const allTasks = data.allTasks;
    const employees = (data as any).allTasks ? [] : [];
    return activeRoles.slice(0, 16).map((role: any) => {
      const currentTask = allTasks.find(
        (t: any) => t.owner_role_id === role.id && ["in_progress", "waiting_review", "blocked"].includes(t.state)
      );
      let status: "executing" | "reviewing" | "waiting" | "blocked" | "idle" = "idle";
      if (currentTask) {
        if (currentTask.state === "in_progress") status = currentTask.latest_run_state === "running" ? "executing" : "waiting";
        else if (currentTask.state === "waiting_review") status = "reviewing";
        else if (currentTask.state === "blocked") status = "blocked";
      }
      const emp = allTasks.find((t: any) => t.owner_role_id === role.id);
      return {
        id: role.id,
        name: emp?.employee_name ?? role.name,
        code: role.code,
        status,
        taskTitle: currentTask?.title ?? null,
        isRunning: currentTask?.latest_run_state === "running",
        employeeId: null as string | null, // would need employee lookup
      };
    });
  }, [data]);

  const handleTaskClick = (taskId: string) => navigate(`/control/tasks/${taskId}`);

  if (isLoading) {
    return (
      <AppLayout title="Production Floor">
        <div className="flex items-center gap-2 p-8 text-[14px] text-muted-foreground">Loading production floor…</div>
      </AppLayout>
    );
  }
  if (error) {
    return (
      <AppLayout title="Production Floor">
        <div className="flex items-center gap-2 p-8 text-[14px] text-destructive">Error: {(error as Error).message}</div>
      </AppLayout>
    );
  }
  if (!data) return null;

  const releaseTasks = filteredTasks.filter((t) => {
    const raw = data.allTasks.find((rt: any) => rt.id === t.id);
    return raw?.domain === "release" && !["done", "cancelled"].includes(t.state);
  });

  const isEmpty = filteredTasks.length === 0;
  const getLaneTasks = (states: readonly string[]) =>
    filteredTasks.filter((t) => (states as readonly string[]).includes(t.state));

  // Department-level stats
  const totalCap = (data.roles ?? []).reduce((s: number, r: any) => s + (r.capacity_score ?? 1), 0);
  const usedCap = (data.roles ?? []).reduce((s: number, r: any) => s + Math.min(r.max_parallel_tasks ?? 0, r.capacity_score ?? 1), 0);
  const globalLoad = totalCap > 0 ? Math.round((usedCap / totalCap) * 100) : 0;

  return (
    <AppLayout title="Production Floor" fullHeight>
      <div className="flex flex-col h-full overflow-hidden">

        {/* ═══ CAPABILITY SELECTOR ═══════════════════════════════ */}
        <div className="px-6 pt-5 pb-3 border-b border-border/30 bg-card/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-[24px] font-bold text-foreground tracking-tight">Production Floor</h1>
              <p className="text-[13px] text-muted-foreground mt-0.5">Live view of all active production capabilities</p>
            </div>
            <div className="flex items-center gap-5 text-[13px]">
              <StripMetric icon={<FolderKanban className="h-4 w-4" />} value={stats.activeProjects} label="Projects" />
              <StripMetric icon={<Activity className="h-4 w-4" />} value={stats.activeTasks} label="Tasks" />
              <StripMetric icon={<Zap className="h-4 w-4" />} value={stats.runningRuns} label="Runs"
                warn={stats.runningRuns > 0} warnClass="text-blue-600" />
              <StripMetric icon={<Stamp className="h-4 w-4" />} value={stats.pendingApprovals} label="Approvals"
                warn={stats.pendingApprovals > 0} warnClass="text-amber-600" />
              {stats.blockedCount > 0 && (
                <StripMetric icon={<AlertTriangle className="h-4 w-4" />} value={stats.blockedCount} label="Blocked"
                  warn warnClass="text-destructive" />
              )}
              <div className="flex items-center gap-2 ml-2">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <span className="font-bold text-foreground">{globalLoad}%</span>
                <Progress value={globalLoad} className="h-2 w-20" />
              </div>
            </div>
          </div>

          {/* Department pills */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedDeptId(null)}
              className={`shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all text-left ${
                !selectedDeptId
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card border-border hover:border-primary/30 hover:bg-secondary/30"
              }`}
            >
              <Building2 className="h-4 w-4" />
              <div>
                <span className="text-[13px] font-bold block leading-tight">All Capabilities</span>
                <span className={`text-[11px] ${!selectedDeptId ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {stats.activeTasks} tasks
                </span>
              </div>
            </button>

            {departments.map((dept) => {
              const Icon = DEPT_ICONS[dept.icon] || Building2;
              const isActive = selectedDeptId === dept.id;
              const deptTaskCount = filteredTasks.length; // simplified
              return (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDeptId(isActive ? null : dept.id)}
                  className={`shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all text-left ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card border-border hover:border-primary/30 hover:bg-secondary/30"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <div>
                    <span className="text-[13px] font-bold block leading-tight">{dept.name}</span>
                    <span className={`text-[11px] ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {dept.description?.split(" ").slice(0, 3).join(" ") || "Capability"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══ TEAM PRESENCE STRIP ══════════════════════════════ */}
        <div className="px-6 py-3 border-b border-border/20">
          <OfficeTeamStrip agents={teamPresence} />
        </div>

        {/* ═══ MAIN CONTENT ═════════════════════════════════════ */}
        {isEmpty ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto">
                <Rocket className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <div>
                <p className="text-[20px] font-bold text-foreground">Production floor idle.</p>
                <p className="text-[14px] text-muted-foreground mt-1">No active tasks in the pipeline.</p>
              </div>
              <Link to="/presale/new">
                <Button className="h-11 text-[14px] gap-2 px-6 font-semibold">
                  <Rocket className="h-4 w-4" /> Start Intake
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex gap-0 min-h-0 overflow-hidden">
            {/* Lanes area */}
            <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-auto px-4 py-3">
              {LANE_ROWS.map((row, rowIdx) => (
                <div key={rowIdx} className={`grid grid-cols-3 gap-2 ${rowIdx === 2 ? "min-h-[100px]" : "flex-1 min-h-0"}`}>
                  {row.map((lane) => (
                    <LifecycleRoom
                      key={lane.key}
                      label={lane.label}
                      stateKey={lane.key}
                      tasks={lane.key === "release" ? releaseTasks : getLaneTasks(lane.states)}
                      onTaskClick={handleTaskClick}
                      compact={rowIdx === 2}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Live Event Rail */}
            <div className="w-80 shrink-0 border-l border-border/30 flex flex-col min-h-0 overflow-hidden bg-card/30">
              <div className="px-5 pt-4 pb-2">
                <OfficeEventStream
                  officeEvents={data.officeEvents ?? []}
                  activityEvents={data.recentEvents ?? []}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function StripMetric({ icon, value, label, warn, warnClass }: {
  icon: React.ReactNode; value: number; label: string; warn?: boolean; warnClass?: string;
}) {
  const color = warn && warnClass ? warnClass : "text-muted-foreground";
  return (
    <div className={`flex items-center gap-1.5 ${color}`}>
      {icon}
      <span className="font-bold font-mono text-foreground">{value}</span>
      <span className="text-[12px] font-medium">{label}</span>
    </div>
  );
}
