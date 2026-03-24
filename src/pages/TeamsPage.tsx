import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDepartments } from "@/hooks/use-department-data";
import { useHRDashboard } from "@/hooks/use-hr-data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { getPersona } from "@/lib/personas";
import { TeamSetupWizard } from "@/components/teams/TeamSetupWizard";
import { AddEmployeeDialog } from "@/components/teams/AddEmployeeDialog";
import { HRProposalCard } from "@/components/teams/HRProposalCard";
import { PerformanceProposalCard } from "@/components/teams/PerformanceProposalCard";
import { TeamBalanceChart } from "@/components/teams/TeamBalanceChart";
import { toast } from "sonner";
import { getMBTI } from "@/lib/mbtiData";
import { getNationality } from "@/lib/nationalityData";
import {
  generateHRProposals, generatePerformanceProposals, computeTeamDistribution,
  type HRProposal, type HRPerformanceProposal, ROLE_OPTIONS, STATUS_META,
} from "@/lib/employeeConfig";
import {
  Smartphone, Bot, Globe, Building2, ArrowRight, Users, TrendingUp, Gauge,
  ChevronDown, ChevronRight, AlertTriangle, Lightbulb, Trophy,
  Zap, Activity, GraduationCap, FlaskConical, Plus,
  UserPlus, ShieldAlert, BarChart3, Sparkles,
} from "lucide-react";

const DEPT_ICONS: Record<string, React.ElementType> = { Smartphone, Bot, Globe, Building2 };

