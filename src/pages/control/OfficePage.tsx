import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useOfficeData, useOfficeRealtime, useRefreshOffice } from "@/hooks/use-office-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { AddEmployeeDialog } from "@/components/teams/AddEmployeeDialog";
import { getPersona } from "@/lib/personas";
import { getMBTI } from "@/lib/mbtiData";
import { getNationality } from "@/lib/nationalityData";
import { ROLE_OPTIONS } from "@/lib/employeeConfig";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Users, Zap, Stamp, FolderKanban,
  AlertTriangle, UserPlus, Loader2,
  MessageSquare, Plus, Radio, Activity,
  TrendingUp, Shield, ChevronRight,
  RefreshCw, Clock,
} from "lucide-react";

/* ═══ ROOM ACCENTS — minimal left-border color only ═══ */
const ROOM_ACCENTS = [
  "border-l-status-green",
  "border-l-status-amber",
  "border-l-lifecycle-review",
  "border-l-status-neutral",
  "border-l-status-red",
  "border-l-status-cyan",
];

const STATUS_STYLE: Record<string, { dot: string; label: string; chipCls: string }> = {
  working:   { dot: "bg-status-green",        label: "Working",   chipCls: "bg-status-green/10 text-status-green" },
  reviewing: { dot: "bg-lifecycle-review",    label: "Reviewing", chipCls: "bg-lifecycle-review/10 text-lifecycle-review" },
  blocked:   { dot: "bg-destructive",         label: "Blocked",   chipCls: "bg-destructive/10 text-destructive" },
  idle:      { dot: "bg-muted-foreground/20", label: "Idle",      chipCls: "bg-muted/60 text-muted-foreground" },
};

