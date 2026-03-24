import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDepartments } from "@/hooks/use-department-data";
import { useHRDashboard } from "@/hooks/use-hr-data";
import { useHiringMarket } from "@/hooks/use-hiring-market";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { getPersona, getStatusMeta } from "@/lib/personas";
import {
  Smartphone, Bot, Globe, Building2, ArrowRight, Users, TrendingUp, Gauge,
  ChevronDown, ChevronRight, AlertTriangle, Lightbulb, Trophy, Star,
  Zap, Activity, GraduationCap, FlaskConical, ArrowUpRight,
} from "lucide-react";

const DEPT_ICONS: Record<string, React.ElementType> = { Smartphone, Bot, Globe, Building2 };

export default function TeamsPage() {
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null);
  const { data: departments = [], isLoading: deptLoading } = useDepartments();
  const { data: hrData } = useHRDashboard();
  const { data: marketData } = useHiringMarket();

  const { data: allEmployees = [] } = useQuery({
    queryKey: ["all-employees-full"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_employees")
        .select("id, name, role_code, role_id, status, success_rate, reputation_score, bug_rate, model_name, provider, team_id")
        .order("reputation_score", { ascending: false });
      return data ?? [];
    },
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ["all-roles-teams"],
    queryFn: async () => {
      const { data } = await supabase.from("agent_roles")
        .select("id, name, code, status, success_rate, total_runs, capacity_score, team_id");
      return data ?? [];
    },
  });

  const { data: learningProposals = [] } = useQuery({
    queryKey: ["learning-proposals-teams"],
    queryFn: async () => {
      const { data } = await supabase.from("learning_proposals")
        .select("id, proposal_type, status, hypothesis, created_at")
        .in("status", ["candidate", "approved"])
        .order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const activeEmployees = allEmployees.filter((e) => e.status === "active");
  const underperforming = allEmployees.filter((e) => (e.success_rate ?? 0) < 0.6 || (e.bug_rate ?? 0) > 0.3);
  const suggestions = hrData?.suggestions?.filter((s: any) => !s.resolved) ?? [];

  /* ── Pool metrics per department ── */
  const getPoolMetrics = (deptId: string) => {
    const deptRoles = allRoles.filter((r) => r.team_id === deptId);
    const teamSize = deptRoles.length;
    const avgSuccess = deptRoles.length > 0
      ? Math.round(deptRoles.reduce((s, r) => s + (r.success_rate ?? 0), 0) / deptRoles.length * 100) : 0;
    const totalCap = deptRoles.reduce((s, r) => s + (r.capacity_score ?? 1), 0);
    const usedCap = deptRoles.reduce((s, r) => s + Math.min(r.total_runs ?? 0, r.capacity_score ?? 1), 0);
    const loadPct = totalCap > 0 ? Math.round((usedCap / totalCap) * 100) : 0;
    return { teamSize, avgSuccess, loadPct };
  };

  /* ── Fallback pool metrics (global) ── */
  const getGlobalMetrics = () => {
    const teamSize = allRoles.length;
    const avgSuccess = allRoles.length > 0
      ? Math.round(allRoles.reduce((s, r) => s + (r.success_rate ?? 0), 0) / allRoles.length * 100) : 0;
    const totalCap = allRoles.reduce((s, r) => s + (r.capacity_score ?? 1), 0);
    const usedCap = allRoles.reduce((s, r) => s + Math.min(r.total_runs ?? 0, r.capacity_score ?? 1), 0);
    const loadPct = totalCap > 0 ? Math.round((usedCap / totalCap) * 100) : 0;
    return { teamSize, avgSuccess, loadPct };
  };

  return (
    <AppLayout title="AI Teams">
      <ScrollArea className="h-full">
        <div className="px-8 py-6 space-y-8 max-w-[1400px]">

          {/* ── Page header ── */}
          <div>
            <h1 className="text-[28px] font-bold text-foreground tracking-tight">AI Teams</h1>
            <p className="text-[14px] text-muted-foreground mt-1 leading-relaxed max-w-[500px]">
              Manage your production capabilities, team members, and learning pipeline.
            </p>
          </div>

          {/* ── Summary strip ── */}
          <div className="flex items-center gap-5 text-[13px]">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground/50" />
              <span className="font-bold text-foreground font-mono">{activeEmployees.length}</span>
              <span className="text-muted-foreground">active agents</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground/50" />
              <span className="font-bold text-foreground font-mono">{departments.length}</span>
              <span className="text-muted-foreground">capabilities</span>
            </div>
            {underperforming.length > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive/60" />
                <span className="font-bold text-destructive font-mono">{underperforming.length}</span>
                <span className="text-destructive/70">at risk</span>
              </div>
            )}
            {learningProposals.length > 0 && (
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-status-blue/60" />
                <span className="font-bold text-status-blue font-mono">{learningProposals.length}</span>
                <span className="text-status-blue/70">learning proposals</span>
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════
              SECTION 1 — CAPABILITY POOLS
              ════════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon={<Zap className="h-5 w-5" />} title="Capability Pools" />
            <div className="mt-4">
              {deptLoading ? (
                <p className="text-[13px] text-muted-foreground">Loading…</p>
              ) : departments.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-8 text-center">
                  <Building2 className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-[15px] font-semibold text-foreground">No capabilities configured</p>
                  <p className="text-[13px] text-muted-foreground mt-1">Create your first capability pool to organize your AI team.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {departments.map((dept) => {
                    const Icon = DEPT_ICONS[dept.icon] || Building2;
                    const m = dept.id ? getPoolMetrics(dept.id) : getGlobalMetrics();
                    const isExpanded = expandedDeptId === dept.id;
                    const loadColor = m.loadPct > 85 ? "text-destructive" : m.loadPct < 30 ? "text-status-amber" : "text-status-green";

                    return (
                      <div key={dept.id} className={`rounded-2xl border overflow-hidden transition-all ${
                        isExpanded ? "lg:col-span-2 border-primary/20 shadow-md" : "border-border hover:shadow-md hover:-translate-y-px"
                      } bg-card`}>
                        {/* Card header */}
                        <div className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                              <Icon className="h-5 w-5 text-primary/70" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-[17px] font-bold text-foreground leading-tight">{dept.name}</h3>
                              <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">
                                {dept.description || "Specialized production capability"}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center gap-4 text-[12px]">
                                <span className="flex items-center gap-1"><Users className="h-3 w-3 text-muted-foreground/50" /> <strong className="text-foreground font-mono">{m.teamSize}</strong></span>
                                <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-status-green/60" /> <strong className="text-foreground font-mono">{m.avgSuccess}%</strong></span>
                                <span className={`flex items-center gap-1`}><Gauge className={`h-3 w-3 ${loadColor}/60`} /> <strong className={`font-mono ${loadColor}`}>{m.loadPct}%</strong></span>
                              </div>
                            </div>
                          </div>

                          {/* Load bar + actions */}
                          <div className="flex items-center gap-3 mt-3">
                            <Progress value={m.loadPct} className="h-1.5 flex-1" />
                            <Button size="sm" variant="outline" className="h-8 text-[12px] gap-1.5 px-4 font-semibold rounded-lg shrink-0"
                              onClick={() => setExpandedDeptId(isExpanded ? null : dept.id)}>
                              {isExpanded ? <><ChevronDown className="h-3 w-3" /> Collapse</> : <><ChevronRight className="h-3 w-3" /> View Team</>}
                            </Button>
                            <Link to={`/team-room?dept=${dept.slug}`}>
                              <Button size="sm" className="h-8 text-[12px] gap-1.5 px-4 font-bold bg-foreground text-background hover:bg-foreground/90 rounded-lg shrink-0">
                                Start Session <ArrowRight className="h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </div>

                        {/* Expanded: team members */}
                        {isExpanded && (
                          <div className="px-5 pb-5 pt-2 border-t border-border/30">
                            <EmployeeGrid employees={allEmployees} allRoles={allRoles} filterTeamId={dept.id} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              SECTION 2 — ALL TEAM MEMBERS
              ════════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon={<Users className="h-5 w-5" />} title="All Team Members"
              subtitle={`${allEmployees.length} agents across all capabilities`} />
            <div className="mt-4">
              <EmployeeGrid employees={allEmployees} allRoles={allRoles} />
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              SECTION 3 — HIRING & PERFORMANCE
              ════════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon={<GraduationCap className="h-5 w-5" />} title="Hiring & Performance" />
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Underperforming */}
              <div className="rounded-2xl border border-border bg-card p-5 border-t-[3px] border-t-destructive/30">
                <h3 className="text-[16px] font-bold text-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive/60" /> At Risk
                </h3>
                {underperforming.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground/50">No underperforming agents.</p>
                ) : (
                  <div className="space-y-2">
                    {underperforming.slice(0, 5).map((emp) => (
                      <Link key={emp.id} to={`/employees/${emp.id}`}>
                        <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-destructive/5 transition-colors group">
                          <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                          <span className="text-[14px] font-medium text-foreground truncate flex-1">{emp.name}</span>
                          <span className="text-[12px] font-mono text-destructive/70">{Math.round((emp.success_rate ?? 0) * 100)}%</span>
                          <ArrowUpRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Suggestions */}
              <div className="rounded-2xl border border-border bg-card p-5 border-t-[3px] border-t-status-amber/30">
                <h3 className="text-[16px] font-bold text-foreground mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-status-amber/60" /> Suggestions
                </h3>
                {suggestions.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground/50">No active suggestions.</p>
                ) : (
                  <div className="space-y-2">
                    {suggestions.slice(0, 5).map((s: any) => (
                      <div key={s.id} className="py-2 px-3 rounded-lg bg-secondary/30">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-status-amber">{s.suggestion_type}</span>
                        <p className="text-[13px] text-foreground mt-0.5 line-clamp-2">{s.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Learning proposals */}
              <div className="rounded-2xl border border-border bg-card p-5 border-t-[3px] border-t-status-blue/30">
                <h3 className="text-[16px] font-bold text-foreground mb-3 flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-status-blue/60" /> Learning Pipeline
                </h3>
                {learningProposals.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground/50">No open proposals.</p>
                ) : (
                  <div className="space-y-2">
                    {learningProposals.slice(0, 5).map((lp) => (
                      <div key={lp.id} className="py-2 px-3 rounded-lg bg-secondary/30">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-status-blue">{lp.status}</span>
                          <span className="text-[10px] text-muted-foreground/50 ml-auto font-mono">
                            {new Date(lp.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <p className="text-[13px] text-foreground mt-0.5 line-clamp-2">{lp.hypothesis || lp.proposal_type}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="h-8" />
        </div>
      </ScrollArea>
    </AppLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HELPER COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <h2 className="text-[22px] font-bold text-foreground tracking-tight">{title}</h2>
        {subtitle && <p className="text-[13px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function EmployeeGrid({ employees, allRoles, filterTeamId }: { employees: any[]; allRoles: any[]; filterTeamId?: string }) {
  const roleMap = Object.fromEntries(allRoles.map((r) => [r.id, r]));

  let filtered = employees;
  if (filterTeamId) {
    const teamRoleIds = new Set(allRoles.filter((r) => r.team_id === filterTeamId).map((r) => r.id));
    filtered = employees.filter((e) => e.role_id && teamRoleIds.has(e.role_id));
  }

  if (filtered.length === 0) {
    return <p className="text-[13px] text-muted-foreground/50 py-4">No team members found.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {filtered.map((emp) => {
        const persona = getPersona(emp.role_code);
        const st = getStatusMeta(emp.status);
        const role = emp.role_id ? roleMap[emp.role_id] : null;
        const roleName = role?.name ?? emp.role_code;
        const successPct = Math.round((emp.success_rate ?? 0) * 100);
        const repScore = emp.reputation_score ?? 0;
        const perfColor = repScore >= 0.8 ? "text-status-green" : repScore >= 0.5 ? "text-status-amber" : "text-destructive";
        const perfRing = repScore >= 0.8 ? "border-status-green/30" : repScore >= 0.5 ? "border-status-amber/30" : "border-destructive/30";

        return (
          <Link key={emp.id} to={`/employees/${emp.id}`}>
            <div className="rounded-xl border border-border bg-card p-4 hover:shadow-md hover:-translate-y-px transition-all group cursor-pointer">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className={`rounded-xl border-[3px] ${perfRing} p-0.5`}>
                    <img src={persona.avatar} alt={emp.name}
                      className={`h-14 w-14 rounded-lg object-cover ring-2 ${persona.ringClass} ring-offset-2 ring-offset-card`}
                      width={56} height={56} />
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card ${st.dot}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-foreground truncate leading-tight">{emp.name}</p>
                  <p className="text-[12px] text-muted-foreground truncate mt-0.5">{roleName}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge className={`text-[10px] font-bold px-2 py-0.5 border-0 ${st.chipBg}`}>{st.label}</Badge>
                    <span className="text-[11px] font-mono text-muted-foreground">{successPct}%</span>
                    <span className={`text-[11px] font-bold font-mono ${perfColor}`}>{Math.round(repScore * 100)}</span>
                  </div>
                </div>

                <ArrowUpRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors shrink-0 mt-1" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
