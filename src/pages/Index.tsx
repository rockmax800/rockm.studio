import { AppLayout } from "@/components/AppLayout";
import { useProjects, useDashboardCounts, useApprovals, useActivityEvents, useTasks } from "@/hooks/use-data";
import { useSystemMode } from "@/hooks/use-system-mode";
import { useFounderInbox } from "@/hooks/use-founder-data";
import { FounderInbox } from "@/components/command-center/FounderInbox";
import { ActiveDelivery } from "@/components/command-center/ActiveDelivery";
import { LiveFlow } from "@/components/command-center/LiveFlow";
import { RiskHealth } from "@/components/command-center/RiskHealth";
import { useQuery } from "@tanstack/react-query";
import { fetchWorkerNodes, fetchStalledEntities } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  FileText, FolderOpen, ArrowRight, Zap, ChevronRight,
  Layers, Activity, AlertTriangle, Rocket, CheckCircle2,
  Clock, Shield,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   PIPELINE STAGES
   ═══════════════════════════════════════════════════════════════ */
const PIPELINE = [
  { key: "intake",    label: "Intake",    states: ["draft"],     href: "/presale/new",  icon: FileText },
  { key: "blueprint", label: "Blueprint", states: ["scoped"],    href: "/projects",     icon: Layers },
  { key: "kickoff",   label: "Kickoff",   states: [],            href: "/projects",     icon: Rocket },
  { key: "delivery",  label: "Delivery",  states: ["active", "blocked"], href: "/tasks", icon: Activity },
  { key: "review",    label: "Review",    states: ["in_review"], href: "/founder",      icon: Shield },
  { key: "release",   label: "Release",   states: ["completed", "archived", "paused"], href: "/projects", icon: CheckCircle2 },
] as const;

function resolveStageIndex(projectState?: string): number {
  if (!projectState) return -1;
  return PIPELINE.findIndex((s) => (s.states as readonly string[]).includes(projectState));
}

const STAGE_COLORS: Record<string, { active: string; activeBg: string; done: string; border: string }> = {
  intake:    { active: "text-status-blue",       activeBg: "bg-status-blue/8",    done: "text-status-blue/40",       border: "border-status-blue" },
  blueprint: { active: "text-lifecycle-review",  activeBg: "bg-lifecycle-review/8", done: "text-lifecycle-review/40", border: "border-lifecycle-review" },
  kickoff:   { active: "text-status-cyan",       activeBg: "bg-status-cyan/8",    done: "text-status-cyan/40",       border: "border-status-cyan" },
  delivery:  { active: "text-status-amber",      activeBg: "bg-status-amber/8",   done: "text-status-amber/40",      border: "border-status-amber" },
  review:    { active: "text-lifecycle-rework",   activeBg: "bg-lifecycle-rework/8", done: "text-lifecycle-rework/40", border: "border-lifecycle-rework" },
  release:   { active: "text-status-green",      activeBg: "bg-status-green/8",   done: "text-status-green/40",      border: "border-status-green" },
};

/* ═══════════════════════════════════════════════════════════════ */

