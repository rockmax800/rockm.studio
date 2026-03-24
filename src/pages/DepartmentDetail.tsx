import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useDepartment } from "@/hooks/use-department-data";
import { useProjects, useTasks } from "@/hooks/use-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  TrendingUp,
  FolderKanban,
  Gauge,
  AlertTriangle,
  ArrowRight,
  GraduationCap,
  Loader2,
  Eye,
  ShieldAlert,
  Zap,
  Clock,
  Activity,
} from "lucide-react";

// Avatar imports — one per role archetype
import avatarFrontend from "@/assets/avatars/avatar-frontend.jpg";
import avatarBackend from "@/assets/avatars/avatar-backend.jpg";
import avatarStrategist from "@/assets/avatars/avatar-strategist.jpg";
import avatarArchitect from "@/assets/avatars/avatar-architect.jpg";
import avatarReviewer from "@/assets/avatars/avatar-reviewer.jpg";
import avatarQa from "@/assets/avatars/avatar-qa.jpg";
import avatarRelease from "@/assets/avatars/avatar-release.jpg";
import avatarBackendImpl from "@/assets/avatars/avatar-backend-impl.jpg";

/* ── Role visual persona system ──────────────────────────────── */
interface RolePersona {
  avatar: string;
  accent: string;       // ring color
  ringClass: string;    // tailwind ring class
  tag: string;          // signature tagline
  bgTint: string;       // subtle card tint
}

const ROLE_PERSONAS: Record<string, RolePersona> = {
  frontend_builder:     { avatar: avatarFrontend,    accent: "#3b82f6", ringClass: "ring-blue-500",    tag: "Pixel Perfectionist",    bgTint: "bg-blue-50/40" },
  backend_architect:    { avatar: avatarBackend,     accent: "#6366f1", ringClass: "ring-indigo-500",  tag: "Systems Thinker",        bgTint: "bg-indigo-50/40" },
  backend_implementer:  { avatar: avatarBackendImpl, accent: "#8b5cf6", ringClass: "ring-violet-500",  tag: "Pragmatic Builder",      bgTint: "bg-violet-50/40" },
  product_strategist:   { avatar: avatarStrategist,  accent: "#f59e0b", ringClass: "ring-amber-500",   tag: "Vision Driver",          bgTint: "bg-amber-50/40" },
  solution_architect:   { avatar: avatarArchitect,   accent: "#06b6d4", ringClass: "ring-cyan-500",    tag: "Structure Architect",    bgTint: "bg-cyan-50/40" },
  reviewer:             { avatar: avatarReviewer,     accent: "#10b981", ringClass: "ring-emerald-500", tag: "Quality Guardian",       bgTint: "bg-emerald-50/40" },
  qa_agent:             { avatar: avatarQa,          accent: "#ef4444", ringClass: "ring-rose-500",    tag: "Defect Hunter",          bgTint: "bg-rose-50/40" },
  release_coordinator:  { avatar: avatarRelease,     accent: "#f97316", ringClass: "ring-orange-500",  tag: "Ship Captain",           bgTint: "bg-orange-50/40" },
};

const DEFAULT_PERSONA: RolePersona = {
  avatar: avatarArchitect,
  accent: "#6b7280",
  ringClass: "ring-muted-foreground",
  tag: "Specialist",
  bgTint: "bg-secondary/20",
};

const STATUS_META: Record<string, { label: string; dot: string; chipBg: string }> = {
  active:    { label: "Working",   dot: "bg-green-500 animate-pulse", chipBg: "bg-green-100 text-green-800" },
  idle:      { label: "Idle",      dot: "bg-muted-foreground/25",     chipBg: "bg-secondary text-muted-foreground" },
  reviewing: { label: "Reviewing", dot: "bg-amber-500",               chipBg: "bg-amber-100 text-amber-800" },
  blocked:   { label: "Blocked",   dot: "bg-red-500",                 chipBg: "bg-red-100 text-red-800" },
};

