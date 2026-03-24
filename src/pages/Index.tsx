import { AppLayout } from "@/components/AppLayout";
import { useProjects, useDashboardCounts, useApprovals, useActivityEvents, useTasks } from "@/hooks/use-data";
import { useSystemMode } from "@/hooks/use-system-mode";
import { useFounderInbox } from "@/hooks/use-founder-data";
import { FounderInbox } from "@/components/command-center/FounderInbox";
import { ActiveDelivery } from "@/components/command-center/ActiveDelivery";
import { LiveFlow } from "@/components/command-center/LiveFlow";
import { RiskHealth } from "@/components/command-center/RiskHealth";
import { PipelineBar, MiniPipeline, resolveStageIndex, STAGE_COLORS } from "@/components/PipelineBar";
import { useQuery } from "@tanstack/react-query";
import { fetchWorkerNodes, fetchStalledEntities } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  FileText, FolderOpen, ArrowRight, Zap,
  Layers, Activity, AlertTriangle, Shield, Clock,
} from "lucide-react";

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

  const activeProjects = projects.filter((p) => p.state === "active" || p.state === "in_review" || p.state === "blocked");
  const inProgressTasks = tasks.filter((t) => t.state === "in_progress").map(toDeliveryTask);
  const waitingReviewTasks = tasks.filter((t) => t.state === "waiting_review").map(toDeliveryTask);
  const blockedTasks = tasks.filter((t) => t.state === "blocked").map(toDeliveryTask);

  const failedRuns = counts?.failedRuns ?? 0;
  const escalatedCount = escalations.length;

  /* Pipeline — find the "most advanced" active project stage */
  const maxStageIdx = activeProjects.reduce((max, p) => {
    const idx = resolveStageIndex(p.state);
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

          {/* Pipeline stages — 8 stages */}
          <div className="px-6 py-5">
            <PipelineBar currentStageIndex={maxStageIdx} />
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            SECTION 2 — HERO ACTION BLOCK
            ════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl bg-card border border-border px-10 py-10 shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.015] via-transparent to-status-blue/[0.01] pointer-events-none" />
          <div className="relative text-center max-w-[600px] mx-auto">
            <div className="flex items-center gap-2.5 justify-center mb-4">
              <Zap className="h-5 w-5 text-primary/30" />
              <span className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-[0.14em]">
                Launch Pad
              </span>
            </div>
            <h1 className="text-[38px] font-bold tracking-[-0.03em] text-foreground leading-[1.05]">
              Start a New Production Flow
            </h1>
            <p className="text-[15px] text-muted-foreground mt-3 leading-relaxed">
              Begin with structured intake or pick up where you left off on an active project.
            </p>

            <div className="flex items-center gap-3 justify-center mt-6">
              <Link to="/presale/new">
                <Button
                  size="lg"
                  className="h-14 px-8 gap-3 text-[16px] font-bold bg-foreground text-background hover:bg-foreground/90 rounded-xl shadow-lg"
                >
                  <FileText className="h-5 w-5" />
                  Start Structured Intake
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <Link to="/projects">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 px-7 gap-2.5 text-[16px] font-bold border-border text-foreground hover:bg-secondary rounded-xl"
                >
                  <FolderOpen className="h-5 w-5" />
                  Resume Existing Project
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            SECTION 2.5 — ACTIVE PROJECT PIPELINES
            ════════════════════════════════════════════════════════════ */}
        {activeProjects.length > 0 && (
          <div className="rounded-2xl bg-card border border-border shadow-sm px-6 py-5">
            <h2 className="text-[14px] font-bold text-foreground tracking-tight mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground/50" />
              Active Project Pipelines
              <span className="text-[11px] font-mono text-muted-foreground ml-auto">{activeProjects.length} project{activeProjects.length > 1 ? "s" : ""}</span>
            </h2>
            <div className="space-y-3">
              {activeProjects.slice(0, 6).map((p) => {
                const idx = resolveStageIndex(p.state);
                const isBlocked = p.state === "blocked";
                return (
                  <Link key={p.id} to={`/projects/${p.id}`} className="block">
                    <div className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-secondary/30 transition-colors group">
                      <span className="text-[14px] font-bold text-foreground w-[180px] truncate shrink-0 group-hover:text-primary transition-colors">
                        {p.name}
                      </span>
                      <MiniPipeline currentStageIndex={idx} blocked={isBlocked} className="flex-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            SECTION 3 + 4 — ASYMMETRIC 7/5 GRID
            ════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" style={{ minHeight: "calc(100vh - 580px)" }}>

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

            <RiskHealth
              blocked={counts?.blockedTasks ?? 0}
              escalated={escalatedCount}
              failedRuns={failedRuns}
              failedDeploys={0}
              stalledRuns={stalled?.stalled_runs?.length ?? 0}
            />

            <div className="rounded-2xl bg-secondary/20 border border-border/50 px-4 py-4 flex-1 min-h-0 overflow-hidden flex flex-col">
              <LiveFlow events={events} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