export default function TeamsPage() {
  const qc = useQueryClient();
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const { data: departments = [], isLoading: deptLoading } = useDepartments();
  const { data: hrData } = useHRDashboard();

  const { data: allEmployees = [] } = useQuery({
    queryKey: ["all-employees-full"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_employees")
        .select("id, name, role_code, role_id, status, success_rate, reputation_score, bug_rate, escalation_rate, avg_cost, avg_latency, model_name, provider, team_id")
        .order("reputation_score", { ascending: false });
      return data ?? [];
    },
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ["all-roles-teams"],
    queryFn: async () => {
      const { data } = await supabase.from("agent_roles")
        .select("id, name, code, status, success_rate, total_runs, capacity_score, team_id, skill_profile");
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

  const activeEmployees = allEmployees.filter((e) => !["terminated", "inactive"].includes(e.status));
  const underperforming = allEmployees.filter((e) => e.status !== "terminated" && ((e.success_rate ?? 0) < 0.6 || (e.bug_rate ?? 0) > 0.3));
  const probationCount = allEmployees.filter((e) => e.status === "probation").length;
  const onboardingCount = allEmployees.filter((e) => e.status === "onboarding").length;
  const suggestions = hrData?.suggestions?.filter((s: any) => !s.resolved) ?? [];
  const hasNoSetup = departments.length === 0 && activeEmployees.length === 0;

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
                <h1 className="text-[32px] font-bold text-foreground tracking-tight">Build Your First AI Team</h1>
                <p className="text-[16px] text-muted-foreground mt-3 leading-relaxed max-w-[460px] mx-auto">
                  Create a capability pool and add AI team members to start production.
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
                Manage your production capabilities, team members, and performance pipeline.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <AddEmployeeDialog teamName="Unassigned" />
              <Button onClick={() => setShowWizard(true)} variant="outline"
                className="h-9 gap-2 text-[13px] font-bold rounded-xl shrink-0">
                <Plus className="h-3.5 w-3.5" /> New Capability
              </Button>
            </div>
          </div>

          {/* ── Summary strip ── */}
          <div className="flex items-center gap-5 text-[13px] flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground/50" />
              <span className="font-bold text-foreground font-mono">{activeEmployees.length}</span>
              <span className="text-muted-foreground">active</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground/50" />
              <span className="font-bold text-foreground font-mono">{departments.length}</span>
              <span className="text-muted-foreground">capabilities</span>
            </div>
            {probationCount > 0 && (
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-status-amber/60" />
                <span className="font-bold text-status-amber font-mono">{probationCount}</span>
                <span className="text-status-amber/70">probation</span>
              </div>
            )}
            {onboardingCount > 0 && (
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-status-blue/60" />
                <span className="font-bold text-status-blue font-mono">{onboardingCount}</span>
                <span className="text-status-blue/70">onboarding</span>
              </div>
            )}
            {underperforming.length > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive/60" />
                <span className="font-bold text-destructive font-mono">{underperforming.length}</span>
                <span className="text-destructive/70">at risk</span>
              </div>
            )}
          </div>

          {/* ═══ SECTION 1 — CAPABILITY POOLS ═══ */}
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
                    const deptRoles = allRoles.filter((r) => r.team_id === dept.id);
                    const distMembers = deptEmployees.map((e) => {
                      const role = deptRoles.find((r) => r.id === e.role_id);
                      const sp = role?.skill_profile as any;
                      return { roleCode: e.role_code, seniority: sp?.seniority, riskTolerance: sp?.riskTolerance, speedVsQuality: sp?.speedVsQuality };
                    });
                    const distribution = computeTeamDistribution(distMembers);

                    return (
                      <div key={dept.id} className={`rounded-2xl border overflow-hidden transition-all ${
                        isExpanded ? "lg:col-span-2 border-primary/20 shadow-md" : "border-border hover:shadow-md hover:-translate-y-px"
                      } bg-card`}>
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
                                <span className="flex items-center gap-1"><Gauge className={`h-3 w-3 ${loadColor}/60`} /> <strong className={`font-mono ${loadColor}`}>{m.loadPct}%</strong></span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mt-3">
                            <Progress value={m.loadPct} className="h-1.5 flex-1" />
                            <AddEmployeeDialog teamId={dept.id} teamName={dept.name}
                              trigger={<Button size="sm" variant="outline" className="h-8 text-[12px] gap-1.5 px-3 font-bold rounded-lg shrink-0"><Plus className="h-3 w-3" /> Add Member</Button>}
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

                        {isExpanded && (
                          <div className="px-5 pb-5 pt-2 border-t border-border/30 space-y-4">
                            {deptEmployees.length > 0 && (
                              <div>
                                <p className="text-[12px] font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                                  <BarChart3 className="h-3 w-3" /> Team Balance
                                </p>
                                <TeamBalanceChart distribution={distribution} total={deptEmployees.length} />
                              </div>
                            )}

                            {deptEmployees.length === 0 ? (
                              <div className="text-center py-6">
                                <Users className="h-8 w-8 text-muted-foreground/15 mx-auto mb-2" />
                                <p className="text-[14px] font-bold text-foreground">No members yet</p>
                                <AddEmployeeDialog teamId={dept.id} teamName={dept.name}
                                  trigger={<Button className="mt-3 h-9 gap-2 text-[12px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90"><Plus className="h-3.5 w-3.5" /> Add First Member</Button>}
                                />
                              </div>
                            ) : (
                              <EmployeeTable
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

          {/* ═══ SECTION 2 — ALL TEAM MEMBERS (ROW TABLE) ═══ */}
          <section>
            <div className="flex items-center justify-between">
              <SectionHeader icon={<Users className="h-5 w-5" />} title="All Team Members"
                subtitle={`${activeEmployees.length} agents across all capabilities`} />
            </div>
            <div className="mt-4">
              {activeEmployees.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border bg-secondary/10 p-10 text-center">
                  <Users className="h-10 w-10 text-muted-foreground/15 mx-auto mb-3" />
                  <p className="text-[18px] font-bold text-foreground">Build Your First AI Team</p>
                  <p className="text-[14px] text-muted-foreground mt-1.5 max-w-[400px] mx-auto">
                    Add team members to your capabilities to start production delivery.
                  </p>
                  <AddEmployeeDialog teamName="Unassigned"
                    trigger={<Button className="mt-5 h-11 px-6 gap-2 text-[14px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90"><Plus className="h-4 w-4" /> Add Team Member</Button>}
                  />
                </div>
              ) : (
                <EmployeeTable
                  employees={activeEmployees}
                  allRoles={allRoles}
                  departments={departments}
                  onRemove={(id) => removeEmployee.mutate(id)}
                  onMove={(id, teamId) => moveEmployee.mutate({ empId: id, newTeamId: teamId })}
                />
              )}
            </div>
          </section>

          {/* ═══ SECTION 3 — HIRING & PERFORMANCE (CONSOLIDATED) ═══ */}
          <section>
            <SectionHeader icon={<GraduationCap className="h-5 w-5" />} title="Hiring & Performance" />

            <div className="mt-4 space-y-6">
              {/* HR Hiring Proposals */}
              <HRHiringProposalsSection departments={departments} activeEmployees={activeEmployees} allRoles={allRoles} />

              {/* Performance Review */}
              <PerformanceReviewSection allEmployees={allEmployees} departments={departments} allRoles={allRoles} />

              {/* Stats row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
                          <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-destructive/5 transition-colors">
                            <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                            <span className="text-[14px] font-medium text-foreground truncate flex-1">{emp.name}</span>
                            <StatusChip status={emp.status} />
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

function StatusChip({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.active;
  return <Badge className={`text-[9px] font-bold border-0 px-1.5 py-0 ${meta.bg} ${meta.color}`}>{meta.label}</Badge>;
}

/* ═══ ROW-BASED EMPLOYEE TABLE ═══ */
function EmployeeTable({ employees, allRoles, departments, onRemove, onMove }: {
  employees: any[]; allRoles: any[]; departments: any[];
  onRemove?: (id: string) => void;
  onMove?: (id: string, teamId: string) => void;
}) {
  const roleMap = Object.fromEntries(allRoles.map((r) => [r.id, r]));

  if (employees.length === 0) {
    return <p className="text-[13px] text-muted-foreground/50 py-4">No team members found.</p>;
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Header row */}
      <div className="grid grid-cols-[44px_1fr_120px_120px_80px_60px_80px_80px_80px_60px_60px] gap-2 px-4 py-2.5 bg-secondary/30 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
        <span></span>
        <span>Name</span>
        <span>Role</span>
        <span>Capability</span>
        <span>Seniority</span>
        <span>MBTI</span>
        <span>Origin</span>
        <span>Stack</span>
        <span>Status</span>
        <span className="text-right">Success</span>
        <span className="text-right">Score</span>
      </div>
      {/* Rows */}
      {employees.map((emp) => {
        const persona = getPersona(emp.role_code);
        const stMeta = STATUS_META[emp.status] ?? STATUS_META.active;
        const role = emp.role_id ? roleMap[emp.role_id] : null;
        const roleName = ROLE_OPTIONS.find(r => r.code === emp.role_code)?.label ?? emp.role_code;
        const successPct = Math.round((emp.success_rate ?? 0) * 100);
        const repScore = Math.round((emp.reputation_score ?? 0) * 100);
        const perfColor = repScore >= 80 ? "text-status-green" : repScore >= 50 ? "text-status-amber" : "text-destructive";
        const teamName = departments.find((d: any) => d.id === emp.team_id)?.name ?? "—";
        const sp = role?.skill_profile as any;
        const seniority = sp?.seniority ?? "—";
        const mbtiCode = sp?.mbtiCode;
        const nationCode = sp?.nationalityCode;
        const nation = nationCode ? getNationality(nationCode) : null;
        const primaryStack = sp?.primaryStack as string[] | undefined;
        const isProbation = emp.status === "probation";
        const isUnderReview = emp.status === "under_review";

        return (
          <Link key={emp.id} to={`/employees/${emp.id}`} className="block">
            <div className={`grid grid-cols-[44px_1fr_120px_120px_80px_60px_80px_80px_80px_60px_60px] gap-2 px-4 py-3 items-center border-b border-border/30 hover:bg-secondary/20 transition-colors group ${
              isProbation ? "bg-status-amber/[0.02]" : isUnderReview ? "bg-lifecycle-review/[0.02]" : ""
            }`}>
              {/* Avatar */}
              <div className="relative">
                <img src={persona.avatar} alt={emp.name}
                  className={`h-9 w-9 rounded-lg object-cover ring-2 ${persona.ringClass} ring-offset-1 ring-offset-card`}
                  width={36} height={36} />
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${stMeta.dot}`} />
              </div>

              {/* Name */}
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-foreground truncate leading-tight group-hover:text-primary transition-colors">{emp.name}</p>
              </div>

              {/* Role */}
              <span className="text-[12px] text-muted-foreground truncate">{roleName}</span>

              {/* Capability */}
              <span className="text-[12px] text-muted-foreground truncate">{teamName}</span>

              {/* Seniority */}
              <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 w-fit">{seniority}</Badge>

              {/* MBTI */}
              <span className="text-[11px] font-mono font-bold text-foreground/70">{mbtiCode ?? "—"}</span>

              {/* Nationality */}
              <span className="text-[14px]">{nation ? `${nation.flag} ${nation.code}` : "—"}</span>

              {/* Stack */}
              <div className="flex gap-0.5 overflow-hidden">
                {primaryStack?.slice(0, 2).map((s: string) => (
                  <Badge key={s} variant="secondary" className="text-[9px] font-bold px-1 py-0 shrink-0">{s}</Badge>
                ))}
                {(primaryStack?.length ?? 0) > 2 && <span className="text-[9px] text-muted-foreground/50">+{(primaryStack?.length ?? 0) - 2}</span>}
                {!primaryStack?.length && <span className="text-[10px] text-muted-foreground/30">—</span>}
              </div>

              {/* Status */}
              <Badge className={`text-[9px] font-bold border-0 px-1.5 py-0 ${stMeta.bg} ${stMeta.color} w-fit`}>{stMeta.label}</Badge>

              {/* Success */}
              <span className="text-[12px] font-mono font-bold text-right text-foreground">{successPct}%</span>

              {/* Score */}
              <span className={`text-[12px] font-mono font-bold text-right ${perfColor}`}>{repScore}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function HRHiringProposalsSection({ departments, activeEmployees, allRoles }: { departments: any[]; activeEmployees: any[]; allRoles: any[] }) {
  const qc = useQueryClient();
  const [proposals, setProposals] = useState<HRProposal[]>([]);
  const [generated, setGenerated] = useState(false);

  const generateAll = () => {
    const all: HRProposal[] = [];
    for (const dept of departments) {
      const deptEmps = activeEmployees.filter((e: any) => e.team_id === dept.id);
      const deptRoles = allRoles.filter((r: any) => r.team_id === dept.id);
      const members = deptEmps.map((e: any) => {
        const role = deptRoles.find((r: any) => r.id === e.role_id);
        const sp = role?.skill_profile as any;
        return { roleCode: e.role_code, seniority: sp?.seniority ?? "Middle", riskTolerance: sp?.riskTolerance, speedVsQuality: sp?.speedVsQuality, successRate: e.success_rate, bugRate: e.bug_rate };
      });
      const stack = (deptRoles[0]?.skill_profile as any)?.primaryStack ?? [];
      all.push(...generateHRProposals(dept.id, dept.name, members, stack));
    }
    setProposals(all);
    setGenerated(true);
  };

  const handleApprove = async (id: string) => {
    const p = proposals.find((x) => x.id === id);
    if (!p) return;
    try {
      const label = ROLE_OPTIONS.find((r) => r.code === p.suggestedRole)?.label ?? p.suggestedRole;
      const { data: role } = await supabase.from("agent_roles").select("id").eq("code", p.suggestedRole).eq("team_id", p.capabilityId).maybeSingle();
      let roleId = role?.id;
      if (!roleId) {
        const { data: nr } = await supabase.from("agent_roles").insert({ code: p.suggestedRole, name: label, description: label, team_id: p.capabilityId, skill_profile: p.traits }).select("id").single();
        roleId = nr?.id;
      }
      const { generateEmployeeName } = await import("@/services/EmployeeNamingService");
      await supabase.from("ai_employees").insert({ name: generateEmployeeName(p.suggestedRole, Math.floor(Math.random() * 30)), role_code: p.suggestedRole, role_id: roleId ?? null, team_id: p.capabilityId, status: "onboarding", model_name: "gpt-4o", provider: "openai" });
      setProposals((prev) => prev.map((x) => x.id === id ? { ...x, status: "approved" as const } : x));
      qc.invalidateQueries({ queryKey: ["all-employees-full"] });
      toast.success(`${label} approved — employee created in Onboarding status`);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleReject = (id: string, reason: string) => {
    setProposals((prev) => prev.map((x) => x.id === id ? { ...x, status: "rejected" as const, rejectionReason: reason } : x));
    toast.success("Proposal rejected");
  };

  if (departments.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[16px] font-bold text-foreground flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-muted-foreground/50" /> Hiring Proposals
        </h3>
        <Button onClick={generateAll} variant="outline" className="h-8 gap-2 text-[12px] font-bold rounded-lg shrink-0">
          <Zap className="h-3.5 w-3.5" /> {generated ? "Regenerate" : "Analyze Gaps"}
        </Button>
      </div>
      {!generated ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-secondary/10 p-6 text-center">
          <p className="text-[13px] text-muted-foreground">Click "Analyze Gaps" to get AI hiring recommendations.</p>
        </div>
      ) : proposals.length === 0 ? (
        <div className="rounded-xl border border-status-green/30 bg-status-green/5 p-4 text-center">
          <p className="text-[13px] font-bold text-foreground">All capabilities are well-staffed</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {proposals.map((p) => <HRProposalCard key={p.id} proposal={p} onApprove={handleApprove} onReject={handleReject} />)}
        </div>
      )}
    </div>
  );
}

function PerformanceReviewSection({ allEmployees, departments, allRoles }: { allEmployees: any[]; departments: any[]; allRoles: any[] }) {
  const qc = useQueryClient();
  const [proposals, setProposals] = useState<HRPerformanceProposal[]>([]);
  const [generated, setGenerated] = useState(false);

  const generateAll = () => {
    const result = generatePerformanceProposals(allEmployees, departments, allRoles);
    setProposals(result);
    setGenerated(true);
  };

  const handleApprove = async (id: string) => {
    const p = proposals.find((x) => x.id === id);
    if (!p) return;
    try {
      let newStatus: string | undefined;
      if (p.type === "probation") newStatus = "probation";
      else if (p.type === "restore_active") newStatus = "active";
      else if (p.type === "remove_from_capability") newStatus = "suspended";
      else if (p.type === "replacement") newStatus = "suspended";

      if (newStatus) {
        const { error } = await supabase.from("ai_employees").update({ status: newStatus }).eq("id", p.employeeId);
        if (error) throw error;
      }

      if (p.type === "replacement" && p.replacementConfig) {
        const rc = p.replacementConfig;
        const label = ROLE_OPTIONS.find(r => r.code === rc.suggestedRole)?.label ?? rc.suggestedRole;
        const { data: role } = await supabase.from("agent_roles").select("id").eq("code", rc.suggestedRole).eq("team_id", p.capabilityId).maybeSingle();
        let roleId = role?.id;
        if (!roleId) {
          const { data: nr } = await supabase.from("agent_roles").insert({ code: rc.suggestedRole, name: label, description: label, team_id: p.capabilityId, skill_profile: rc.traits }).select("id").single();
          roleId = nr?.id;
        }
        const { generateEmployeeName } = await import("@/services/EmployeeNamingService");
        await supabase.from("ai_employees").insert({
          name: generateEmployeeName(rc.suggestedRole, Math.floor(Math.random() * 30)),
          role_code: rc.suggestedRole, role_id: roleId ?? null, team_id: p.capabilityId,
          status: "onboarding", model_name: "gpt-4o", provider: "openai",
        });
      }

      setProposals((prev) => prev.map((x) => x.id === id ? { ...x, status: "approved" as const } : x));
      qc.invalidateQueries({ queryKey: ["all-employees-full"] });
      qc.invalidateQueries({ queryKey: ["hr-dashboard"] });
      toast.success(`${p.type === "replacement" ? "Replacement" : "Status change"} approved for ${p.employeeName}`);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleReject = (id: string, reason: string) => {
    setProposals((prev) => prev.map((x) => x.id === id ? { ...x, status: "rejected" as const, rejectionReason: reason } : x));
    toast.success("Proposal rejected");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[16px] font-bold text-foreground flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground/50" /> Performance Review
        </h3>
        <Button onClick={generateAll} variant="outline" className="h-8 gap-2 text-[12px] font-bold rounded-lg shrink-0">
          <ShieldAlert className="h-3.5 w-3.5" /> {generated ? "Re-analyze" : "Run Review"}
        </Button>
      </div>
      {!generated ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-secondary/10 p-6 text-center">
          <p className="text-[13px] text-muted-foreground">Click "Run Review" to analyze employee performance.</p>
        </div>
      ) : proposals.length === 0 ? (
        <div className="rounded-xl border border-status-green/30 bg-status-green/5 p-4 text-center">
          <p className="text-[13px] font-bold text-foreground">All employees are performing within expectations</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {proposals.map((p) => <PerformanceProposalCard key={p.id} proposal={p} onApprove={handleApprove} onReject={handleReject} />)}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground/40">{icon}</div>
      <div>
        <h2 className="text-[20px] font-bold text-foreground tracking-tight">{title}</h2>
        {subtitle && <p className="text-[13px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
