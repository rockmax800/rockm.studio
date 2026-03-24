import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useOfficeData, useOfficeRealtime } from "@/hooks/use-office-data";
import { useDepartments } from "@/hooks/use-department-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { AddEmployeeDialog } from "@/components/teams/AddEmployeeDialog";
import { getPersona } from "@/lib/personas";
import { getMBTI } from "@/lib/mbtiData";
import { getNationality } from "@/lib/nationalityData";
import { ROLE_OPTIONS } from "@/lib/employeeConfig";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Activity, Users, Zap, Stamp, FolderKanban,
  AlertTriangle, ChevronRight, Shield, Play, Eye,
  UserPlus, OctagonX,
  CheckCircle, XCircle, Upload, ThumbsUp, ThumbsDown,
  Rocket, ArrowRight, GitPullRequest, Loader2,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   CINEMATIC STUDIO CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const ROOM_POSITIONS = [
  { gridArea: "1 / 1 / 2 / 2", glow: "from-blue-500/6 to-transparent" },
  { gridArea: "1 / 2 / 2 / 3", glow: "from-violet-500/6 to-transparent" },
  { gridArea: "2 / 1 / 3 / 2", glow: "from-amber-500/6 to-transparent" },
  { gridArea: "2 / 2 / 3 / 3", glow: "from-emerald-500/6 to-transparent" },
];

const STATUS_GLOW: Record<string, { ring: string; dot: string; label: string; anim?: string }> = {
  working:   { ring: "ring-green-500/60",  dot: "bg-green-400",   label: "Working",   anim: "animate-pulse" },
  reviewing: { ring: "ring-amber-500/60",  dot: "bg-amber-400",   label: "Reviewing" },
  blocked:   { ring: "ring-red-500/60",    dot: "bg-red-400",     label: "Blocked" },
  idle:      { ring: "ring-white/10",      dot: "bg-white/20",    label: "Idle" },
};

/* ═══ EVENT CONFIG ═══ */
const EVT: Record<string, { dot: string; label: string }> = {
  "task.assigned":      { dot: "bg-blue-400",   label: "Task Assigned" },
  "run.started":        { dot: "bg-amber-400",  label: "Run Started" },
  "run.completed":      { dot: "bg-green-400",  label: "Run Completed" },
  "run.failed":         { dot: "bg-red-400",    label: "Run Failed" },
  "artifact.submitted": { dot: "bg-cyan-400",   label: "Artifact Submitted" },
  "review.approved":    { dot: "bg-green-400",  label: "Review Approved" },
  "review.rejected":    { dot: "bg-red-400",    label: "Review Rejected" },
  "deploy.live":        { dot: "bg-green-400",  label: "Deploy Live" },
  task_assigned:        { dot: "bg-blue-400",   label: "Task Assigned" },
  run_started:          { dot: "bg-amber-400",  label: "Run Started" },
  run_completed:        { dot: "bg-green-400",  label: "Run Completed" },
  run_failed:           { dot: "bg-red-400",    label: "Run Failed" },
  artifact_submitted:   { dot: "bg-cyan-400",   label: "Artifact Submitted" },
  review_approved:      { dot: "bg-green-400",  label: "Review Approved" },
  review_rejected:      { dot: "bg-red-400",    label: "Review Rejected" },
  deployment_started:   { dot: "bg-indigo-400", label: "Deploy Started" },
  deployment_completed: { dot: "bg-green-400",  label: "Deploy Completed" },
  approval_created:     { dot: "bg-amber-400",  label: "Approval Created" },
  task_escalated:       { dot: "bg-pink-400",   label: "Task Escalated" },
  handoff_created:      { dot: "bg-blue-300",   label: "Handoff Created" },
  pr_created:           { dot: "bg-violet-400", label: "PR Created" },
};

