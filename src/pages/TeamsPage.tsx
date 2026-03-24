import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDepartments } from "@/hooks/use-department-data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { getPersona } from "@/lib/personas";
import { TeamSetupWizard } from "@/components/teams/TeamSetupWizard";
import { AddEmployeeDialog } from "@/components/teams/AddEmployeeDialog";
import { toast } from "sonner";
import { getNationality } from "@/lib/nationalityData";
import { ROLE_OPTIONS, STATUS_META } from "@/lib/employeeConfig";
import { Plus, ArrowRight, ChevronRight } from "lucide-react";

export default function TeamsPage() {
  const qc = useQueryClient();
  const [showWizard, setShowWizard] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
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

  const activeEmployees = allEmployees.filter((e) => !["terminated", "inactive"].includes(e.status));
  const hasNoSetup = departments.length === 0 && activeEmployees.length === 0;

  // Filter by selected capability
  const displayEmployees = selectedDept
    ? activeEmployees.filter((e) => e.team_id === selectedDept)
    : activeEmployees;

  const selectedDeptObj = departments.find((d) => d.id === selectedDept);

  if (hasNoSetup || showWizard) {
    return (
      <AppLayout title="Teams">
        <ScrollArea className="h-full">
          <div className="px-8 py-8">
            {!showWizard && hasNoSetup ? (
              <div className="max-w-[560px] mx-auto text-center py-20">
                <h1 className="text-[36px] font-bold text-foreground tracking-tight leading-tight">
                  Build your team
                </h1>
                <p className="text-[17px] text-muted-foreground mt-4 leading-relaxed">
                  Create a capability and add your first AI team member to begin production.
                </p>
                <Button onClick={() => setShowWizard(true)}
                  className="mt-10 h-12 px-8 gap-2.5 text-[15px] font-bold rounded-2xl bg-foreground text-background hover:bg-foreground/90">
                  <Plus className="h-4 w-4" /> Start Setup
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
    <AppLayout title="Teams">
      <ScrollArea className="h-full">
        <div className="px-10 py-8 max-w-[1280px] space-y-10">

          {/* ── Header ── */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[32px] font-bold text-foreground tracking-tight">Teams</h1>
              <p className="text-[15px] text-muted-foreground mt-1">
                {activeEmployees.length} member{activeEmployees.length !== 1 ? "s" : ""} across {departments.length} capabilit{departments.length !== 1 ? "ies" : "y"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <AddEmployeeDialog teamName={selectedDeptObj?.name ?? "Unassigned"} teamId={selectedDept ?? undefined} />
              <Button onClick={() => setShowWizard(true)} variant="ghost"
                className="h-10 text-[14px] text-muted-foreground hover:text-foreground">
                <Plus className="h-4 w-4 mr-1.5" /> Capability
              </Button>
            </div>
          </div>

          {/* ── Capability selector ── */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedDept(null)}
              className={`px-4 py-2 rounded-xl text-[14px] font-semibold transition-all ${
                !selectedDept
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              All ({activeEmployees.length})
            </button>
            {departments.map((dept) => {
              const count = activeEmployees.filter((e) => e.team_id === dept.id).length;
              const isActive = selectedDept === dept.id;
              return (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDept(isActive ? null : dept.id)}
                  className={`px-4 py-2 rounded-xl text-[14px] font-semibold transition-all ${
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {dept.name} ({count})
                </button>
              );
            })}
          </div>

          {/* ── Session shortcut ── */}
          {selectedDeptObj && (
            <Link to={`/team-room?dept=${selectedDeptObj.slug}`}
              className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-card border border-border hover:border-foreground/10 hover:shadow-sm transition-all group">
              <span className="text-[15px] font-semibold text-foreground">Start session with {selectedDeptObj.name}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors ml-auto" />
            </Link>
          )}

          {/* ── Employee list ── */}
          {displayEmployees.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[20px] font-bold text-foreground">
                {selectedDept ? "No members in this capability" : "No team members yet"}
              </p>
              <p className="text-[15px] text-muted-foreground mt-2">
                Add your first AI team member to get started.
              </p>
              <AddEmployeeDialog teamName={selectedDeptObj?.name ?? "Unassigned"} teamId={selectedDept ?? undefined}
                trigger={
                  <Button className="mt-6 h-11 px-6 gap-2 text-[14px] font-bold rounded-2xl bg-foreground text-background hover:bg-foreground/90">
                    <Plus className="h-4 w-4" /> Add Team Member
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="space-y-1">
              {displayEmployees.map((emp) => (
                <EmployeeRow
                  key={emp.id}
                  emp={emp}
                  allRoles={allRoles}
                  departments={departments}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </AppLayout>
  );
}

/* ═══ EMPLOYEE ROW — minimal, human ═══ */
function EmployeeRow({ emp, allRoles, departments }: { emp: any; allRoles: any[]; departments: any[] }) {
  const persona = getPersona(emp.role_code);
  const stMeta = STATUS_META[emp.status] ?? STATUS_META.active;
  const role = emp.role_id ? allRoles.find((r) => r.id === emp.role_id) : null;
  const roleName = ROLE_OPTIONS.find((r) => r.code === emp.role_code)?.label ?? emp.role_code;
  const teamName = departments.find((d: any) => d.id === emp.team_id)?.name;
  const sp = role?.skill_profile as any;
  const nationCode = sp?.nationalityCode;
  const nation = nationCode ? getNationality(nationCode) : null;
  const primaryStack = (sp?.primaryStack as string[]) ?? [];
  const repScore = Math.round((emp.reputation_score ?? 0) * 100);
  const perfColor = repScore >= 80 ? "text-status-green" : repScore >= 50 ? "text-status-amber" : "text-destructive";
  const isAtRisk = emp.status === "probation" || emp.status === "under_review";

  return (
    <Link to={`/employees/${emp.id}`} className="block">
      <div className={`flex items-center gap-5 px-5 py-4 rounded-2xl transition-all hover:bg-card hover:shadow-sm group ${
        isAtRisk ? "bg-destructive/[0.02]" : ""
      }`}>
        {/* Avatar */}
        <div className="relative shrink-0">
          <img
            src={persona.avatar} alt={emp.name}
            className="h-11 w-11 rounded-xl object-cover"
            width={44} height={44}
          />
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${stMeta.dot}`} />
        </div>

        {/* Name + Role */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="text-[15px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
              {emp.name}
            </span>
            {nation && <span className="text-[14px] leading-none">{nation.flag}</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[13px] text-muted-foreground">{roleName}</span>
            {teamName && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span className="text-[13px] text-muted-foreground/70">{teamName}</span>
              </>
            )}
          </div>
        </div>

        {/* Stack */}
        <div className="hidden lg:flex items-center gap-1.5 shrink-0">
          {primaryStack.slice(0, 3).map((s) => (
            <span key={s} className="text-[12px] text-muted-foreground/60 font-medium">{s}</span>
          ))}
        </div>

        {/* Status */}
        <Badge className={`text-[11px] font-semibold border-0 px-2.5 py-0.5 shrink-0 ${stMeta.bg} ${stMeta.color}`}>
          {stMeta.label}
        </Badge>

        {/* Score */}
        <span className={`text-[16px] font-bold font-mono tabular-nums shrink-0 w-10 text-right ${perfColor}`}>
          {repScore}
        </span>

        <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors shrink-0" />
      </div>
    </Link>
  );
}