/* ═══ EVENT CONFIG ═══ */
const EVT: Record<string, { dot: string; label: string; actor?: string }> = {
  "task.assigned":      { dot: "bg-status-neutral",  label: "Task Assigned",       actor: "Architect" },
  "run.started":        { dot: "bg-status-amber",    label: "Run Started",         actor: "Worker" },
  "run.completed":      { dot: "bg-status-green",    label: "Run Completed",       actor: "Worker" },
  "run.failed":         { dot: "bg-status-red",      label: "Run Failed",          actor: "Worker" },
  "artifact.submitted": { dot: "bg-status-cyan",     label: "Artifact Submitted",  actor: "Builder" },
  "review.approved":    { dot: "bg-status-green",    label: "Review Approved",     actor: "Reviewer" },
  "review.rejected":    { dot: "bg-status-red",      label: "Review Rejected",     actor: "Reviewer" },
  task_assigned:        { dot: "bg-status-neutral",  label: "Task Assigned",       actor: "Architect" },
  run_started:          { dot: "bg-status-amber",    label: "Run Started",         actor: "Worker" },
  run_completed:        { dot: "bg-status-green",    label: "Run Completed",       actor: "Worker" },
  run_failed:           { dot: "bg-status-red",      label: "Run Failed",          actor: "Worker" },
  artifact_submitted:   { dot: "bg-status-cyan",     label: "Artifact Submitted",  actor: "Builder" },
  review_approved:      { dot: "bg-status-green",    label: "Review Approved",     actor: "Reviewer" },
  review_rejected:      { dot: "bg-status-red",      label: "Review Rejected",     actor: "Reviewer" },
  deployment_started:   { dot: "bg-lifecycle-review", label: "Deploy Started",     actor: "Release" },
  deployment_completed: { dot: "bg-status-green",    label: "Deploy Completed",    actor: "Release" },
  approval_created:     { dot: "bg-status-amber",    label: "Approval Created",    actor: "System" },
  task_escalated:       { dot: "bg-destructive",     label: "Task Escalated",      actor: "QA" },
  handoff_created:      { dot: "bg-status-neutral",  label: "Handoff Created",     actor: "System" },
  pr_created:           { dot: "bg-lifecycle-review", label: "PR Created",         actor: "Builder" },
};
const DEFAULT_EVT = { dot: "bg-muted-foreground/30", label: "Event", actor: "System" };

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function OfficePage() {
  const { data, isLoading, error, dataUpdatedAt, isFetching } = useOfficeData();
  useOfficeRealtime();
  const refreshOffice = useRefreshOffice();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);

  // Track data freshness
  const freshnessLabel = useMemo(() => {
    if (!dataUpdatedAt) return null;
    const age = Date.now() - dataUpdatedAt;
    if (age < 5_000) return "just now";
    if (age < 60_000) return `${Math.round(age / 1000)}s ago`;
    if (age < 300_000) return `${Math.round(age / 60_000)}m ago`;
    return "stale";
  }, [dataUpdatedAt, isFetching]); // isFetching dep forces re-eval on refetch

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
    if (!data) return { projects: 0, tasks: 0, runs: 0, approvals: 0, blocked: 0, employees: 0 };
    const all = data.allTasks;
    return {
      projects: data.projects.length,
      tasks: all.filter((t: any) => !["done", "cancelled"].includes(t.state)).length,
      runs: all.filter((t: any) => t.latest_run_state === "running" || t.latest_run_state === "preparing").length,
      approvals: data.pendingInboxCount,
      blocked: all.filter((t: any) => t.state === "blocked").length,
      employees: (data.employees ?? []).filter((e: any) => !["terminated", "inactive"].includes(e.status)).length,
    };
  }, [data]);

  /* ── Build enriched employees per team ── */
  const { teamEmployees, unassignedEmployees } = useMemo(() => {
    if (!data) return { teamEmployees: {} as Record<string, any[]>, unassignedEmployees: [] as any[] };
    const map: Record<string, any[]> = {};
    const unassigned: any[] = [];

    for (const emp of data.employees ?? []) {
      if (["terminated", "inactive"].includes(emp.status)) continue;
      const role = emp.role_id ? data.rolesById?.[emp.role_id] : null;
      const rp = emp.role_id ? roleProfileById[emp.role_id] : null;
      const sp = (rp?.skill_profile ?? null) as any;
      const tasks = data.allTasks.filter((t: any) => t.owner_role_id === emp.role_id);
      const activeTask = tasks.find((t: any) => ["in_progress", "waiting_review", "blocked"].includes(t.state));
      let status: "working" | "reviewing" | "blocked" | "idle" = "idle";
      if (activeTask) {
        if (activeTask.state === "in_progress") status = "working";
        else if (activeTask.state === "waiting_review") status = "reviewing";
        else if (activeTask.state === "blocked") status = "blocked";
      }
      const enriched = {
        id: emp.id, roleId: emp.role_id, name: emp.name, code: emp.role_code,
        status, empStatus: emp.status,
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
      };

      if (emp.team_id) {
        if (!map[emp.team_id]) map[emp.team_id] = [];
        map[emp.team_id].push(enriched);
      } else {
        unassigned.push(enriched);
      }
    }
    return { teamEmployees: map, unassignedEmployees: unassigned };
  }, [data, roleProfileById]);

  /* ── Event feed ── */
  const mergedEvents = useMemo(() => {
    if (!data) return [];
    const o = (data.officeEvents ?? []).map((e: any) => ({
      id: e.id, type: e.event_type, time: e.timestamp,
      meta: e.from_zone && e.to_zone ? `${e.from_zone} → ${e.to_zone}` : undefined,
    }));
    const a = (data.recentEvents ?? []).slice(0, 50).map((e: any) => ({
      id: e.id, type: e.event_type, time: e.created_at,
      meta: `${e.entity_type} · ${e.actor_type}`,
    }));
    return [...o, ...a].sort((x, y) => new Date(y.time).getTime() - new Date(x.time).getTime()).slice(0, 60);
  }, [data]);

  const teamData = data?.teams ?? [];
  const allEmployeeCount = Object.values(teamEmployees).flat().length + unassignedEmployees.length;

  useEffect(() => {
    console.log("[Office] Office re-render triggered", {
      rooms: teamData.length,
      employees: allEmployeeCount,
      unassigned: unassignedEmployees.length,
    });
    console.log("[Office] Capability rooms updated", teamData.map((team: any) => ({ id: team.id, name: team.name, members: (teamEmployees[team.id] ?? []).length })));
  }, [allEmployeeCount, teamData, teamEmployees, unassignedEmployees.length]);

  if (isLoading) {
    return (
      <AppLayout title="Production Floor">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
          <span className="text-[13px] text-muted-foreground">Loading production floor…</span>
        </div>
      </AppLayout>
    );
  }
  if (error || !data) {
    return (
      <AppLayout title="Production Floor">
        <div className="p-8 text-[14px] text-destructive">Error loading data.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Production Floor">
      <ScrollArea className="h-full">
        <div className="max-w-[1400px] mx-auto px-6 py-5 space-y-5 pb-10">

          {/* ═══ PAGE HEADER ═══ */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-[28px] font-bold text-foreground tracking-tight">Production Floor</h1>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-status-green/10 border border-status-green/20">
                  <span className="h-2 w-2 rounded-full bg-status-green animate-pulse" />
                  <span className="text-[11px] font-bold text-status-green uppercase tracking-wider">Live</span>
                </div>
              </div>
              <p className="text-[13px] text-muted-foreground/60 mt-1">
                Capability rooms and live team activity. For per-project task movement, open a <Link to="/projects" className="underline underline-offset-2 hover:text-foreground transition-colors font-medium">project delivery board</Link>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Data freshness indicator */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={refreshOffice}
                      disabled={isFetching}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/40 bg-card hover:bg-surface-glass transition-colors text-muted-foreground/60 hover:text-foreground disabled:opacity-50"
                    >
                      <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
                      <Clock className="h-3 w-3" />
                      <span className="text-[10px] font-medium">{freshnessLabel ?? "…"}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[11px] max-w-[240px]">
                    <p className="font-medium">Data freshness</p>
                    <p className="text-muted-foreground mt-0.5">
                      Office subscribes to task, run, review, approval, and deployment changes.
                      Click to manually refresh if data looks stale.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Link to="/presale/new">
                <Button className="h-10 px-5 gap-2 text-[13px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90 shadow-sm">
                  <Plus className="h-3.5 w-3.5" /> Start New Project
                </Button>
              </Link>
            </div>
          </div>

          {/* ═══ STATS STRIP ═══ */}
          <div className="rounded-2xl bg-card border border-border/40 shadow-sm px-6 py-3.5">
            <div className="flex items-center gap-6 flex-wrap">
              <StatChip icon={Users} value={stats.employees} label="Employees" />
              <span className="h-5 w-px bg-border/30" />
              <StatChip icon={FolderKanban} value={stats.projects} label="Projects" />
              <StatChip icon={Zap} value={stats.runs} label="Active Runs" highlight={stats.runs > 0} />
              <StatChip icon={Stamp} value={stats.approvals} label="Pending" highlight={stats.approvals > 0} warn />
              {stats.blocked > 0 && (
                <StatChip icon={AlertTriangle} value={stats.blocked} label="Blocked" highlight danger />
              )}
              <div className="flex-1" />
              <button
                onClick={() => setChatOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors text-[12px] font-semibold text-muted-foreground hover:text-foreground"
              >
                <Activity className="h-3.5 w-3.5" />
                Event Feed
                {mergedEvents.length > 0 && (
                  <span className="h-4 min-w-[16px] px-1 rounded-full bg-status-green/15 text-status-green text-[9px] font-bold flex items-center justify-center">
                    {Math.min(mergedEvents.length, 99)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ═══ CAPABILITY ROOMS ═══ */}
          {teamData.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
              <div className="relative px-10 py-16 text-center">
                <div className="absolute inset-0 bg-gradient-to-b from-muted/20 to-transparent pointer-events-none" />
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-muted/30 border border-border/30 flex items-center justify-center mx-auto mb-5">
                    <Users className="h-7 w-7 text-muted-foreground/20" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-[22px] font-bold text-foreground tracking-tight">Create your first capability</h2>
                  <p className="text-[14px] text-muted-foreground mt-2 max-w-[420px] mx-auto leading-relaxed">
                    Once a capability exists, its room renders here immediately — even before members are assigned.
                  </p>
                  <Link to="/teams">
                    <Button className="mt-6 h-11 px-6 gap-2 text-[14px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90">
                      <Users className="h-4 w-4" /> Go to Teams
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {teamData.map((team: any, idx: number) => {
                const employees = teamEmployees[team.id] ?? [];
                const accentCls = ROOM_ACCENTS[idx % ROOM_ACCENTS.length];
                const activeCount = employees.filter((e: any) => e.status !== "idle").length;
                const blockedCount = employees.filter((e: any) => e.status === "blocked").length;

                // Find active projects this room is working on
                const roomRoleIds = new Set(employees.map((e: any) => e.roleId).filter(Boolean));
                const roomProjectIds = new Set(
                  (data.allTasks as any[])
                    .filter((t: any) => roomRoleIds.has(t.owner_role_id) && !["done", "cancelled"].includes(t.state))
                    .map((t: any) => t.project_id)
                );
                const roomProjects = (data.projects as any[]).filter((p: any) => roomProjectIds.has(p.id)).slice(0, 3);

                return (
                  <div key={team.id}
                    className={cn(
                      "rounded-xl border border-border bg-card overflow-hidden transition-all",
                      "border-l-[3px]",
                      accentCls,
                    )}
                  >
                    {/* Room header */}
                    <div className="px-5 py-4 border-b border-border/40">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn("h-2 w-2 rounded-full shrink-0", activeCount > 0 ? "bg-status-green" : "bg-muted-foreground/15", activeCount > 0 && "animate-pulse")} />
                          <div className="min-w-0">
                            <h3 className="text-[16px] font-bold text-foreground tracking-tight leading-tight truncate">{team.name}</h3>
                            <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">{team.focus_domain || "Production Capability"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-[12px] font-mono text-muted-foreground">
                            <strong className="text-foreground">{employees.length}</strong> members
                          </span>
                          {activeCount > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-status-green/10 text-status-green">
                              {activeCount} active
                            </span>
                          )}
                          {blockedCount > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-destructive/10 text-destructive">
                              {blockedCount} blocked
                            </span>
                          )}
                        </div>
                      </div>

                      <RoomPipelineStrip employees={employees} tasks={data.allTasks} />
                    </div>

                    {/* Room body */}
                    <div className="px-5 py-4">
                      {employees.length === 0 ? (
                        <div className="flex flex-col items-center py-8 text-center">
                          <div className="h-10 w-10 rounded-xl bg-muted/30 flex items-center justify-center mb-3">
                            <Users className="h-5 w-5 text-muted-foreground/15" />
                          </div>
                          <p className="text-[14px] font-semibold text-muted-foreground/40">Waiting for team members</p>
                          <p className="text-[12px] text-muted-foreground/30 mt-1">Add specialists to activate this room</p>
                          <AddEmployeeDialog teamId={team.id} teamName={team.name}
                            trigger={
                              <Button variant="outline" className="mt-4 h-9 px-4 gap-2 text-[12px] font-semibold rounded-xl border-border/50">
                                <UserPlus className="h-3.5 w-3.5" /> Add Member
                              </Button>
                            }
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                          {employees.map((emp: any) => (
                            <FloorEmployee key={emp.id ?? emp.roleId} emp={emp} onClick={() => navigate(`/employees/${emp.id}`)} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ UNASSIGNED EMPLOYEES ═══ */}
          {unassignedEmployees.length > 0 && (
            <div className="rounded-2xl border border-dashed border-border/50 bg-muted/10 overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between border-b border-border/20">
                <div>
                  <h3 className="text-[15px] font-bold text-foreground">Unassigned Members</h3>
                  <p className="text-[12px] text-muted-foreground/50 mt-0.5">
                    Not assigned to any capability — manage in Teams
                  </p>
                </div>
                <Link to="/teams">
                  <Button variant="outline" size="sm" className="h-8 text-[12px] font-semibold rounded-lg gap-1.5 border-border/50">
                    <Users className="h-3.5 w-3.5" /> Manage
                  </Button>
                </Link>
              </div>
              <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {unassignedEmployees.map((emp: any) => (
                  <FloorEmployee key={emp.id ?? emp.roleId} emp={emp} onClick={() => navigate(`/employees/${emp.id}`)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ═══ STUDIO CHAT — floating button + slide-out sheet ═══ */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetTrigger asChild>
          <button
            className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-2xl bg-foreground text-background shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center"
            title="Open Event Feed"
          >
            <Radio className="h-5 w-5" />
            {mergedEvents.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-status-green text-[9px] font-bold text-white flex items-center justify-center shadow-sm">
                {Math.min(mergedEvents.length, 99)}
              </span>
            )}
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[380px] sm:w-[420px] p-0">
          <StudioChatPanel events={mergedEvents} />
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function StatChip({ icon: Icon, value, label, highlight, warn, danger }: {
  icon: React.ElementType; value: number; label: string; highlight?: boolean; warn?: boolean; danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn("h-3.5 w-3.5", danger ? "text-destructive" : warn && highlight ? "text-status-amber" : "text-muted-foreground/40")} />
      <span className={cn("font-bold font-mono tabular-nums text-[14px]", danger ? "text-destructive" : highlight ? "text-foreground" : "text-foreground")}>{value}</span>
      <span className="text-[11px] text-muted-foreground/50 font-medium">{label}</span>
    </div>
  );
}

/* ═══ ROOM PIPELINE STRIP ═══ */
function RoomPipelineStrip({ employees, tasks }: { employees: any[]; tasks: any[] }) {
  const roleIds = useMemo(() => new Set(employees.map((e: any) => e.roleId)), [employees]);
  const roomTasks = useMemo(() => tasks.filter((t: any) => roleIds.has(t.owner_role_id) && !["done", "cancelled"].includes(t.state)), [tasks, roleIds]);

  if (roomTasks.length === 0) return null;

  const counts = {
    intake: roomTasks.filter((t: any) => ["draft", "ready"].includes(t.state)).length,
    delivery: roomTasks.filter((t: any) => ["assigned", "in_progress"].includes(t.state)).length,
    review: roomTasks.filter((t: any) => t.state === "waiting_review").length,
    blocked: roomTasks.filter((t: any) => t.state === "blocked").length,
  };

  return (
    <div className="flex items-center gap-2 mt-2.5">
      {counts.intake > 0 && <PipeChip label="Intake" count={counts.intake} cls="text-status-blue bg-status-blue/8" />}
      {counts.delivery > 0 && <PipeChip label="Delivery" count={counts.delivery} cls="text-status-amber bg-status-amber/8" />}
      {counts.review > 0 && <PipeChip label="Review" count={counts.review} cls="text-lifecycle-review bg-lifecycle-review/8" />}
      {counts.blocked > 0 && <PipeChip label="Blocked" count={counts.blocked} cls="text-destructive bg-destructive/8" />}
    </div>
  );
}

function PipeChip({ label, count, cls }: { label: string; count: number; cls: string }) {
  return (
    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md", cls)}>
      {label} · {count}
    </span>
  );
}

/* ═══ FLOOR EMPLOYEE NODE ═══ */
function FloorEmployee({ emp, onClick }: { emp: any; onClick: () => void }) {
  const persona = getPersona(emp.code);
  const st = STATUS_STYLE[emp.status] ?? STATUS_STYLE.idle;
  const repScore = Math.round((emp.reputationScore ?? 0) * 100);
  const successPct = Math.round((emp.successRate ?? 0) * 100);
  const roleName = ROLE_OPTIONS.find(r => r.code === emp.code)?.label ?? emp.code;
  const mbti = emp.mbtiCode ? getMBTI(emp.mbtiCode) : null;
  const nation = emp.nationalityCode ? getNationality(emp.nationalityCode) : null;
  const perfColor = repScore >= 80 ? "text-status-green" : repScore >= 50 ? "text-status-amber" : "text-destructive";

  const STATE_LABEL: Record<string, string> = {
    in_progress: "In Progress", waiting_review: "In Review", blocked: "Blocked",
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div onClick={onClick}
            className={cn(
              "group rounded-lg bg-card border border-border/40 p-3 cursor-pointer transition-all duration-150 hover:border-border hover:bg-surface-raised",
            )}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="relative shrink-0">
                <img src={persona.avatar} alt={emp.name}
                  className="h-11 w-11 rounded-lg object-cover ring-1 ring-border/40 ring-offset-1 ring-offset-card"
                  width={44} height={44} loading="lazy" />
                <span className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                  st.dot, emp.status === "working" && "animate-pulse",
                )} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-foreground leading-tight truncate group-hover:text-primary transition-colors">{emp.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="text-[10px] text-muted-foreground/50 truncate">{roleName}</p>
                  <span className="text-[10px] text-muted-foreground/20">·</span>
                  <p className="text-[9px] text-muted-foreground/35 italic truncate">{persona.nickname}</p>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md", st.chipCls)}>
                    {st.label}
                  </span>
                  <span className={cn("text-[10px] font-bold font-mono", perfColor)}>{repScore}</span>
                </div>
                {persona.chips.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5">
                    {persona.chips.slice(0, 2).map((chip) => (
                      <span key={chip} className="text-[8px] font-semibold px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground/50">{chip}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Active task — shows role-based ownership */}
            {emp.taskTitle && (
              <div className="mt-2 px-2 py-1.5 rounded-lg bg-muted/30 border border-border/20">
                <p className="text-[10px] text-muted-foreground line-clamp-1 leading-relaxed">{emp.taskTitle}</p>
                {emp.taskState && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className={cn("h-1.5 w-1.5 rounded-full",
                      emp.taskState === "in_progress" && "bg-status-amber",
                      emp.taskState === "waiting_review" && "bg-lifecycle-review",
                      emp.taskState === "blocked" && "bg-destructive",
                    )} />
                    <span className="text-[9px] text-muted-foreground/50 font-medium">{STATE_LABEL[emp.taskState] ?? emp.taskState}</span>
                    <span className="text-[9px] text-muted-foreground/25 ml-auto">via role</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </TooltipTrigger>

        {/* ═══ HOVER TOOLTIP ═══ */}
        <TooltipContent side="right" sideOffset={12} className="max-w-[300px] p-4 space-y-2.5 shadow-xl rounded-xl">
          <div className="flex items-center gap-3">
            <img src={persona.avatar} alt={emp.name} className="h-10 w-10 rounded-lg object-cover" width={40} height={40} />
            <div>
              <p className="text-[14px] font-bold text-foreground">{emp.name}</p>
              <p className="text-[11px] text-muted-foreground">{roleName}{emp.seniority ? ` · ${emp.seniority}` : ""}</p>
              <p className="text-[10px] text-muted-foreground/40 italic mt-0.5">{persona.workStyle}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-border/30">
            <HStat label="Success" value={`${successPct}%`} />
            <HStat label="Score" value={`${repScore}`} />
            <HStat label="Bug rate" value={`${Math.round((emp.bugRate ?? 0) * 100)}%`} />
            {emp.riskTolerance && <HStat label="Risk" value={emp.riskTolerance} />}
          </div>

          {mbti && (
            <div className="pt-2 border-t border-border/30">
              <p className="text-[11px] font-bold text-foreground">{mbti.code} — {mbti.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{mbti.shortDesc}</p>
            </div>
          )}

          {nation && (
            <div className="flex items-center gap-2">
              <span className="text-[14px]">{nation.flag}</span>
              <p className="text-[11px] text-muted-foreground">{nation.label}</p>
            </div>
          )}

          {emp.primaryStack?.length > 0 && (
            <div className="pt-2 border-t border-border/30">
              <p className="text-[10px] text-muted-foreground">Stack: <strong className="text-foreground">{emp.primaryStack.join(", ")}</strong></p>
            </div>
          )}

          {emp.taskTitle && (
            <div className="pt-2 border-t border-border/30">
              <p className="text-[10px] text-muted-foreground">Current: <strong className="text-foreground">{emp.taskTitle}</strong></p>
              <p className="text-[9px] text-muted-foreground/40 mt-0.5 italic">Owned by role contract, not individual employee</p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function HStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-[11px]">
      <span className="text-muted-foreground">{label}: </span>
      <strong className="text-foreground">{value}</strong>
    </div>
  );
}

/* ═══ STUDIO CHAT PANEL ═══ */
function StudioChatPanel({ events }: { events: { id: string; type: string; time: string; meta?: string }[] }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/30">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-foreground/5 flex items-center justify-center">
            <Radio className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-bold text-foreground tracking-tight">Event Feed</h3>
            <p className="text-[11px] text-muted-foreground/50">Internal production events</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-status-green/10">
            <span className="h-2 w-2 rounded-full bg-status-green animate-pulse" />
            <span className="text-[10px] font-bold text-status-green">LIVE</span>
          </div>
        </div>
      </div>

      {/* Event stream */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-3 space-y-0.5">
          {events.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30 mb-3" />
              <span className="text-[12px] text-muted-foreground/40">Waiting for activity…</span>
            </div>
          ) : (
            events.map((evt, i) => {
              const cfg = EVT[evt.type] ?? DEFAULT_EVT;
              return (
                <div key={evt.id}
                  className="flex items-start gap-3 py-2.5 px-2.5 rounded-lg hover:bg-muted/30 transition-colors animate-fade-in"
                  style={{ animationDelay: `${Math.min(i * 12, 120)}ms` }}
                >
                  <div className={cn("h-2.5 w-2.5 rounded-full shrink-0 mt-1.5", cfg.dot)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[11px] font-bold text-foreground">{cfg.actor ?? "System"}</span>
                      <span className="text-[10px] text-muted-foreground/30">·</span>
                      <span className="text-[10px] text-muted-foreground/60 truncate">{cfg.label}</span>
                    </div>
                    {evt.meta && (
                      <p className="text-[10px] text-muted-foreground/40 truncate mt-0.5">{evt.meta}</p>
                    )}
                    <p className="text-[9px] font-mono text-muted-foreground/30 mt-0.5">
                      {formatDistanceToNow(new Date(evt.time), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
