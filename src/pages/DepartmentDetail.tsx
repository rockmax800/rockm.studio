import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDepartment } from "@/hooks/use-department-data";
import { useProjects, useTasks } from "@/hooks/use-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPersona, getStatusMeta } from "@/lib/personas";
import {
  Users, TrendingUp, FolderKanban, Gauge, AlertTriangle, ArrowRight,
  GraduationCap, Loader2, Eye, ShieldAlert, Zap, Clock, Activity, MessageSquare,
} from "lucide-react";

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
        .select("id, name, role_code, status, success_rate, avg_latency, avg_cost, bug_rate, reputation_score, model_name")
        .order("reputation_score", { ascending: false });
      return data ?? [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["dept-roles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_roles")
        .select("id, code, name, status, success_rate, total_runs, capacity_score")
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

  if (deptLoading) return <AppLayout title="Loading…"><p className="text-[12px] text-muted-foreground p-6">Loading…</p></AppLayout>;
  if (!dept) return <AppLayout title="Not found"><p className="text-[12px] text-muted-foreground p-6">Department not found.</p></AppLayout>;

  const activeProjects = projects.filter((p) => ["active", "in_review", "scoped"].includes(p.state));
  const activeEmployees = employees.filter((e) => e.status === "active");
  const probationEmployees = employees.filter((e) => e.status === "probation");

  const avgSuccess = activeEmployees.length > 0
    ? activeEmployees.reduce((s, e) => s + (e.success_rate ?? 0), 0) / activeEmployees.length : 0;
  const avgLatency = activeEmployees.length > 0
    ? activeEmployees.reduce((s, e) => s + (e.avg_latency ?? 0), 0) / activeEmployees.length : 0;

  const inProgressTasks = tasks.filter((t) => t.state === "in_progress");
  const reviewTasks = tasks.filter((t) => t.state === "waiting_review");
  const blockedTasks = tasks.filter((t) => t.state === "blocked");
  const escalatedTasks = tasks.filter((t) => t.state === "escalated");

  const pendingLearning = learningProposals.filter((l) => l.status === "candidate" || l.status === "approved");
  const recentPromoted = learningProposals.filter((l) => l.status === "promoted");
  const failedEvals = learningProposals.filter((l) => l.status === "rejected");
  const evalPassRate = learningProposals.length > 0
    ? Math.round((recentPromoted.length / Math.max(recentPromoted.length + failedEvals.length, 1)) * 100) : 0;

  const totalCapacity = roles.reduce((s, r) => s + (r.capacity_score ?? 1), 0);
  const usedCapacity = roles.reduce((s, r) => s + Math.min(r.total_runs ?? 0, r.capacity_score ?? 1), 0);
  const loadPct = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;
  const loadStatus = loadPct > 85 ? "Overloaded" : loadPct < 30 ? "Underutilized" : "Stable";
  const loadColor = loadPct > 85 ? "bg-red-100 text-red-700" : loadPct < 30 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";

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

  return (
    <AppLayout title={dept.name} fullHeight>
      <div className="h-full overflow-auto">
        <div className="px-6 py-5 space-y-6 max-w-[1400px]">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Link to="/departments" className="hover:text-foreground transition-colors">Capability Pools</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{dept.name}</span>
          </div>

          {/* ── HEADER ───────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-[28px] font-bold text-foreground tracking-tight leading-tight">{dept.name}</h1>
                <p className="text-[13px] text-muted-foreground mt-1">{dept.description || "Specialized production capability"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`text-[11px] font-semibold px-3 py-1 border-0 ${loadColor}`}>{loadStatus}</Badge>
                <Link to={`/team-room?dept=${slug}`}>
                  <Button size="sm" className="text-[11px] h-8 gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" /> Start Team Session
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stats strip */}
            <div className="flex items-center gap-6 text-[12px]">
              <StatChip icon={<Users className="h-3.5 w-3.5" />} value={activeEmployees.length} label="team members" />
              <StatChip icon={<TrendingUp className="h-3.5 w-3.5" />} value={`${Math.round(avgSuccess * 100)}%`} label="success rate" />
              <StatChip icon={<Clock className="h-3.5 w-3.5" />} value={avgLatency > 0 ? `${Math.round(avgLatency / 1000)}s` : "—"} label="avg delivery" />
              <StatChip icon={<FolderKanban className="h-3.5 w-3.5" />} value={activeProjects.length} label="active projects" />
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
              {/* TEAM GRID */}
              <section>
                <h2 className="text-[16px] font-semibold text-foreground mb-3">Team</h2>
                {activeEmployees.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">No active team members.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {activeEmployees.map((emp) => {
                      const persona = getPersona(emp.role_code);
                      const status = getEmployeeStatus(emp.role_code);
                      const currentTask = getEmployeeTask(emp.role_code);
                      const meta = getStatusMeta(status);
                      const isRisk = (emp.success_rate ?? 0) < 0.6 || (emp.bug_rate ?? 0) > 0.3;
                      const roleName = roles.find((r) => r.code === emp.role_code)?.name ?? emp.role_code;
                      const tokenEff = (emp.avg_cost ?? 0) > 0 ? Math.round((emp.success_rate ?? 0) / (emp.avg_cost ?? 0.01) * 100) : 0;

                      return (
                        <Link key={emp.id} to={`/employees/${emp.id}`}>
                          <div className={`ds-card p-0 overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer ${status === "blocked" ? "border-l-[3px] border-l-destructive" : ""}`}>
                            <div className={`p-4 pb-3 ${persona.bgTint}`}>
                              <div className="flex items-start gap-3">
                                <div className="relative shrink-0">
                                  <img src={persona.avatar} alt={emp.name} loading="lazy" width={48} height={48}
                                    className={`h-12 w-12 rounded-xl object-cover ring-2 ${persona.ringClass} ring-offset-2 ring-offset-background`} />
                                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${meta.dot}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[13px] font-semibold text-foreground truncate">{emp.name}</span>
                                    {isRisk && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground truncate">{roleName}</p>
                                  <span className="inline-block mt-1 text-[9px] font-medium tracking-wide uppercase text-muted-foreground/60">{persona.tag}</span>
                                </div>
                              </div>
                            </div>
                            <div className="px-4 pb-3 pt-2 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${meta.chipBg}`}>{meta.label}</span>
                              </div>
                              {currentTask && <p className="text-[11px] text-foreground/60 line-clamp-1">→ {currentTask}</p>}
                              <div className="pt-2 border-t border-border/30 flex items-center gap-3 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /><span className="font-semibold text-foreground">{Math.round((emp.success_rate ?? 0) * 100)}%</span></span>
                                <span className="flex items-center gap-1">★ <span className="font-semibold text-foreground">{(emp.reputation_score ?? 0).toFixed(1)}</span></span>
                                <span className="flex items-center gap-1 ml-auto"><Zap className="h-3 w-3" /><span className="font-mono">{tokenEff}</span></span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* ACTIVE WORK */}
              <section>
                <h2 className="text-[16px] font-semibold text-foreground mb-3">Active Work</h2>
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                  <WorkColumn title="In Progress" icon={<Loader2 className="h-3.5 w-3.5" />} items={inProgressTasks.slice(0, 6)} accentClass="border-t-amber-500" />
                  <WorkColumn title="Pending Review" icon={<Eye className="h-3.5 w-3.5" />} items={reviewTasks.slice(0, 6)} accentClass="border-t-violet-500" />
                  <WorkColumn title="Blocked" icon={<ShieldAlert className="h-3.5 w-3.5" />} items={blockedTasks.slice(0, 6)} accentClass="border-t-destructive" />
                  <WorkColumn title="Escalated" icon={<AlertTriangle className="h-3.5 w-3.5" />} items={escalatedTasks.slice(0, 6)} accentClass="border-t-orange-500" />
                </div>
              </section>
            </div>

            {/* RIGHT — 4 columns: Learning & Health */}
            <div className="col-span-12 lg:col-span-4 space-y-4">
              <section>
                <h2 className="text-[16px] font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" /> Learning & Health
                </h2>

                <div className="ds-card p-3 mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-foreground">Eval Pass Rate</span>
                    <span className="text-[14px] font-bold text-foreground">{evalPassRate}%</span>
                  </div>
                  <Progress value={evalPassRate} className="h-1.5" />
                </div>

                {probationEmployees.length > 0 && (
                  <div className="ds-card p-3 mb-3 border-l-[3px] border-l-amber-500">
                    <h3 className="text-[12px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-amber-500" /> On Probation
                    </h3>
                    <div className="space-y-1.5">
                      {probationEmployees.map((emp) => {
                        const persona = getPersona(emp.role_code);
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

                <LearningBlock title="Pending Proposals" count={pendingLearning.length} items={pendingLearning.slice(0, 5)} dotClass="bg-amber-500" />
                <LearningBlock title="Recent Improvements" count={recentPromoted.length} items={recentPromoted.slice(0, 5)} dotClass="bg-green-500" />
                <LearningBlock title="Failed Evaluations" count={failedEvals.length} items={failedEvals.slice(0, 5)} dotClass="bg-red-400" />
              </section>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/* ── Helper Components ──────────────────────────────────────── */

function StatChip({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      {icon}
      <span className="font-semibold text-foreground">{value}</span>
      <span>{label}</span>
    </div>
  );
}

function WorkColumn({ title, icon, items, accentClass }: { title: string; icon: React.ReactNode; items: any[]; accentClass: string }) {
  return (
    <div className={`ds-card p-3 border-t-[3px] ${accentClass}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">{icon} {title}</h3>
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

function LearningBlock({ title, count, items, dotClass }: { title: string; count: number; items: any[]; dotClass: string }) {
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