export default function DepartmentDetail() {
  const { slug = "" } = useParams();
  const { data: dept, isLoading: deptLoading } = useDepartment(slug);
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();

  const { data: employees = [] } = useQuery({
    queryKey: ["dept-employees"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_employees")
        .select("id, name, role_code, status, success_rate, avg_latency, avg_cost, bug_rate, escalation_rate, reputation_score, model_name, provider")
        .order("reputation_score", { ascending: false });
      return data ?? [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["dept-roles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_roles")
        .select("id, code, name, status, success_rate, performance_score, total_runs, capacity_score")
        .eq("status", "active");
      return data ?? [];
    },
  });

  const { data: learningProposals = [] } = useQuery({
    queryKey: ["dept-learning"],
    queryFn: async () => {
      const { data } = await supabase
        .from("learning_proposals")
        .select("id, proposal_type, status, hypothesis, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  if (deptLoading) {
    return <AppLayout title="Loading…"><p className="text-[12px] text-muted-foreground p-6">Loading…</p></AppLayout>;
  }
  if (!dept) {
    return <AppLayout title="Not found"><p className="text-[12px] text-muted-foreground p-6">Department not found.</p></AppLayout>;
  }

  const activeProjects = projects.filter((p) => ["active", "in_review", "scoped"].includes(p.state));
  const activeEmployees = employees.filter((e) => e.status === "active");
  const probationEmployees = employees.filter((e) => e.status === "probation");
  const avgSuccess = activeEmployees.length > 0
    ? activeEmployees.reduce((s, e) => s + (e.success_rate ?? 0), 0) / activeEmployees.length
    : 0;
  const avgLatency = activeEmployees.length > 0
    ? activeEmployees.reduce((s, e) => s + (e.avg_latency ?? 0), 0) / activeEmployees.length
    : 0;

  const inProgressTasks = tasks.filter((t) => t.state === "in_progress");
  const reviewTasks = tasks.filter((t) => t.state === "waiting_review");
  const blockedTasks = tasks.filter((t) => t.state === "blocked");
  const escalatedTasks = tasks.filter((t) => t.state === "escalated");

  const pendingLearning = learningProposals.filter((l) => l.status === "candidate" || l.status === "approved");
  const recentPromoted = learningProposals.filter((l) => l.status === "promoted");
  const failedEvals = learningProposals.filter((l) => l.status === "rejected");
  const evalPassRate = learningProposals.length > 0
    ? Math.round((recentPromoted.length / Math.max(recentPromoted.length + failedEvals.length, 1)) * 100)
    : 0;

  const getEmployeeStatus = (roleCode: string): string => {
    if (blockedTasks.some((t) => (t as any).agent_roles?.code === roleCode)) return "blocked";
    if (reviewTasks.some((t) => (t as any).agent_roles?.code === roleCode)) return "reviewing";
    if (inProgressTasks.some((t) => (t as any).agent_roles?.code === roleCode)) return "active";
    return "idle";
  };

  const getEmployeeTask = (roleCode: string): string | null => {
    const task = [...inProgressTasks, ...reviewTasks, ...blockedTasks].find(
      (t) => (t as any).agent_roles?.code === roleCode
    );
    return task ? task.title : null;
  };

  const totalCapacity = roles.reduce((s, r) => s + (r.capacity_score ?? 1), 0);
  const usedCapacity = roles.reduce((s, r) => s + Math.min(r.total_runs ?? 0, r.capacity_score ?? 1), 0);
  const loadPct = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;

  const loadStatus = loadPct > 85 ? "Overloaded" : loadPct < 30 ? "Underutilized" : "Stable";
  const loadStatusColor = loadPct > 85 ? "bg-red-100 text-red-700" : loadPct < 30 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";

  return (
    <AppLayout title={dept.name} fullHeight>
      <div className="h-full overflow-auto">
        <div className="px-6 py-5 space-y-6 max-w-[1400px]">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Link to="/departments" className="hover:text-foreground transition-colors">Capabilities</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{dept.name}</span>
          </div>

          {/* ── DEPARTMENT HEADER ─────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-[28px] font-bold text-foreground tracking-tight leading-tight">{dept.name}</h1>
                <p className="text-[13px] text-muted-foreground mt-1">{dept.description || "Specialized production capability"}</p>
              </div>
              <Badge className={`text-[11px] font-semibold px-3 py-1 border-0 ${loadStatusColor}`}>
                {loadStatus}
              </Badge>
            </div>

            {/* Stats strip */}
            <div className="flex items-center gap-6 text-[12px]">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span className="font-semibold text-foreground">{activeEmployees.length}</span>
                <span>team members</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="font-semibold text-foreground">{Math.round(avgSuccess * 100)}%</span>
                <span>success rate</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-semibold text-foreground">{avgLatency > 0 ? `${Math.round(avgLatency / 1000)}s` : "—"}</span>
                <span>avg delivery</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FolderKanban className="h-3.5 w-3.5" />
                <span className="font-semibold text-foreground">{activeProjects.length}</span>
                <span>active projects</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground ml-auto">
                <Gauge className="h-3.5 w-3.5" />
                <span className="font-semibold text-foreground">{loadPct}%</span>
                <span>load</span>
                <Progress value={loadPct} className="h-1.5 w-24 ml-1" />
              </div>
            </div>
          </div>

          {/* ── MAIN 8/4 GRID ────────────────────────────────── */}
          <div className="grid grid-cols-12 gap-5">
            {/* LEFT — 8 columns */}
            <div className="col-span-12 lg:col-span-8 space-y-5">

              {/* SECTION 1 — TEAM GRID */}
              <section>
                <h2 className="text-[16px] font-semibold text-foreground mb-3">Team</h2>
                {activeEmployees.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">No active team members.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {activeEmployees.map((emp) => {
                      const persona = ROLE_PERSONAS[emp.role_code] ?? DEFAULT_PERSONA;
                      const status = getEmployeeStatus(emp.role_code);
                      const currentTask = getEmployeeTask(emp.role_code);
                      const meta = STATUS_META[status] ?? STATUS_META.idle;
                      const isUnderperforming = (emp.success_rate ?? 0) < 0.6 || (emp.bug_rate ?? 0) > 0.3;
                      const roleName = roles.find((r) => r.code === emp.role_code)?.name ?? emp.role_code;
                      const tokenEff = (emp.avg_cost ?? 0) > 0 ? Math.round((emp.success_rate ?? 0) / (emp.avg_cost ?? 0.01) * 100) : 0;

                      return (
                        <Link key={emp.id} to={`/employees/${emp.id}`}>
                          <div
                            className={`ds-card p-0 overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer group ${
                              status === "blocked" ? "border-l-[3px] border-l-destructive" : ""
                            }`}
                          >
                            {/* Card top — avatar + identity */}
                            <div className={`p-4 pb-3 ${persona.bgTint}`}>
                              <div className="flex items-start gap-3">
                                <div className={`relative shrink-0`}>
                                  <img
                                    src={persona.avatar}
                                    alt={emp.name}
                                    loading="lazy"
                                    width={48}
                                    height={48}
                                    className={`h-12 w-12 rounded-xl object-cover ring-2 ${persona.ringClass} ring-offset-2 ring-offset-background`}
                                  />
                                  {/* Status dot overlay */}
                                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${meta.dot}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[13px] font-semibold text-foreground truncate">{emp.name}</span>
                                    {isUnderperforming && (
                                      <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground truncate">{roleName}</p>
                                  <span className="inline-block mt-1 text-[9px] font-medium tracking-wide uppercase text-muted-foreground/60">
                                    {persona.tag}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Card body */}
                            <div className="px-4 pb-3 pt-2 space-y-2">
                              {/* Status chip + task */}
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${meta.chipBg}`}>
                                  {meta.label}
                                </span>
                                {emp.model_name && (
                                  <span className="text-[9px] font-mono text-muted-foreground/40 ml-auto truncate max-w-[80px]">
                                    {emp.model_name}
                                  </span>
                                )}
                              </div>
                              {currentTask && (
                                <p className="text-[11px] text-foreground/60 line-clamp-1">
                                  → {currentTask}
                                </p>
                              )}

                              {/* Metrics bar */}
                              <div className="pt-2 border-t border-border/30 flex items-center gap-3 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1" title="Success rate">
                                  <TrendingUp className="h-3 w-3" />
                                  <span className="font-semibold text-foreground">{Math.round((emp.success_rate ?? 0) * 100)}%</span>
                                </span>
                                <span className="flex items-center gap-1" title="Reputation">
                                  ★ <span className="font-semibold text-foreground">{(emp.reputation_score ?? 0).toFixed(1)}</span>
                                </span>
                                <span className="flex items-center gap-1 ml-auto" title="Token efficiency">
                                  <Zap className="h-3 w-3" />
                                  <span className="font-mono">{tokenEff}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* SECTION 2 — ACTIVE WORK */}
              <section>
                <h2 className="text-[16px] font-semibold text-foreground mb-3">Active Work</h2>
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                  <WorkColumn
                    title="In Progress"
                    icon={<Loader2 className="h-3.5 w-3.5" />}
                    items={inProgressTasks.slice(0, 6)}
                    accentClass="border-t-amber-500"
                  />
                  <WorkColumn
                    title="Pending Review"
                    icon={<Eye className="h-3.5 w-3.5" />}
                    items={reviewTasks.slice(0, 6)}
                    accentClass="border-t-violet-500"
                  />
                  <WorkColumn
                    title="Blocked"
                    icon={<ShieldAlert className="h-3.5 w-3.5" />}
                    items={blockedTasks.slice(0, 6)}
                    accentClass="border-t-destructive"
                  />
                  <WorkColumn
                    title="Escalated"
                    icon={<AlertTriangle className="h-3.5 w-3.5" />}
                    items={escalatedTasks.slice(0, 6)}
                    accentClass="border-t-orange-500"
                  />
                </div>
              </section>
            </div>

            {/* RIGHT — 4 columns */}
            <div className="col-span-12 lg:col-span-4 space-y-4">

              {/* SECTION 3 — LEARNING & HEALTH */}
              <section>
                <h2 className="text-[16px] font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  Learning & Health
                </h2>

                {/* Eval pass rate */}
                <div className="ds-card p-3 mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-foreground">Eval Pass Rate</span>
                    <span className="text-[14px] font-bold text-foreground">{evalPassRate}%</span>
                  </div>
                  <Progress value={evalPassRate} className="h-1.5" />
                </div>

                {/* Probation */}
                {probationEmployees.length > 0 && (
                  <div className="ds-card p-3 mb-3 border-l-[3px] border-l-amber-500">
                    <h3 className="text-[12px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-amber-500" />
                      On Probation
                    </h3>
                    <div className="space-y-1.5">
                      {probationEmployees.map((emp) => {
                        const persona = ROLE_PERSONAS[emp.role_code] ?? DEFAULT_PERSONA;
                        return (
                          <Link key={emp.id} to={`/employees/${emp.id}`}>
                            <div className="flex items-center gap-2 py-1 px-1.5 hover:bg-secondary/30 rounded transition-colors">
                              <img src={persona.avatar} alt="" className="h-6 w-6 rounded-lg object-cover" loading="lazy" width={24} height={24} />
                              <span className="text-[11px] text-foreground/70 truncate flex-1">{emp.name}</span>
                              <span className="text-[10px] font-mono text-amber-600">{Math.round((emp.success_rate ?? 0) * 100)}%</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                <LearningBlock
                  title="Pending Proposals"
                  count={pendingLearning.length}
                  items={pendingLearning.slice(0, 5)}
                  dotClass="bg-amber-500"
                />
                <LearningBlock
                  title="Recent Improvements"
                  count={recentPromoted.length}
                  items={recentPromoted.slice(0, 5)}
                  dotClass="bg-green-500"
                />
                <LearningBlock
                  title="Failed Evaluations"
                  count={failedEvals.length}
                  items={failedEvals.slice(0, 5)}
                  dotClass="bg-red-400"
                />
              </section>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/* ── Work Column ─────────────────────────────────────────────── */
function WorkColumn({
  title, icon, items, accentClass,
}: {
  title: string;
  icon: React.ReactNode;
  items: any[];
  accentClass: string;
}) {
  return (
    <div className={`ds-card p-3 border-t-[3px] ${accentClass}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
          {icon} {title}
        </h3>
        <span className="text-[10px] text-muted-foreground font-mono">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[10px] text-muted-foreground/50">None</p>
      ) : (
        <div className="space-y-1">
          {items.map((t) => (
            <Link key={t.id} to={`/control/tasks/${t.id}`}>
              <div className="flex items-center gap-1.5 py-1 hover:bg-secondary/30 rounded px-1 transition-colors">
                <span className="text-[10px] text-foreground/70 truncate flex-1">{t.title}</span>
                <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/30 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Learning Block ──────────────────────────────────────────── */
function LearningBlock({
  title, count, items, dotClass,
}: {
  title: string;
  count: number;
  items: any[];
  dotClass: string;
}) {
  return (
    <div className="ds-card p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[12px] font-semibold text-foreground">{title}</h3>
        <span className="text-[11px] font-semibold text-foreground">{count}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[10px] text-muted-foreground/50">None</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((lp) => (
            <div key={lp.id} className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dotClass}`} />
              <span className="line-clamp-1">{lp.hypothesis || lp.proposal_type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
