import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useOfficeData, useOfficeRealtime } from "@/hooks/use-office-data";
import { useDepartments } from "@/hooks/use-department-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getPersona } from "@/lib/personas";
import { PIPELINE_STAGES, STAGE_COLORS, resolveStageIndex } from "@/components/PipelineBar";
import { cn } from "@/lib/utils";
import {
  Building2, Users, Activity, Zap, Stamp, FolderKanban,
  AlertTriangle, ChevronRight, ChevronDown,
  Shield, Play, Eye, Plus,
  Smartphone, Bot, Globe, Cpu, Filter,
} from "lucide-react";

const DEPT_ICONS: Record<string, React.ElementType> = {
  Smartphone, Bot, Globe, Building2, Cpu,
};

const DEPT_TINTS: Record<number, string> = {
  0: "from-blue-50/60 to-blue-50/20",
  1: "from-violet-50/60 to-violet-50/20",
  2: "from-amber-50/60 to-amber-50/20",
  3: "from-emerald-50/60 to-emerald-50/20",
  4: "from-rose-50/60 to-rose-50/20",
};

const DEPT_BORDER: Record<number, string> = {
  0: "border-blue-200/50",
  1: "border-violet-200/50",
  2: "border-amber-200/50",
  3: "border-emerald-200/50",
  4: "border-rose-200/50",
};

