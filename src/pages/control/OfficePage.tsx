import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useOfficeData, useOfficeRealtime } from "@/hooks/use-office-data";
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
  Activity, Users, Zap, Stamp, FolderKanban,
  AlertTriangle, Shield, UserPlus, Loader2,
  MessageSquare, ChevronRight,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   ROOM TINTS — subtle bg differentiation per capability
   ═══════════════════════════════════════════════════════════════ */

const ROOM_TINTS = [
  { bg: "bg-blue-50/40",    border: "border-blue-200/40",    accent: "text-blue-600",    ring: "ring-blue-200/60" },
  { bg: "bg-violet-50/40",  border: "border-violet-200/40",  accent: "text-violet-600",  ring: "ring-violet-200/60" },
  { bg: "bg-amber-50/40",   border: "border-amber-200/40",   accent: "text-amber-600",   ring: "ring-amber-200/60" },
  { bg: "bg-emerald-50/40", border: "border-emerald-200/40", accent: "text-emerald-600", ring: "ring-emerald-200/60" },
  { bg: "bg-rose-50/40",    border: "border-rose-200/40",    accent: "text-rose-600",    ring: "ring-rose-200/60" },
];

const STATUS_STYLE: Record<string, { dot: string; label: string; glow?: string; chipCls: string }> = {
  working:   { dot: "bg-status-green",       label: "Working",   glow: "shadow-[0_0_12px_-2px] shadow-status-green/30", chipCls: "bg-status-green/10 text-status-green" },
  reviewing: { dot: "bg-lifecycle-review",   label: "Reviewing", chipCls: "bg-lifecycle-review/10 text-lifecycle-review" },
  blocked:   { dot: "bg-destructive",        label: "Blocked",   glow: "shadow-[0_0_12px_-2px] shadow-destructive/25",  chipCls: "bg-destructive/10 text-destructive" },
  idle:      { dot: "bg-muted-foreground/20", label: "Idle",      chipCls: "bg-secondary text-muted-foreground" },
};

