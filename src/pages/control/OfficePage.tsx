import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useOfficeData, useOfficeRealtime } from "@/hooks/use-office-data";
import { useDepartments } from "@/hooks/use-department-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getPersona } from "@/lib/personas";
import { getMBTI } from "@/lib/mbtiData";
import { getNationality } from "@/lib/nationalityData";
import { ROLE_OPTIONS } from "@/lib/employeeConfig";
import { cn } from "@/lib/utils";
import { Users, ArrowRight, ChevronRight, Plus } from "lucide-react";

export default function OfficePage() {
  const { data, isLoading, error } = useOfficeData();
  useOfficeRealtime();
  const navigate = useNavigate();
  const { data: departments = [] } = useDepartments();

  const { data: allRolesWithProfile = [] } = useQuery({
    queryKey: ["office-roles-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("agent_roles")
        .select("id, code, name, skill_profile, team_id")
        .eq("status", "active");
      return data ?? [];
    },
  });

  const roleProfileById = useMemo(() =>
    Object.fromEntries(allRolesWithProfile.map((r) => [r.id, r])),
    [allRolesWithProfile]
  );

  // Build employees grouped by team
  const teamEmployees = useMemo(() => {
    if (!data) return {};
    const map: Record<string, any[]> = {};
    const employees = data.employees ?? [];
    for (const emp of employees) {
      if (["terminated", "inactive"].includes(emp.status)) continue;
      const teamId = emp.team_id ?? "__none";
      if (!map[teamId]) map[teamId] = [];
      const roleProfile = emp.role_id ? roleProfileById[emp.role_id] : null;
      const sp = (roleProfile?.skill_profile ?? null) as any;
      const tasks = data.allTasks.filter((t: any) => t.owner_role_id === emp.role_id);
      const activeTask = tasks.find((t: any) => ["in_progress", "waiting_review", "blocked"].includes(t.state));
      let status: "working" | "reviewing" | "blocked" | "idle" = "idle";
      if (activeTask) {
        if (activeTask.state === "in_progress") status = "working";
        else if (activeTask.state === "waiting_review") status = "reviewing";
        else if (activeTask.state === "blocked") status = "blocked";
      }
      map[teamId].push({
        id: emp.id, name: emp.name, code: emp.role_code, status, empStatus: emp.status,
        reputationScore: emp.reputation_score ?? 0, taskTitle: activeTask?.title ?? null,
        mbtiCode: sp?.mbtiCode ?? null, nationalityCode: sp?.nationalityCode ?? null,
      });
    }
    return map;
  }, [data, roleProfileById]);

  const totalEmployees = Object.values(teamEmployees).flat().length;

  if (isLoading) {
    return <AppLayout title="Office"><p className="text-[15px] text-muted-foreground p-10">Loading…</p></AppLayout>;
  }
  if (error || !data) {
    return <AppLayout title="Office"><p className="text-[15px] text-destructive p-10">Error loading data.</p></AppLayout>;
  }

  const teamData = data.teams ?? [];
  const hasNoSetup = teamData.length === 0 && totalEmployees === 0;

  return (
    <AppLayout title="Office">
      <ScrollArea className="h-full">
        <div className="px-10 py-8 max-w-[1280px] space-y-10">

          {/* ═══ EMPTY STATE ═══ */}
          {hasNoSetup && (
            <div className="py-20 text-center max-w-[480px] mx-auto">
              <h1 className="text-[36px] font-bold text-foreground tracking-tight">Production Floor</h1>
              <p className="text-[17px] text-muted-foreground mt-4 leading-relaxed">
                Add team members to activate your production floor.
              </p>
              <Link to="/teams">
                <Button className="mt-10 h-12 px-8 gap-2.5 text-[15px] font-bold rounded-2xl bg-foreground text-background hover:bg-foreground/90">
                  <Users className="h-4 w-4" /> Go to Teams
                </Button>
              </Link>
            </div>
          )}

          {!hasNoSetup && (
            <>
              {/* ── Header ── */}
              <div>
                <h1 className="text-[32px] font-bold text-foreground tracking-tight">Office</h1>
                <p className="text-[15px] text-muted-foreground mt-1">
                  {totalEmployees} member{totalEmployees !== 1 ? "s" : ""} · {data.projects.length} project{data.projects.length !== 1 ? "s" : ""}
                </p>
              </div>

              {/* ═══ CAPABILITY ROOMS ═══ */}
              <div className="space-y-6">
                {teamData.map((team: any) => {
                  const employees = teamEmployees[team.id] ?? [];
                  if (employees.length === 0) return null;
                  const dept = departments.find((d) => d.name === team.name);

                  return (
                    <div key={team.id} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                      {/* Room header */}
                      <div className="flex items-center justify-between px-6 py-5">
                        <div>
                          <h2 className="text-[20px] font-bold text-foreground">{team.name}</h2>
                          <p className="text-[14px] text-muted-foreground mt-0.5">
                            {employees.length} member{employees.length !== 1 ? "s" : ""} · {team.active_tasks ?? 0} active task{(team.active_tasks ?? 0) !== 1 ? "s" : ""}
                          </p>
                        </div>
                        {dept && (
                          <Link to={`/team-room?dept=${dept.slug}`}>
                            <Button variant="ghost" className="h-9 text-[14px] text-muted-foreground hover:text-foreground gap-1.5">
                              Session <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        )}
                      </div>

                      {/* Employees — horizontal flow */}
                      <div className="px-6 pb-6">
                        <div className="flex flex-wrap gap-5">
                          {employees.map((emp: any) => (
                            <PersonCard key={emp.id} emp={emp} onClick={() => navigate(`/employees/${emp.id}`)} />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Employees without a team */}
                {(teamEmployees["__none"]?.length ?? 0) > 0 && (
                  <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                    <div className="px-6 py-5">
                      <h2 className="text-[20px] font-bold text-foreground">Unassigned</h2>
                    </div>
                    <div className="px-6 pb-6">
                      <div className="flex flex-wrap gap-5">
                        {teamEmployees["__none"]!.map((emp: any) => (
                          <PersonCard key={emp.id} emp={emp} onClick={() => navigate(`/employees/${emp.id}`)} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </AppLayout>
  );
}

/* ═══ PERSON CARD — calm, human, real ═══ */
const STATUS_DOT: Record<string, string> = {
  working: "bg-status-amber",
  reviewing: "bg-lifecycle-review",
  blocked: "bg-destructive",
  idle: "bg-muted-foreground/20",
};

const STATUS_LABEL: Record<string, string> = {
  working: "Working",
  reviewing: "Reviewing",
  blocked: "Blocked",
  idle: "Available",
};

function PersonCard({ emp, onClick }: { emp: any; onClick: () => void }) {
  const persona = getPersona(emp.code);
  const roleName = ROLE_OPTIONS.find((r) => r.code === emp.code)?.label ?? emp.code;
  const mbti = emp.mbtiCode ? getMBTI(emp.mbtiCode) : null;
  const nation = emp.nationalityCode ? getNationality(emp.nationalityCode) : null;
  const repScore = Math.round((emp.reputationScore ?? 0) * 100);
  const perfColor = repScore >= 80 ? "text-status-green" : repScore >= 50 ? "text-status-amber" : "text-destructive";
  const dot = STATUS_DOT[emp.status] ?? STATUS_DOT.idle;
  const label = STATUS_LABEL[emp.status] ?? "Idle";

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={onClick}
            className="flex flex-col items-center w-[130px] py-5 rounded-2xl hover:bg-secondary/20 transition-all cursor-pointer group"
          >
            {/* Avatar */}
            <div className="relative mb-3">
              <img
                src={persona.avatar} alt={emp.name}
                className="h-16 w-16 rounded-xl object-cover"
                width={64} height={64} loading="lazy"
              />
              <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${dot} ${emp.status === "working" ? "animate-pulse" : ""}`} />
            </div>

            {/* Name */}
            <span className="text-[14px] font-semibold text-foreground text-center leading-tight truncate max-w-full px-1">
              {emp.name}
            </span>
            <span className="text-[12px] text-muted-foreground/60 mt-0.5">{roleName}</span>

            {/* Score */}
            <span className={`text-[14px] font-bold font-mono mt-2 ${perfColor}`}>{repScore}</span>

            {/* Status text */}
            <span className="text-[11px] text-muted-foreground/40 mt-1">{label}</span>
          </div>
        </TooltipTrigger>

        {/* Tooltip */}
        <TooltipContent side="bottom" className="max-w-[260px] p-4 space-y-2">
          <p className="text-[14px] font-bold text-foreground">{emp.name}</p>
          <p className="text-[13px] text-muted-foreground">{roleName}</p>
          {mbti && <p className="text-[12px] text-muted-foreground/70">{mbti.label} — {mbti.shortDesc}</p>}
          {nation && <p className="text-[12px] text-muted-foreground/70">{nation.flag} {nation.label} · {nation.workStyle}</p>}
          {emp.taskTitle && <p className="text-[12px] text-foreground/80 italic">"{emp.taskTitle}"</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
