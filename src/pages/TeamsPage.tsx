import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDepartments } from "@/hooks/use-department-data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { getPersona } from "@/lib/personas";
import { TeamSetupWizard } from "@/components/teams/TeamSetupWizard";
import { AddEmployeeDialog } from "@/components/teams/AddEmployeeDialog";
import { TeamBalanceChart } from "@/components/teams/TeamBalanceChart";
import { toast } from "sonner";
import { getMBTI } from "@/lib/mbtiData";
import { getNationality } from "@/lib/nationalityData";
import {
  computeTeamDistribution,
  ROLE_OPTIONS, STATUS_META,
} from "@/lib/employeeConfig";
import {
  Smartphone, Bot, Globe, Building2, ArrowRight, Users, TrendingUp, Gauge,
  ChevronDown, ChevronRight, AlertTriangle, ShieldAlert, BarChart3,
  Zap, Activity, Plus,
  Sparkles,
} from "lucide-react";

const DEPT_ICONS: Record<string, React.ElementType> = { Smartphone, Bot, Globe, Building2 };

export default function TeamsPage() {
  const qc = useQueryClient();
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const { data: departments = [], isLoading: deptLoading } = useDepartments();

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