export default function OfficePage() {
  const { data, isLoading, error } = useOfficeData();
  useOfficeRealtime();
  const navigate = useNavigate();
  const { data: departments = [] } = useDepartments();
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string | null>(null);

  const stats = useMemo(() => {
    if (!data) return { projects: 0, tasks: 0, runs: 0, approvals: 0, blocked: 0 };
    const all = data.allTasks;
    return {
      projects: data.projects.length,
      tasks: all.filter((t: any) => !["done", "cancelled"].includes(t.state)).length,
      runs: all.filter((t: any) => t.latest_run_state === "running" || t.latest_run_state === "preparing").length,
      approvals: data.pendingInboxCount,
      blocked: all.filter((t: any) => t.state === "blocked").length,
    };
  }, [data]);

  const teamEmployees = useMemo(() => {
    if (!data) return {};
    const map: Record<string, any[]> = {};
    for (const role of data.roles) {
      const teamId = role.team_id ?? "__none";
      if (!map[teamId]) map[teamId] = [];
      const tasks = data.allTasks.filter((t: any) => t.owner_role_id === role.id);
      const activeTask = tasks.find((t: any) => ["in_progress", "waiting_review", "blocked"].includes(t.state));
      let status: "working" | "reviewing" | "blocked" | "idle" = "idle";
      if (activeTask) {
        if (activeTask.state === "in_progress") status = "working";
        else if (activeTask.state === "waiting_review") status = "reviewing";
        else if (activeTask.state === "blocked") status = "blocked";
      }
      map[teamId].push({
        roleId: role.id,
        name: activeTask?.employee_name ?? role.name,
        code: role.code,
        status,
        successRate: role.success_rate,
        performanceScore: role.performance_score,
        taskTitle: activeTask?.title ?? null,
        taskCount: tasks.filter((t: any) => !["done", "cancelled"].includes(t.state)).length,
      });
    }
    return map;
  }, [data]);

  /* ── Pipeline stage counts for filter bar ── */
  const stageCounts = useMemo(() => {
    if (!data) return {};
    const counts: Record<string, number> = {};
    for (const p of data.projects) {
      const idx = resolveStageIndex(p.state);
      if (idx >= 0) {
        const key = PIPELINE_STAGES[idx].key;
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
    return counts;
  }, [data]);

  /* ── Filtered projects by stage ── */
  const filteredProjects = useMemo(() => {
    if (!data) return [];
    if (!stageFilter) return data.projects;
    return data.projects.filter((p: any) => {
      const idx = resolveStageIndex(p.state);
      return idx >= 0 && PIPELINE_STAGES[idx].key === stageFilter;
    });
  }, [data, stageFilter]);

  const deptTasks = useMemo(() => {
    if (!data || !expandedDeptId) return [];
    const team = data.teams.find((t: any) => t.id === expandedDeptId);
    if (!team) return [];
    const roleIds = new Set(team.roles.map((r: any) => r.id));
    const projectMap = Object.fromEntries(data.projects.map((p: any) => [p.id, p.name]));

    let tasks = data.allTasks
      .filter((t: any) => t.owner_role_id && roleIds.has(t.owner_role_id) && !["done", "cancelled"].includes(t.state));

    // Apply stage filter to tasks by their project
    if (stageFilter) {
      const filteredProjectIds = new Set(filteredProjects.map((p: any) => p.id));
      tasks = tasks.filter((t: any) => filteredProjectIds.has(t.project_id));
    }

    return tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      state: t.state,
      projectName: projectMap[t.project_id] ?? "—",
      roleCode: t.role_code,
      employeeName: t.employee_name,
      latestRunState: t.latest_run_state,
      hasPendingReview: t.has_pending_review,
    }));
  }, [data, expandedDeptId, stageFilter, filteredProjects]);

  if (isLoading) {
    return (
      <AppLayout title="Production Floor">
        <div className="flex items-center gap-2 p-8 text-[14px] text-muted-foreground">Loading production floor…</div>
      </AppLayout>
    );
  }
  if (error || !data) {
    return (
      <AppLayout title="Production Floor">
        <div className="flex items-center gap-2 p-8 text-[14px] text-destructive">Error loading data.</div>
      </AppLayout>
    );
  }

  const teamData = data.teams ?? [];

  return (
    <AppLayout title="Production Floor">
      <div className="grid-content space-y-5 pb-8">

        {/* ═══ PIPELINE STAGE FILTER BAR ═══════════════════════════ */}
        <div className="rounded-2xl bg-card border border-border shadow-sm px-5 py-3.5">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest shrink-0 mr-1">Stage</span>
            <button
              onClick={() => setStageFilter(null)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all shrink-0",
                !stageFilter ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary",
              )}
            >
              All
              <span className="font-mono text-[11px]">{data.projects.length}</span>
            </button>
            {PIPELINE_STAGES.map((stage) => {
              const count = stageCounts[stage.key] ?? 0;
              const isActive = stageFilter === stage.key;
              const colors = STAGE_COLORS[stage.key];
              const Icon = stage.icon;
              if (count === 0 && !isActive) return null;
              return (
                <button
                  key={stage.key}
                  onClick={() => setStageFilter(isActive ? null : stage.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all shrink-0 border",
                    isActive
                      ? `${colors.activeBg} ${colors.border} ${colors.active}`
                      : "border-transparent text-muted-foreground hover:bg-secondary",
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", isActive ? colors.active : "text-muted-foreground/40")} />
                  {stage.label}
                  <span className={cn("font-mono text-[11px]", isActive ? colors.active : "text-muted-foreground/50")}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══ TOP BAR ═══════════════════════════════════════════ */}
        <div className="flex items-center gap-5 px-1 text-[13px]">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-status-green animate-pulse" />
            <span className="font-bold text-foreground uppercase tracking-widest text-[11px]">Production</span>
          </div>
          <TopMetric icon={FolderKanban} value={stats.projects} label="Projects" />
          <TopMetric icon={Activity} value={stats.tasks} label="Active Tasks" />
          <TopMetric icon={Zap} value={stats.runs} label="Runs" accent={stats.runs > 0} accentCls="text-status-blue" />
          <TopMetric icon={Stamp} value={stats.approvals} label="Approvals" accent={stats.approvals > 0} accentCls="text-status-amber" />
          {stats.blocked > 0 && (
            <TopMetric icon={AlertTriangle} value={stats.blocked} label="Blocked" accent accentCls="text-destructive" />
          )}
        </div>

        {/* ═══ CAPABILITY ROOMS ══════════════════════════════════ */}
        <div>
          <h2 className="text-[22px] font-bold text-foreground tracking-tight mb-4">Capability Rooms</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {teamData.map((team: any, idx: number) => {
              const isExpanded = expandedDeptId === team.id;
              const Icon = DEPT_ICONS[departments.find((d) => d.name.includes(team.name?.split(" ")[0]))?.icon ?? ""] ?? Building2;
              const employees = teamEmployees[team.id] ?? [];
              const loadPct = Math.round((team.load_ratio ?? 0) * 100);
              const successRate = employees.length > 0
                ? Math.round(employees.reduce((s: number, e: any) => s + (e.successRate ?? 0), 0) / employees.length * 100)
                : 0;

              return (
                <div key={team.id} className={`rounded-2xl border overflow-hidden transition-all shadow-sm ${
                  isExpanded
                    ? `${DEPT_BORDER[idx % 5]} shadow-md lg:col-span-2`
                    : "border-border hover:border-border-strong hover:shadow-md"
                }`}>
                  {/* Card header */}
                  <button
                    onClick={() => setExpandedDeptId(isExpanded ? null : team.id)}
                    className={`w-full text-left px-6 py-5 bg-gradient-to-br ${DEPT_TINTS[idx % 5]} hover:brightness-[0.98] transition-all`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="h-12 w-12 rounded-xl bg-card/80 border border-border/30 flex items-center justify-center shadow-sm shrink-0">
                          <Icon className="h-6 w-6 text-foreground/70" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[18px] font-bold text-foreground leading-tight">{team.name}</h3>
                          <p className="text-[13px] text-muted-foreground mt-0.5">{team.focus_domain || "Production Capability"}</p>
                          <div className="flex items-center gap-5 mt-3">
                            <MiniStat icon={Users} value={employees.length} label="members" />
                            <MiniStat icon={Activity} value={team.active_tasks} label="tasks" />
                            <MiniStat icon={Shield} value={`${successRate}%`} label="success" />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-[10px] font-bold px-2 py-0.5 ${
                            team.load_status === "overloaded"
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : team.load_status === "high"
                                ? "bg-status-amber/10 text-status-amber border-status-amber/20"
                                : "bg-status-green/10 text-status-green border-status-green/20"
                          }`}>
                            {team.load_status === "overloaded" ? "Overloaded" : team.load_status === "high" ? "High Load" : "Balanced"}
                          </Badge>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                        <div className="flex items-center gap-2 w-32">
                          <Progress value={loadPct} className="h-2 flex-1" />
                          <span className="text-[11px] font-mono font-bold text-muted-foreground">{loadPct}%</span>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Expanded room */}
                  {isExpanded && (
                    <div className="border-t border-border/30">
                      <div className="px-6 py-5">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-[16px] font-bold text-foreground">Team Members</h4>
                          <Link to="/presale/new">
                            <Button size="sm" className="h-8 text-[12px] font-bold gap-1.5 bg-foreground text-background hover:bg-foreground/90 rounded-lg">
                              <Plus className="h-3 w-3" />
                              Start New Project
                            </Button>
                          </Link>
                        </div>

                        {employees.length === 0 ? (
                          <div className="text-[14px] text-muted-foreground py-4">No team members assigned.</div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {employees.map((emp: any) => (
                              <EmployeeCard key={emp.roleId} employee={emp} onClick={() => navigate(`/employees/${emp.roleId}`)} />
                            ))}
                          </div>
                        )}
                      </div>

                      {deptTasks.length > 0 && (
                        <div className="border-t border-border/20 px-6 py-4 bg-secondary/20">
                          <h4 className="text-[14px] font-bold text-foreground mb-3">Active Tasks</h4>
                          <div className="space-y-1">
                            {deptTasks.slice(0, 10).map((task: any) => (
                              <DeptTaskRow key={task.id} task={task} onClick={() => navigate(`/control/tasks/${task.id}`)} />
                            ))}
                            {deptTasks.length > 10 && (
                              <div className="text-[12px] text-muted-foreground/50 text-center pt-2">+{deptTasks.length - 10} more</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {teamData.length === 0 && (
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-[18px] font-bold text-foreground">No capabilities configured.</p>
              <p className="text-[14px] text-muted-foreground mt-1">Set up teams to see them here.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

/* ═══ Sub-components ═══════════════════════════════════════════ */

function TopMetric({ icon: Icon, value, label, accent, accentCls }: {
  icon: React.ElementType; value: number; label: string; accent?: boolean; accentCls?: string;
}) {
  const color = accent && accentCls ? accentCls : "text-muted-foreground";
  return (
    <div className={`flex items-center gap-1.5 ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="font-bold font-mono text-foreground tabular-nums">{value}</span>
      <span className="text-[12px] font-medium">{label}</span>
    </div>
  );
}

function MiniStat({ icon: Icon, value, label }: { icon: React.ElementType; value: number | string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground/50" />
      <span className="text-[13px] font-bold text-foreground">{value}</span>
      <span className="text-[12px] text-muted-foreground">{label}</span>
    </div>
  );
}

const STATUS_CHIP: Record<string, { label: string; cls: string; dotCls: string }> = {
  working:   { label: "Working",   cls: "bg-status-amber/10 text-status-amber",       dotCls: "bg-status-amber animate-pulse" },
  reviewing: { label: "Reviewing", cls: "bg-lifecycle-review/10 text-lifecycle-review", dotCls: "bg-lifecycle-review" },
  blocked:   { label: "Blocked",   cls: "bg-destructive/10 text-destructive",           dotCls: "bg-destructive" },
  idle:      { label: "Idle",      cls: "bg-secondary text-muted-foreground",           dotCls: "bg-muted-foreground/25" },
};

function EmployeeCard({ employee, onClick }: { employee: any; onClick: () => void }) {
  const persona = getPersona(employee.code);
  const chip = STATUS_CHIP[employee.status] ?? STATUS_CHIP.idle;
  const perfScore = Math.round((employee.performanceScore ?? 0) * 100);
  const perfColor = perfScore >= 80 ? "text-status-green" : perfScore >= 50 ? "text-status-amber" : "text-destructive";
  const perfRing = perfScore >= 80 ? "border-status-green/40" : perfScore >= 50 ? "border-status-amber/40" : "border-destructive/40";

  return (
    <div onClick={onClick}
      className="group flex flex-col items-center text-center px-5 py-6 rounded-2xl border border-border bg-card hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer">
      <div className="relative mb-3">
        <div className={`rounded-2xl border-[3px] ${perfRing} p-1`}>
          <img src={persona.avatar} alt={employee.name}
            className={`h-[120px] w-[120px] rounded-xl object-cover ring-2 ${persona.ringClass} ring-offset-2 ring-offset-card`}
            width={120} height={120} loading="lazy" />
        </div>
        <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-card ${chip.dotCls}`} />
      </div>
      <h5 className="text-[18px] font-bold text-foreground leading-tight">{employee.name}</h5>
      <p className="text-[13px] text-muted-foreground mt-0.5 font-medium">{persona.tag}</p>
      <span className={`mt-3 text-[11px] font-bold px-3 py-1 rounded-full ${chip.cls}`}>{chip.label}</span>
      <div className="flex items-center gap-2 mt-3">
        <span className={`text-[22px] font-bold font-mono tabular-nums ${perfColor}`}>{perfScore}</span>
        <span className="text-[11px] text-muted-foreground">perf.</span>
      </div>
      {employee.taskTitle && (
        <p className="text-[12px] text-muted-foreground mt-2 line-clamp-1 max-w-full">{employee.taskTitle}</p>
      )}
      <div className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground/30 group-hover:text-primary transition-colors">
        <span>View Profile</span>
        <ChevronRight className="h-3 w-3" />
      </div>
    </div>
  );
}

const STATE_DOT: Record<string, string> = {
  ready: "bg-status-blue",
  assigned: "bg-status-blue/60",
  in_progress: "bg-status-amber",
  waiting_review: "bg-lifecycle-review",
  blocked: "bg-destructive",
  escalated: "bg-lifecycle-escalated",
  rework_required: "bg-lifecycle-rework",
  validated: "bg-status-green",
};

function DeptTaskRow({ task, onClick }: { task: any; onClick: () => void }) {
  const persona = task.roleCode ? getPersona(task.roleCode) : null;
  const dot = STATE_DOT[task.state] ?? "bg-muted-foreground/25";
  const isRunning = task.latestRunState === "running" || task.latestRunState === "preparing";

  return (
    <div onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-card transition-colors cursor-pointer group">
      <div className={`h-2 w-2 rounded-full shrink-0 ${dot} ${isRunning ? "animate-pulse" : ""}`} />
      {persona && (
        <img src={persona.avatar} alt="" className="h-6 w-6 rounded-md object-cover shrink-0" width={24} height={24} loading="lazy" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground truncate">{task.title}</p>
      </div>
      <span className="text-[11px] text-muted-foreground/50 truncate max-w-[80px] shrink-0">{task.projectName}</span>
      {task.employeeName && (
        <span className="text-[11px] text-muted-foreground/40 truncate max-w-[80px] shrink-0">{task.employeeName}</span>
      )}
      {isRunning && <Play className="h-3 w-3 text-status-blue shrink-0" />}
      {task.hasPendingReview && <Eye className="h-3 w-3 text-lifecycle-review shrink-0" />}
      <ChevronRight className="h-3 w-3 text-muted-foreground/15 group-hover:text-muted-foreground/50 transition-colors shrink-0" />
    </div>
  );
}