export default function CommandCenter() {
  const { data: projects = [] } = useProjects();
  const { data: counts } = useDashboardCounts();
  const { data: approvals = [] } = useApprovals();
  const { data: events = [] } = useActivityEvents(undefined, 40);
  const { data: modeData } = useSystemMode();
  const { data: tasks = [] } = useTasks();
  const inbox = useFounderInbox();

  const { data: workers = [] } = useQuery({ queryKey: ["workers"], queryFn: fetchWorkerNodes, staleTime: 15_000 });
  const { data: stalled } = useQuery({ queryKey: ["stalled"], queryFn: fetchStalledEntities, staleTime: 15_000 });

  const { data: activeDeploys = [] } = useQuery({
    queryKey: ["active-deploys"],
    queryFn: async () => {
      const { data } = await supabase.from("deployments").select("id").eq("status", "deploying");
      return data ?? [];
    },
    staleTime: 15_000,
  });

  const pendingApprovals = approvals.filter((a) => a.state === "pending");
  const escalations = inbox.data?.escalations ?? [];
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  /* ── Inbox items ── */
  const inboxItems = [
    ...pendingApprovals.map((a) => ({
      id: a.id,
      type: "approval" as const,
      category: a.approval_type.replace(/_/g, " "),
      title: a.summary,
      riskLevel: (a.consequence_if_rejected ? "high" : "normal") as "high" | "normal",
      evidenceCount: 0,
      timestamp: a.created_at,
      linkTo: `/control/approvals/${a.id}`,
      projectName: projectMap[a.project_id] ?? "—",
      impactSummary: a.consequence_if_approved ?? undefined,
    })),
    ...escalations.map((e: any) => ({
      id: e.id,
      type: "escalation" as const,
      category: "escalation",
      title: e.title,
      riskLevel: "high" as const,
      timestamp: e.updated_at,
      linkTo: `/control/tasks/${e.id}`,
      projectName: projectMap[e.project_id] ?? "—",
    })),
  ].sort((a, b) => {
    if (a.riskLevel === "high" && b.riskLevel !== "high") return -1;
    if (b.riskLevel === "high" && a.riskLevel !== "high") return 1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  /* ── Delivery data ── */
  const toDeliveryTask = (t: any) => ({
    id: t.id,
    projectName: projectMap[t.project_id] ?? "—",
    projectId: t.project_id,
    title: t.title,
    state: t.state,
    roleName: t.agent_roles?.name,
    roleCode: t.agent_roles?.code,
    updatedAt: t.updated_at,
  });

  const activeProjects = projects.filter((p) => p.state === "active" || p.state === "in_review");
  const inProgressTasks = tasks.filter((t) => t.state === "in_progress").map(toDeliveryTask);
  const waitingReviewTasks = tasks.filter((t) => t.state === "waiting_review").map(toDeliveryTask);
  const blockedTasks = tasks.filter((t) => t.state === "blocked").map(toDeliveryTask);

  const failedRuns = counts?.failedRuns ?? 0;
  const escalatedCount = escalations.length;

  /* Pipeline — find the "most advanced" active project stage */
  const activeProjectStates = activeProjects.map((p) => p.state);
  const maxStageIdx = activeProjectStates.reduce((max, state) => {
    const idx = resolveStageIndex(state);
    return idx > max ? idx : max;
  }, -1);

  /* ── Metrics strip ── */
  const metricItems = [
    { label: "Projects", value: activeProjects.length, icon: Layers },
    { label: "Active Tasks", value: inProgressTasks.length, icon: Activity },
    { label: "In Review", value: waitingReviewTasks.length, icon: Clock },
    { label: "Blocked", value: blockedTasks.length, icon: AlertTriangle, danger: true },
    { label: "Pending Decisions", value: pendingApprovals.length, icon: Shield, danger: true },
  ];

  return (
    <AppLayout title="Nerve Center">
      <div className="space-y-6 pb-10">

        {/* ════════════════════════════════════════════════════════════
            SECTION 1 — PRODUCTION PIPELINE (DOMINANT TOP BAR)
            ════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          {/* Metrics strip */}
          <div className="px-6 py-3 border-b border-border/40 flex items-center gap-6 bg-secondary/20">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50 mr-2">
              {modeData?.mode ?? "production"}
            </span>
            {metricItems.map((m) => (
              <div key={m.label} className="flex items-center gap-2">
                <m.icon className={cn("h-3.5 w-3.5", m.danger && (m.value > 0) ? "text-destructive" : "text-muted-foreground/50")} />
                <span className={cn(
                  "text-[13px] font-bold font-mono tabular-nums",
                  m.danger && (m.value > 0) ? "text-destructive" : "text-foreground",
                )}>{m.value}</span>
                <span className="text-[11px] text-muted-foreground/50 font-medium">{m.label}</span>
              </div>
            ))}
          </div>

          {/* Pipeline stages */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-0">
              {PIPELINE.map((stage, i) => {
                const isCurrent = i === maxStageIdx;
                const isDone = maxStageIdx > i && maxStageIdx >= 0;
                const colors = STAGE_COLORS[stage.key];
                const Icon = stage.icon;

                return (
                  <div key={stage.key} className="flex items-center flex-1 min-w-0">
                    <Link to={stage.href} className="flex-1 min-w-0">
                      <div className={cn(
                        "relative rounded-xl px-5 py-4 transition-all cursor-pointer border-2",
                        isCurrent
                          ? `${colors.activeBg} ${colors.border} shadow-sm`
                          : isDone
                            ? "border-transparent bg-secondary/20 hover:bg-secondary/40"
                            : "border-transparent hover:bg-secondary/20",
                      )}>
                        {/* Active pulse */}
                        {isCurrent && (
                          <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-50", colors.active.replace("text-", "bg-"))} />
                            <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", colors.active.replace("text-", "bg-"))} />
                          </span>
                        )}

                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                            isCurrent ? `${colors.activeBg} border ${colors.border}` : "bg-secondary/40",
                          )}>
                            <Icon className={cn(
                              "h-5 w-5",
                              isCurrent ? colors.active : isDone ? colors.done : "text-muted-foreground/25",
                            )} />
                          </div>
                          <div className="min-w-0">
                            <span className={cn(
                              "text-[16px] font-bold block leading-tight",
                              isCurrent ? colors.active : isDone ? "text-foreground/50" : "text-muted-foreground/30",
                            )}>
                              {stage.label}
                            </span>
                            {isCurrent && (
                              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5 block">
                                Current Stage
                              </span>
                            )}
                            {isDone && (
                              <span className="text-[11px] text-muted-foreground/30 mt-0.5 block">Complete</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>

                    {i < PIPELINE.length - 1 && (
                      <div className="flex items-center px-1 shrink-0">
                        <ChevronRight className={cn(
                          "h-5 w-5",
                          isDone ? "text-muted-foreground/25" : "text-muted-foreground/10",
                        )} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            SECTION 2 — HERO ACTION BLOCK
            ════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl bg-card border border-border px-10 py-10 shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.015] via-transparent to-status-blue/[0.01] pointer-events-none" />
          <div className="relative flex items-end justify-between gap-10">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-3">
                <Zap className="h-5 w-5 text-primary/30" />
                <span className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-[0.14em]">
                  Launch Pad
                </span>
              </div>
              <h1 className="text-[40px] font-bold tracking-[-0.03em] text-foreground leading-[1.05]">
                What are we building?
              </h1>
              <p className="text-[16px] text-muted-foreground mt-3 leading-relaxed max-w-[480px]">
                Start with structured intake or pick up where you left off on an active project.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link to="/presale/new">
                <Button
                  size="lg"
                  className="h-14 px-8 gap-3 text-[16px] font-bold bg-foreground text-background hover:bg-foreground/90 rounded-xl shadow-lg"
                >
                  <FileText className="h-5 w-5" />
                  Start Structured Intake
                  <ArrowRight className="h-4.5 w-4.5 ml-1" />
                </Button>
              </Link>
              <Link to="/projects">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 px-7 gap-2.5 text-[16px] font-bold border-border-strong text-foreground hover:bg-secondary rounded-xl"
                >
                  <FolderOpen className="h-5 w-5" />
                  Resume Project
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            SECTION 3 + 4 — ASYMMETRIC 7/5 GRID
            ════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" style={{ minHeight: "calc(100vh - 480px)" }}>

          {/* ── LEFT 7 — FOUNDER DECISION BOARD ── */}
          <div className="lg:col-span-7 flex flex-col gap-5 min-h-0">
            <div
              className="rounded-2xl bg-card border border-border px-5 py-5 flex-1 min-h-0 overflow-hidden flex flex-col shadow-sm border-t-[3px] border-t-primary/20"
              style={{ minHeight: 380 }}
            >
              <FounderInbox items={inboxItems} />
            </div>
          </div>

          {/* ── RIGHT 5 — DELIVERY SNAPSHOT ── */}
          <div className="lg:col-span-5 flex flex-col gap-4 min-h-0">

            {/* Active projects + delivery */}
            <div
              className="rounded-2xl bg-card border border-border px-4 py-4 overflow-hidden flex flex-col shadow-sm"
              style={{ minHeight: 220 }}
            >
              <ActiveDelivery
                inProgress={inProgressTasks}
                waitingReview={waitingReviewTasks}
                blocked={blockedTasks}
                activeProjects={activeProjects}
              />
            </div>

            {/* Risk & health */}
            <RiskHealth
              blocked={counts?.blockedTasks ?? 0}
              escalated={escalatedCount}
              failedRuns={failedRuns}
              failedDeploys={0}
              stalledRuns={stalled?.stalled_runs?.length ?? 0}
            />

            {/* Live events */}
            <div className="rounded-2xl bg-secondary/20 border border-border/50 px-4 py-4 flex-1 min-h-0 overflow-hidden flex flex-col">
              <LiveFlow events={events} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
