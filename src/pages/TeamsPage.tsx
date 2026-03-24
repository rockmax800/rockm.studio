import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDepartments } from "@/hooks/use-department-data";
import { useHRDashboard } from "@/hooks/use-hr-data";
import { useHiringMarket } from "@/hooks/use-hiring-market";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { getPersona, getStatusMeta } from "@/lib/personas";
import { TeamSetupWizard } from "@/components/teams/TeamSetupWizard";
import { AddEmployeeDialog } from "@/components/teams/AddEmployeeDialog";
import { toast } from "sonner";
import { HRProposalCard } from "@/components/teams/HRProposalCard";
import { generateHRProposals, type HRProposal, ROLE_OPTIONS } from "@/lib/employeeConfig";
import {
  Smartphone, Bot, Globe, Building2, ArrowRight, Users, TrendingUp, Gauge,
  ChevronDown, ChevronRight, AlertTriangle, Lightbulb, Trophy, Star,
  Zap, Activity, GraduationCap, FlaskConical, ArrowUpRight, Plus,
  ArrowLeftRight, Trash2, UserMinus, UserPlus,
} from "lucide-react";

const DEPT_ICONS: Record<string, React.ElementType> = { Smartphone, Bot, Globe, Building2 };

export default function TeamsPage() {
  const qc = useQueryClient();
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
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

  // Remove employee mutation
  const removeEmployee = useMutation({
    mutationFn: async (empId: string) => {
      const { error } = await supabase.from("ai_employees").update({ status: "terminated" }).eq("id", empId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-employees-full"] });
      qc.invalidateQueries({ queryKey: ["hr-dashboard"] });
      toast.success("Employee removed");
    },
  });

  // Move employee mutation
  const moveEmployee = useMutation({
    mutationFn: async ({ empId, newTeamId }: { empId: string; newTeamId: string }) => {
      const { error } = await supabase.from("ai_employees").update({ team_id: newTeamId }).eq("id", empId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-employees-full"] });
      toast.success("Employee moved");
    },
  });

  const activeEmployees = allEmployees.filter((e) => e.status === "active");
  const underperforming = allEmployees.filter((e) => e.status === "active" && ((e.success_rate ?? 0) < 0.6 || (e.bug_rate ?? 0) > 0.3));
  const suggestions = hrData?.suggestions?.filter((s: any) => !s.resolved) ?? [];

  const hasNoSetup = departments.length === 0 && activeEmployees.length === 0;

  /* ── Pool metrics per department ── */
  const getPoolMetrics = (deptId: string) => {
    const deptEmployees = activeEmployees.filter((e) => e.team_id === deptId);
    const deptRoles = allRoles.filter((r) => r.team_id === deptId);
    const teamSize = deptEmployees.length || deptRoles.length;
    const avgSuccess = deptEmployees.length > 0
      ? Math.round(deptEmployees.reduce((s, e) => s + ((e.success_rate as number) ?? 0), 0) / deptEmployees.length * 100) : 0;
    const totalCap = deptRoles.reduce((s, r) => s + (r.capacity_score ?? 1), 0);
    const usedCap = deptRoles.reduce((s, r) => s + Math.min(r.total_runs ?? 0, r.capacity_score ?? 1), 0);
    const loadPct = totalCap > 0 ? Math.round((usedCap / totalCap) * 100) : 0;
    return { teamSize, avgSuccess, loadPct };
  };

  // ── FIRST TIME: Show setup wizard
  if (hasNoSetup || showWizard) {
    return (
      <AppLayout title="AI Teams">
        <ScrollArea className="h-full">
          <div className="px-8 py-8">
            {!showWizard && hasNoSetup ? (
              <div className="max-w-[700px] mx-auto text-center py-12">
                <div className="h-20 w-20 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-6">
                  <Zap className="h-10 w-10 text-primary/40" />
                </div>
                <h1 className="text-[32px] font-bold text-foreground tracking-tight">Set Up Your AI Team</h1>
                <p className="text-[16px] text-muted-foreground mt-3 leading-relaxed max-w-[460px] mx-auto">
                  Create your first capability pool and add AI employees to start production.
                </p>
                <Button onClick={() => setShowWizard(true)}
                  className="mt-8 h-12 px-8 gap-2 text-[14px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90">
                  <Plus className="h-4 w-4" /> Start Team Setup
                </Button>
              </div>
            ) : (
              <TeamSetupWizard
                onComplete={() => { setShowWizard(false); qc.invalidateQueries({ queryKey: ["departments"] }); }}
                onCancel={departments.length > 0 ? () => setShowWizard(false) : undefined}
              />
            )}
          </div>
        </ScrollArea>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="AI Teams">
      <ScrollArea className="h-full">
        <div className="px-8 py-6 space-y-8 max-w-[1400px]">

          {/* ── Page header ── */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-bold text-foreground tracking-tight">AI Teams</h1>
              <p className="text-[14px] text-muted-foreground mt-1 leading-relaxed max-w-[500px]">
                Manage your production capabilities, team members, and learning pipeline.
              </p>
            </div>
            <Button onClick={() => setShowWizard(true)}
              className="h-10 gap-2 text-[13px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90 shrink-0">
              <Plus className="h-4 w-4" /> New Capability
            </Button>
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
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {departments.map((dept) => {
                    const Icon = DEPT_ICONS[dept.icon] || Building2;
                    const m = dept.id ? getPoolMetrics(dept.id) : { teamSize: 0, avgSuccess: 0, loadPct: 0 };
                    const isExpanded = expandedDeptId === dept.id;
                    const loadColor = m.loadPct > 85 ? "text-destructive" : m.loadPct < 30 ? "text-status-amber" : "text-status-green";
                    const deptEmployees = activeEmployees.filter((e) => e.team_id === dept.id);

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
                            <AddEmployeeDialog teamId={dept.id} teamName={dept.name}
                              trigger={<Button size="sm" variant="outline" className="h-8 text-[12px] gap-1.5 px-3 font-bold rounded-lg shrink-0"><Plus className="h-3 w-3" /> Add</Button>}
                            />
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
                            {deptEmployees.length === 0 ? (
                              <div className="text-center py-6">
                                <Users className="h-8 w-8 text-muted-foreground/15 mx-auto mb-2" />
                                <p className="text-[14px] font-bold text-foreground">No members yet</p>
                                <p className="text-[13px] text-muted-foreground mt-1">Add employees to this capability pool.</p>
                                <AddEmployeeDialog teamId={dept.id} teamName={dept.name}
                                  trigger={<Button className="mt-3 h-9 gap-2 text-[12px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90"><Plus className="h-3.5 w-3.5" /> Add First Member</Button>}
                                />
                              </div>
                            ) : (
                              <EmployeeGrid
                                employees={deptEmployees}
                                allRoles={allRoles}
                                departments={departments}
                                onRemove={(id) => removeEmployee.mutate(id)}
                                onMove={(id, teamId) => moveEmployee.mutate({ empId: id, newTeamId: teamId })}
                              />
                            )}
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
            <div className="flex items-center justify-between">
              <SectionHeader icon={<Users className="h-5 w-5" />} title="All Team Members"
                subtitle={`${activeEmployees.length} active agents across all capabilities`} />
              <AddEmployeeDialog teamName="Unassigned" />
            </div>
            <div className="mt-4">
              {activeEmployees.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border bg-secondary/10 p-10 text-center">
                  <Users className="h-10 w-10 text-muted-foreground/15 mx-auto mb-3" />
                  <p className="text-[16px] font-bold text-foreground">No team members</p>
                  <p className="text-[13px] text-muted-foreground mt-1">Use the setup wizard or "Add Employee" to create your first agent.</p>
                </div>
              ) : (
                <EmployeeGrid
                  employees={activeEmployees}
                  allRoles={allRoles}
                  departments={departments}
                  onRemove={(id) => removeEmployee.mutate(id)}
                  onMove={(id, teamId) => moveEmployee.mutate({ empId: id, newTeamId: teamId })}
                />
              )}
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              SECTION 3 — HR PROPOSALS
              ════════════════════════════════════════════════════════ */}
          <HRProposalsSection
            departments={departments}
            activeEmployees={activeEmployees}
            allRoles={allRoles}
          />

          {/* ════════════════════════════════════════════════════════
              SECTION 4 — HIRING & PERFORMANCE
              ════════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon={<GraduationCap className="h-5 w-5" />} title="Hiring & Performance" />
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="rounded-2xl border border-border bg-card p-5 border-t-[3px] border-t-destructive/30">
                <h3 className="text-[16px] font-bold text-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive/60" /> At Risk
                </h3>
                {underperforming.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground/50">All agents performing well.</p>
                ) : (
                  <div className="space-y-2">
                    {underperforming.slice(0, 5).map((emp) => (
                      <Link key={emp.id} to={`/employees/${emp.id}`}>
                        <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-destructive/5 transition-colors group">
                          <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                          <span className="text-[14px] font-medium text-foreground truncate flex-1">{emp.name}</span>
                          <span className="text-[12px] font-mono text-destructive/70">{Math.round((emp.success_rate ?? 0) * 100)}%</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
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

function EmployeeGrid({ employees, allRoles, departments, onRemove, onMove }: {
  employees: any[]; allRoles: any[]; departments: any[];
  onRemove?: (id: string) => void;
  onMove?: (id: string, teamId: string) => void;
}) {
  const roleMap = Object.fromEntries(allRoles.map((r) => [r.id, r]));

  if (employees.length === 0) {
    return <p className="text-[13px] text-muted-foreground/50 py-4">No team members found.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {employees.map((emp) => {
        const persona = getPersona(emp.role_code);
        const st = getStatusMeta(emp.status);
        const role = emp.role_id ? roleMap[emp.role_id] : null;
        const roleName = role?.name ?? emp.role_code;
        const successPct = Math.round((emp.success_rate ?? 0) * 100);
        const repScore = emp.reputation_score ?? 0;
        const perfColor = repScore >= 0.8 ? "text-status-green" : repScore >= 0.5 ? "text-status-amber" : "text-destructive";
        const perfRing = repScore >= 0.8 ? "border-status-green/30" : repScore >= 0.5 ? "border-status-amber/30" : "border-destructive/30";
        const teamName = departments.find((d: any) => d.id === emp.team_id)?.name;
        // Extract config from role's skill_profile
        const sp = role?.skill_profile as any;
        const seniority = sp?.seniority;
        const mbtiType = sp?.mbtiType;
        const riskTol = sp?.riskTolerance;
        const riskCls = riskTol === "high" ? "text-destructive" : riskTol === "low" ? "text-status-green" : "text-status-amber";

        return (
          <div key={emp.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-md hover:-translate-y-px transition-all group">
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <div className={`rounded-xl border-[3px] ${perfRing} p-0.5`}>
                  <img src={persona.avatar} alt={emp.name}
                    className={`h-14 w-14 rounded-lg object-cover ring-2 ${persona.ringClass} ring-offset-2 ring-offset-card`}
                    width={56} height={56} />
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card ${st.dot}`} />
              </div>

              <div className="flex-1 min-w-0">
                <Link to={`/employees/${emp.id}`}>
                  <p className="text-[15px] font-bold text-foreground truncate leading-tight hover:underline">{emp.name}</p>
                </Link>
                <p className="text-[12px] text-muted-foreground truncate mt-0.5">{roleName}{seniority ? ` · ${seniority}` : ""}</p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <Badge className={`text-[10px] font-bold px-2 py-0.5 border-0 ${st.chipBg}`}>{st.label}</Badge>
                  <span className="text-[11px] font-mono text-muted-foreground">{successPct}%</span>
                  <span className={`text-[11px] font-bold font-mono ${perfColor}`}>{Math.round(repScore * 100)}</span>
                  {riskTol && <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 ${riskCls}`}>{riskTol} risk</Badge>}
                  {mbtiType && <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0">{mbtiType}</Badge>}
                  {teamName && <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0">{teamName}</Badge>}
                </div>
                {/* Stack badges */}
                {sp?.primaryStack?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(sp.primaryStack as string[]).slice(0, 4).map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-[9px] font-bold px-1.5 py-0">{s}</Badge>
                    ))}
                    {(sp.primaryStack as string[]).length > 4 && (
                      <span className="text-[9px] text-muted-foreground/50">+{(sp.primaryStack as string[]).length - 4}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {onMove && departments.length > 1 && (
                  <select className="text-[10px] font-bold text-muted-foreground bg-secondary border-0 rounded px-1.5 py-0.5 cursor-pointer w-16"
                    value="" onChange={(e) => { if (e.target.value) onMove(emp.id, e.target.value); }}>
                    <option value="">Move</option>
                    {departments.filter((d: any) => d.id !== emp.team_id).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                )}
                {onRemove && (
                  <button onClick={() => onRemove(emp.id)} className="text-muted-foreground/30 hover:text-destructive transition-colors p-0.5" title="Remove">
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