const DEFAULT_EVT = { dot: "bg-white/30", label: "Event" };

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

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

  const teamEmployeesEnriched = useMemo(() => {
    if (!data) return {};
    const map: Record<string, any[]> = {};
    const employees = data.employees ?? [];

    for (const emp of employees) {
      if (["terminated", "inactive"].includes(emp.status)) continue;
      const teamId = emp.team_id ?? "__none";
      if (!map[teamId]) map[teamId] = [];

      const role = emp.role_id ? data.rolesById?.[emp.role_id] : null;
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
        id: emp.id,
        roleId: emp.role_id,
        name: emp.name,
        code: emp.role_code,
        status,
        empStatus: emp.status,
        successRate: emp.success_rate ?? role?.success_rate ?? 0,
        reputationScore: emp.reputation_score ?? 0,
        bugRate: emp.bug_rate ?? 0,
        taskTitle: activeTask?.title ?? null,
        taskState: activeTask?.state ?? null,
        taskCount: tasks.filter((t: any) => !["done", "cancelled"].includes(t.state)).length,
        mbtiCode: sp?.mbtiCode ?? null,
        nationalityCode: sp?.nationalityCode ?? null,
        seniority: sp?.seniority ?? null,
        primaryStack: sp?.primaryStack ?? [],
        riskTolerance: sp?.riskTolerance ?? null,
      });
    }
    return map;
  }, [data, roleProfileById]);

  /* ── Event feed ── */
  const mergedEvents = useMemo(() => {
    if (!data) return [];
    const officeEvts = (data.officeEvents ?? []).map((e: any) => ({
      id: e.id,
      type: e.event_type,
      time: e.timestamp,
      meta: e.from_zone && e.to_zone ? `${e.from_zone} → ${e.to_zone}` : undefined,
    }));
    const actEvts = (data.recentEvents ?? []).slice(0, 50).map((e: any) => ({
      id: e.id,
      type: e.event_type,
      time: e.created_at,
      meta: `${e.entity_type} · ${e.actor_type}`,
    }));
    return [...officeEvts, ...actEvts]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 60);
  }, [data]);

  if (isLoading) {
    return (
      <AppLayout title="Production Floor">
        <div className="flex items-center justify-center min-h-[60vh] text-[14px] text-white/40">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading studio…
        </div>
      </AppLayout>
    );
  }
  if (error || !data) {
    return (
      <AppLayout title="Production Floor">
        <div className="flex items-center gap-2 p-8 text-[14px] text-red-400">Error loading data.</div>
      </AppLayout>
    );
  }

  const teamData = data.teams ?? [];
  const totalEmployees = Object.values(teamEmployeesEnriched).flat().length;
  const hasNoSetup = teamData.length === 0 && totalEmployees === 0;

  return (
    <AppLayout title="Production Floor">
      {/* ═══ DARK STUDIO CANVAS ═══ */}
      <div className="relative min-h-[calc(100vh-64px)] -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8"
        style={{ background: "linear-gradient(180deg, #0E1116 0%, #141920 50%, #0E1116 100%)" }}>

        {/* Vignette overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)",
          }}
        />

        {/* Subtle industrial texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 px-6 py-5">

          {/* ═══ STUDIO TOP BAR ═══════════════════════════════════ */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.4)]" />
                <span className="text-[13px] font-bold text-white/90 uppercase tracking-[0.2em]">Production</span>
              </div>
              <div className="h-5 w-px bg-white/10" />
              <StudioStat icon={FolderKanban} value={stats.projects} label="Projects" />
              <StudioStat icon={Zap} value={stats.runs} label="Runs" active={stats.runs > 0} />
              <StudioStat icon={Stamp} value={stats.approvals} label="Approvals" active={stats.approvals > 0} warn />
              {stats.blocked > 0 && (
                <StudioStat icon={AlertTriangle} value={stats.blocked} label="Blocked" active danger />
              )}
            </div>
          </div>

          {/* ═══ FIRST TIME EMPTY STATE ═══════════════════════════ */}
          {hasNoSetup && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-[520px]">
                <div className="h-24 w-24 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-8">
                  <Users className="h-12 w-12 text-white/10" />
                </div>
                <h1 className="text-[32px] font-bold text-white/90 tracking-tight">This studio has no team yet.</h1>
                <p className="text-[16px] text-white/30 mt-3 leading-relaxed">
                  Create capabilities and add AI team members to activate the production floor.
                </p>
                <div className="flex items-center justify-center gap-3 mt-8">
                  <Link to="/teams">
                    <Button className="h-12 px-7 gap-2 text-[14px] font-bold rounded-xl bg-white text-[#0E1116] hover:bg-white/90">
                      <Zap className="h-4 w-4" /> Build Your AI Team
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STUDIO MAIN LAYOUT ══════════════════════════════ */}
          {!hasNoSetup && (
            <div className="flex gap-5">
              {/* ── Rooms Grid ── */}
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 auto-rows-min">
                  {teamData.map((team: any, idx: number) => {
                    const employees = teamEmployeesEnriched[team.id] ?? [];
                    const pos = ROOM_POSITIONS[idx % ROOM_POSITIONS.length];
                    const activeCount = employees.filter((e: any) => e.status !== "idle").length;
                    const successRate = employees.length > 0
                      ? Math.round(employees.reduce((s: number, e: any) => s + (e.successRate ?? 0), 0) / employees.length * 100)
                      : 0;

                    return (
                      <div key={team.id} className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02]">
                        {/* Room glow */}
                        {activeCount > 0 && (
                          <div className={`absolute inset-0 bg-gradient-radial ${pos.glow} pointer-events-none`} />
                        )}

                        <div className="relative p-5">
                          {/* Room header */}
                          <div className="flex items-start justify-between mb-5">
                            <div>
                              <h3 className="text-[20px] font-bold text-white/90 tracking-tight">{team.name}</h3>
                              <p className="text-[12px] text-white/25 mt-0.5">{team.focus_domain || "Production Capability"}</p>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-white/30">
                              <span><strong className="text-white/60 font-mono">{employees.length}</strong> members</span>
                              <span><strong className="text-white/60 font-mono">{successRate}%</strong> success</span>
                            </div>
                          </div>

                          {/* Employees */}
                          {employees.length === 0 ? (
                            <div className="flex flex-col items-center py-8 text-center">
                              <Users className="h-8 w-8 text-white/[0.06] mb-3" />
                              <p className="text-[14px] font-semibold text-white/20">No team members</p>
                              <AddEmployeeDialog teamId={team.id} teamName={team.name}
                                trigger={
                                  <Button variant="ghost" className="mt-3 h-9 px-4 gap-2 text-[12px] font-bold text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg">
                                    <UserPlus className="h-3.5 w-3.5" /> Add Member
                                  </Button>
                                }
                              />
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-5">
                              {employees.map((emp: any) => (
                                <StudioEmployee key={emp.id ?? emp.roleId} emp={emp} onClick={() => navigate(`/employees/${emp.id}`)} />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Room bottom light line */}
                        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                      </div>
                    );
                  })}
                </div>

                {teamData.length === 0 && totalEmployees > 0 && (
                  <div className="text-center py-16">
                    <p className="text-[18px] font-bold text-white/60">Create capabilities to organize your team</p>
                    <p className="text-[14px] text-white/25 mt-2">
                      You have {totalEmployees} team member{totalEmployees > 1 ? "s" : ""}.
                    </p>
                    <Link to="/teams">
                      <Button className="mt-5 h-11 px-6 gap-2 text-[14px] font-bold rounded-xl bg-white text-[#0E1116] hover:bg-white/90">
                        <Users className="h-4 w-4" /> Go to Teams Setup
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              {/* ── Live Flow Side Panel ── */}
              <div className="hidden xl:block w-[280px] shrink-0">
                <div className="sticky top-20 rounded-2xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-sm p-4 max-h-[calc(100vh-120px)]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[14px] font-bold text-white/70 tracking-tight">Live Flow</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.3)]" />
                      <span className="text-[10px] font-bold text-green-400/70">LIVE</span>
                    </div>
                  </div>

                  {mergedEvents.length === 0 ? (
                    <div className="flex items-center gap-2 py-6 text-[12px] text-white/20 justify-center">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Waiting for events…
                    </div>
                  ) : (
                    <ScrollArea className="h-[calc(100vh-220px)]">
                      <div className="space-y-0 pr-2">
                        {mergedEvents.map((evt, i) => {
                          const cfg = EVT[evt.type] ?? DEFAULT_EVT;
                          return (
                            <div key={evt.id}
                              className="flex items-start gap-2.5 py-2 animate-fade-in"
                              style={{ animationDelay: `${Math.min(i * 15, 150)}ms` }}
                            >
                              {/* Color strip + dot */}
                              <div className="flex flex-col items-center w-2 shrink-0 pt-1">
                                <div className={`h-2 w-2 rounded-full ${cfg.dot} shadow-[0_0_4px_currentColor]`} />
                                {i < mergedEvents.length - 1 && <div className="flex-1 w-px bg-white/[0.04] min-h-[12px]" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-semibold text-white/50 truncate">{cfg.label}</p>
                                {evt.meta && (
                                  <p className="text-[10px] text-white/20 truncate mt-0.5">{evt.meta}</p>
                                )}
                                <p className="text-[9px] font-mono text-white/15 mt-0.5">
                                  {formatDistanceToNow(new Date(evt.time), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STUDIO SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function StudioStat({ icon: Icon, value, label, active, warn, danger }: {
  icon: React.ElementType; value: number; label: string; active?: boolean; warn?: boolean; danger?: boolean;
}) {
  const color = danger ? "text-red-400" : warn && active ? "text-amber-400" : active ? "text-blue-400" : "text-white/30";
  return (
    <div className={`flex items-center gap-1.5 ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="font-bold font-mono text-white/80 tabular-nums text-[13px]">{value}</span>
      <span className="text-[11px] font-medium">{label}</span>
    </div>
  );
}

/* ═══ CINEMATIC EMPLOYEE AVATAR ═══ */
function StudioEmployee({ emp, onClick }: { emp: any; onClick: () => void }) {
  const persona = getPersona(emp.code);
  const sg = STATUS_GLOW[emp.status] ?? STATUS_GLOW.idle;
  const repScore = Math.round((emp.reputationScore ?? 0) * 100);
  const successPct = Math.round((emp.successRate ?? 0) * 100);
  const roleName = ROLE_OPTIONS.find(r => r.code === emp.code)?.label ?? emp.code;
  const mbti = emp.mbtiCode ? getMBTI(emp.mbtiCode) : null;
  const nation = emp.nationalityCode ? getNationality(emp.nationalityCode) : null;
  const perfColor = repScore >= 80 ? "ring-green-500/50" : repScore >= 50 ? "ring-amber-500/50" : "ring-red-500/50";

  const STATE_LABEL: Record<string, string> = {
    in_progress: "In Progress",
    waiting_review: "In Review",
    blocked: "Blocked",
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div onClick={onClick}
            className="group flex flex-col items-center text-center w-[110px] cursor-pointer transition-all duration-200 hover:-translate-y-1"
          >
            {/* Avatar with performance ring */}
            <div className="relative mb-2">
              <div className={cn(
                "rounded-2xl p-[3px] ring-2 ring-offset-2 ring-offset-[#0E1116] transition-all duration-200",
                perfColor,
                emp.status !== "idle" && sg.ring,
              )}>
                <img src={persona.avatar} alt={emp.name}
                  className="h-[72px] w-[72px] rounded-xl object-cover"
                  width={72} height={72} loading="lazy" />
              </div>
              {/* Status dot */}
              <span className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0E1116]",
                sg.dot, sg.anim,
                emp.status !== "idle" && "shadow-[0_0_6px_currentColor]",
              )} />
            </div>

            {/* Name */}
            <p className="text-[12px] font-bold text-white/80 leading-tight truncate max-w-full group-hover:text-white transition-colors">{emp.name}</p>
            <p className="text-[10px] text-white/25 truncate max-w-full mt-0.5">{roleName}</p>

            {/* Status label */}
            <span className={cn(
              "text-[9px] font-bold px-2 py-0.5 rounded-full mt-1.5 transition-colors",
              emp.status === "working" && "bg-green-500/15 text-green-400",
              emp.status === "reviewing" && "bg-amber-500/15 text-amber-400",
              emp.status === "blocked" && "bg-red-500/15 text-red-400",
              emp.status === "idle" && "bg-white/5 text-white/20",
            )}>
              {sg.label}
            </span>

            {/* Floating task card */}
            {emp.taskTitle && (
              <div className="mt-2 w-full px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-left">
                <p className="text-[9px] text-white/40 line-clamp-1">{emp.taskTitle}</p>
                {emp.taskState && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className={cn("h-1.5 w-1.5 rounded-full",
                      emp.taskState === "in_progress" && "bg-amber-400",
                      emp.taskState === "waiting_review" && "bg-violet-400",
                      emp.taskState === "blocked" && "bg-red-400",
                    )} />
                    <span className="text-[8px] text-white/25 font-medium">{STATE_LABEL[emp.taskState] ?? emp.taskState}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </TooltipTrigger>

        {/* ═══ HOVER PROFILE CARD ═══ */}
        <TooltipContent side="right" sideOffset={12}
          className="max-w-[300px] p-4 space-y-2.5 bg-[#1a1f28] border-white/10 text-white shadow-2xl shadow-black/40"
        >
          <div className="flex items-center gap-3">
            <img src={persona.avatar} alt={emp.name} className="h-10 w-10 rounded-xl object-cover" width={40} height={40} />
            <div>
              <p className="text-[14px] font-bold text-white">{emp.name}</p>
              <p className="text-[11px] text-white/40">{roleName}{emp.seniority ? ` · ${emp.seniority}` : ""}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-white/[0.06]">
            <HoverStat label="Success" value={`${successPct}%`} />
            <HoverStat label="Score" value={`${repScore}`} />
            <HoverStat label="Bug rate" value={`${Math.round((emp.bugRate ?? 0) * 100)}%`} />
            {emp.riskTolerance && <HoverStat label="Risk" value={emp.riskTolerance} />}
          </div>

          {mbti && (
            <div className="pt-2 border-t border-white/[0.06]">
              <p className="text-[11px] font-bold text-white/70">{mbti.code} — {mbti.label}</p>
              <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">{mbti.shortDesc}</p>
            </div>
          )}

          {nation && (
            <div className="flex items-center gap-2">
              <span className="text-[14px]">{nation.flag}</span>
              <p className="text-[11px] text-white/40">{nation.label}</p>
            </div>
          )}

          {emp.primaryStack?.length > 0 && (
            <div className="pt-2 border-t border-white/[0.06]">
              <p className="text-[10px] text-white/30">Stack: <strong className="text-white/60">{emp.primaryStack.join(", ")}</strong></p>
            </div>
          )}

          {emp.taskTitle && (
            <div className="pt-2 border-t border-white/[0.06]">
              <p className="text-[10px] text-white/30">Current: <strong className="text-white/60">{emp.taskTitle}</strong></p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function HoverStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-[11px]">
      <span className="text-white/30">{label}: </span>
      <strong className="text-white/70">{value}</strong>
    </div>
  );
}