/* ═══ EVENT CONFIG ═══ */
const EVT: Record<string, { dot: string; label: string }> = {
  "task.assigned":      { dot: "bg-blue-500",    label: "Task Assigned" },
  "run.started":        { dot: "bg-amber-500",   label: "Run Started" },
  "run.completed":      { dot: "bg-green-500",   label: "Run Completed" },
  "run.failed":         { dot: "bg-red-500",     label: "Run Failed" },
  "artifact.submitted": { dot: "bg-cyan-500",    label: "Artifact Submitted" },
  "review.approved":    { dot: "bg-green-500",   label: "Review Approved" },
  "review.rejected":    { dot: "bg-red-500",     label: "Review Rejected" },
  task_assigned:        { dot: "bg-blue-500",    label: "Task Assigned" },
  run_started:          { dot: "bg-amber-500",   label: "Run Started" },
  run_completed:        { dot: "bg-green-500",   label: "Run Completed" },
  run_failed:           { dot: "bg-red-500",     label: "Run Failed" },
  artifact_submitted:   { dot: "bg-cyan-500",    label: "Artifact Submitted" },
  review_approved:      { dot: "bg-green-500",   label: "Review Approved" },
  review_rejected:      { dot: "bg-red-500",     label: "Review Rejected" },
  deployment_started:   { dot: "bg-indigo-500",  label: "Deploy Started" },
  deployment_completed: { dot: "bg-green-500",   label: "Deploy Completed" },
  approval_created:     { dot: "bg-amber-500",   label: "Approval Created" },
  task_escalated:       { dot: "bg-pink-600",    label: "Task Escalated" },
  handoff_created:      { dot: "bg-blue-400",    label: "Handoff Created" },
  pr_created:           { dot: "bg-violet-500",  label: "PR Created" },
};
const DEFAULT_EVT = { dot: "bg-muted-foreground/30", label: "Event" };

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function OfficePage() {
  const { data, isLoading, error } = useOfficeData();
  useOfficeRealtime();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);

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
    for (const emp of data.employees ?? []) {
      if (["terminated", "inactive"].includes(emp.status)) continue;
      const teamId = emp.team_id ?? "__none";
      if (!map[teamId]) map[teamId] = [];
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
      map[teamId].push({
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
      });
    }
    return map;
  }, [data, roleProfileById]);

  const mergedEvents = useMemo(() => {
    if (!data) return [];
    const o = (data.officeEvents ?? []).map((e: any) => ({ id: e.id, type: e.event_type, time: e.timestamp, meta: e.from_zone && e.to_zone ? `${e.from_zone} → ${e.to_zone}` : undefined }));
    const a = (data.recentEvents ?? []).slice(0, 50).map((e: any) => ({ id: e.id, type: e.event_type, time: e.created_at, meta: `${e.entity_type} · ${e.actor_type}` }));
    return [...o, ...a].sort((x, y) => new Date(y.time).getTime() - new Date(x.time).getTime()).slice(0, 60);
  }, [data]);

  if (isLoading) {
    return (
      <AppLayout title="Production Floor">
        <div className="flex items-center justify-center min-h-[60vh] text-[14px] text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading studio…
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

  const teamData = data.teams ?? [];
  const totalEmployees = Object.values(teamEmployeesEnriched).flat().length;
  const hasNoSetup = teamData.length === 0 && totalEmployees === 0;

  return (
    <AppLayout title="Production Floor">
      <div className="grid-content space-y-0 pb-8">

        {/* ═══ TOP STRIP ════════════════════════════════════════ */}
        <div className="flex items-center justify-between py-4 px-1">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-status-green animate-pulse" />
              <span className="text-[12px] font-bold text-foreground uppercase tracking-[0.15em]">Production Floor</span>
            </div>
            <div className="h-5 w-px bg-border" />
            <TopStat icon={FolderKanban} value={stats.projects} label="Projects" />
            <TopStat icon={Zap} value={stats.runs} label="Runs" accent={stats.runs > 0} />
            <TopStat icon={Stamp} value={stats.approvals} label="Approvals" accent={stats.approvals > 0} warn />
            {stats.blocked > 0 && (
              <TopStat icon={AlertTriangle} value={stats.blocked} label="Blocked" accent danger />
            )}
          </div>
        </div>

        {/* ═══ NO CAPABILITIES EMPTY STATE ═══════════════════════ */}
        {hasNoSetup && (
          <div className="flex items-center justify-center min-h-[55vh]">
            <div className="text-center max-w-[500px] mx-auto">
              <div className="h-20 w-20 rounded-2xl bg-secondary/60 border border-border flex items-center justify-center mx-auto mb-6">
                <Users className="h-10 w-10 text-muted-foreground/20" />
              </div>
              <h1 className="text-[28px] font-bold text-foreground tracking-tight">Build your AI Studio</h1>
              <p className="text-[15px] text-muted-foreground mt-3 leading-relaxed max-w-[400px] mx-auto">
                Create capabilities and hire AI team members to see them working on the production floor.
              </p>
              <Link to="/teams">
                <Button className="mt-7 h-12 px-7 gap-2 text-[14px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90">
                  <Zap className="h-4 w-4" /> Go to Teams Setup
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ═══ SPATIAL FLOOR MAP ═════════════════════════════════ */}
        {!hasNoSetup && (
          <>
            {/* Floorplan grid — asymmetric layout */}
            <div className="relative rounded-2xl border border-border bg-card overflow-hidden">
              {/* Floor surface */}
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-transparent to-secondary/10 pointer-events-none" />

              <div className="relative grid grid-cols-1 lg:grid-cols-2">
                {teamData.map((team: any, idx: number) => {
                  const employees = teamEmployeesEnriched[team.id] ?? [];
                  const tint = ROOM_TINTS[idx % ROOM_TINTS.length];
                  const activeCount = employees.filter((e: any) => e.status !== "idle").length;
                  const maxCap = team.max_capacity ?? 6;

                  return (
                    <div key={team.id}
                      className={cn(
                        "relative border-b lg:border-b-0 border-border/40",
                        // Right column gets left border
                        idx % 2 === 1 && "lg:border-l",
                        // After first row gets top border
                        idx >= 2 && "lg:border-t",
                        tint.bg,
                      )}
                      style={{ minHeight: 240 }}
                    >
                      {/* Room label — upper-left */}
                      <div className="flex items-center justify-between px-5 pt-4 pb-2">
                        <div>
                          <h3 className="text-[18px] font-bold text-foreground tracking-tight">{team.name}</h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{team.focus_domain || "Production Capability"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-muted-foreground">
                            <strong className="text-foreground">{employees.length}</strong> / {maxCap}
                          </span>
                          {activeCount > 0 && (
                            <Badge className="text-[9px] font-bold px-2 py-0 h-[18px] bg-status-green/10 text-status-green border-status-green/20">
                              {activeCount} active
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Room pipeline strip */}
                      <RoomPipelineStrip
                        tasks={data.allTasks.filter((t: any) => {
                          const roleIds = new Set(employees.map((e: any) => e.roleId));
                          return roleIds.has(t.owner_role_id);
                        })}
                      />

                      {/* Employee spatial area */}
                      <div className="px-5 pb-5 pt-2">
                        {employees.length === 0 ? (
                          <div className="flex flex-col items-center py-10 text-center">
                            <Users className="h-8 w-8 text-muted-foreground/10 mb-3" />
                            <p className="text-[15px] font-semibold text-muted-foreground/40">No team members in this capability.</p>
                            <AddEmployeeDialog teamId={team.id} teamName={team.name}
                              trigger={
                                <Button variant="outline" className="mt-4 h-10 px-5 gap-2 text-[13px] font-bold rounded-xl">
                                  <UserPlus className="h-4 w-4" /> Add Team Member
                                </Button>
                              }
                            />
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-6 items-start">
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
            </div>

            {/* No teams but has employees */}
            {teamData.length === 0 && totalEmployees > 0 && (
              <div className="text-center py-12 mt-4">
                <p className="text-[18px] font-bold text-foreground">Create capabilities to organize your team</p>
                <p className="text-[14px] text-muted-foreground mt-2">
                  You have {totalEmployees} team member{totalEmployees > 1 ? "s" : ""} — assign them to capability pools.
                </p>
                <Link to="/teams">
                  <Button className="mt-5 h-11 px-6 gap-2 text-[14px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90">
                    <Users className="h-4 w-4" /> Go to Teams Setup
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ STUDIO CHAT FLOATING BUTTON + SHEET ════════════════ */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetTrigger asChild>
          <button
            className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-foreground text-background shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center"
            title="Open Studio Chat"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[360px] sm:w-[400px] p-0">
          <StudioChatPanel events={mergedEvents} />
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function TopStat({ icon: Icon, value, label, accent, warn, danger }: {
  icon: React.ElementType; value: number; label: string; accent?: boolean; warn?: boolean; danger?: boolean;
}) {
  const cls = danger ? "text-destructive" : warn && accent ? "text-status-amber" : accent ? "text-status-blue" : "text-muted-foreground";
  return (
    <div className={`flex items-center gap-1.5 ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="font-bold font-mono text-foreground tabular-nums text-[13px]">{value}</span>
      <span className="text-[11px] font-medium">{label}</span>
    </div>
  );
}

/* ═══ ROOM PIPELINE STRIP — micro status bar per capability ═══ */
function RoomPipelineStrip({ tasks }: { tasks: any[] }) {
  const active = tasks.filter((t: any) => !["done", "cancelled"].includes(t.state));
  if (active.length === 0) return null;

  const counts = {
    intake: active.filter((t: any) => ["draft", "ready"].includes(t.state)).length,
    delivery: active.filter((t: any) => ["assigned", "in_progress"].includes(t.state)).length,
    review: active.filter((t: any) => t.state === "waiting_review").length,
    blocked: active.filter((t: any) => t.state === "blocked").length,
  };

  return (
    <div className="flex items-center gap-3 px-5 py-1.5">
      {counts.intake > 0 && <PipeChip label="Intake" count={counts.intake} cls="text-status-blue bg-status-blue/8" />}
      {counts.delivery > 0 && <PipeChip label="Delivery" count={counts.delivery} cls="text-status-amber bg-status-amber/8" />}
      {counts.review > 0 && <PipeChip label="Review" count={counts.review} cls="text-lifecycle-review bg-lifecycle-review/8" />}
      {counts.blocked > 0 && <PipeChip label="Blocked" count={counts.blocked} cls="text-destructive bg-destructive/8" />}
    </div>
  );
}

function PipeChip({ label, count, cls }: { label: string; count: number; cls: string }) {
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${cls}`}>
      {label} · {count}
    </span>
  );
}

/* ═══ FLOOR EMPLOYEE — spatial avatar with status ═══ */
function FloorEmployee({ emp, onClick }: { emp: any; onClick: () => void }) {
  const persona = getPersona(emp.code);
  const st = STATUS_STYLE[emp.status] ?? STATUS_STYLE.idle;
  const repScore = Math.round((emp.reputationScore ?? 0) * 100);
  const successPct = Math.round((emp.successRate ?? 0) * 100);
  const roleName = ROLE_OPTIONS.find(r => r.code === emp.code)?.label ?? emp.code;
  const mbti = emp.mbtiCode ? getMBTI(emp.mbtiCode) : null;
  const nation = emp.nationalityCode ? getNationality(emp.nationalityCode) : null;
  const perfRing = repScore >= 80 ? "border-status-green/50" : repScore >= 50 ? "border-status-amber/50" : "border-destructive/50";

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
            className={cn(
              "group flex flex-col items-center text-center w-[100px] cursor-pointer transition-all duration-200 hover:-translate-y-1",
              st.glow,
            )}
          >
            {/* Avatar with performance border */}
            <div className="relative mb-2">
              <div className={cn("rounded-2xl border-[3px] p-0.5 transition-all", perfRing)}>
                <img src={persona.avatar} alt={emp.name}
                  className={cn("h-[64px] w-[64px] rounded-xl object-cover ring-2 ring-offset-1 ring-offset-card", persona.ringClass)}
                  width={64} height={64} loading="lazy" />
              </div>
              {/* Status dot */}
              <span className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card",
                st.dot,
                emp.status === "working" && "animate-pulse",
              )} />
            </div>

            {/* Name + role */}
            <p className="text-[12px] font-bold text-foreground leading-tight truncate max-w-full group-hover:text-primary transition-colors">{emp.name}</p>
            <p className="text-[10px] text-muted-foreground truncate max-w-full mt-0.5">{roleName}</p>

            {/* Status chip */}
            <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full mt-1.5", st.chipCls)}>
              {st.label}
            </span>

            {/* Task card */}
            {emp.taskTitle && (
              <div className="mt-2 w-full px-2 py-1.5 rounded-lg bg-card border border-border text-left shadow-sm">
                <p className="text-[9px] text-muted-foreground line-clamp-1">{emp.taskTitle}</p>
                {emp.taskState && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className={cn("h-1.5 w-1.5 rounded-full",
                      emp.taskState === "in_progress" && "bg-status-amber",
                      emp.taskState === "waiting_review" && "bg-lifecycle-review",
                      emp.taskState === "blocked" && "bg-destructive",
                    )} />
                    <span className="text-[8px] text-muted-foreground/60 font-medium">{STATE_LABEL[emp.taskState] ?? emp.taskState}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </TooltipTrigger>

        {/* ═══ HOVER TOOLTIP ═══ */}
        <TooltipContent side="right" sideOffset={12} className="max-w-[300px] p-4 space-y-2.5 shadow-xl">
          <div className="flex items-center gap-3">
            <img src={persona.avatar} alt={emp.name} className="h-10 w-10 rounded-xl object-cover" width={40} height={40} />
            <div>
              <p className="text-[14px] font-bold text-foreground">{emp.name}</p>
              <p className="text-[11px] text-muted-foreground">{roleName}{emp.seniority ? ` · ${emp.seniority}` : ""}</p>
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
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-[15px] font-bold text-foreground tracking-tight">Studio Chat</h3>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-status-green animate-pulse" />
            <span className="text-[10px] font-bold text-status-green">LIVE</span>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">Internal AI discussion stream</p>
      </div>

      {/* Event stream */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-3 space-y-0">
          {events.length === 0 ? (
            <div className="flex items-center gap-2 py-8 text-[12px] text-muted-foreground justify-center">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Waiting for activity…
            </div>
          ) : (
            events.map((evt, i) => {
              const cfg = EVT[evt.type] ?? DEFAULT_EVT;
              return (
                <div key={evt.id}
                  className="flex items-start gap-3 py-2.5 animate-fade-in"
                  style={{ animationDelay: `${Math.min(i * 12, 120)}ms` }}
                >
                  <div className="flex flex-col items-center w-2.5 shrink-0 pt-1.5">
                    <div className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                    {i < events.length - 1 && <div className="flex-1 w-px bg-border/40 min-h-[10px]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-foreground/70 truncate">{cfg.label}</p>
                    {evt.meta && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{evt.meta}</p>
                    )}
                    <p className="text-[9px] font-mono text-muted-foreground/50 mt-0.5">
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
