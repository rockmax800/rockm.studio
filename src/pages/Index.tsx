import { AppLayout } from "@/components/AppLayout";
import { useProjects, useDashboardCounts, useApprovals, useActivityEvents, useTasks } from "@/hooks/use-data";
import { useSystemMode } from "@/hooks/use-system-mode";
import { useFounderInbox } from "@/hooks/use-founder-data";
import { FounderInbox } from "@/components/command-center/FounderInbox";
import { ActiveDelivery } from "@/components/command-center/ActiveDelivery";
import { LiveFlow } from "@/components/command-center/LiveFlow";
import { RiskHealth } from "@/components/command-center/RiskHealth";
import { StatusStrip, HeroComposer, QuickActions } from "@/components/command-center/HeroComposer";
import { PipelineBar, MiniPipeline, resolveStageIndex } from "@/components/PipelineBar";
import { useQuery } from "@tanstack/react-query";
import { fetchWorkerNodes, fetchStalledEntities } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  Layers, Activity, Clock, AlertTriangle, Shield, Columns3,
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

  const maxStageIdx = activeProjects.reduce((max, p) => {
    const idx = resolveStageIndex(p.state);
    return idx > max ? idx : max;
  }, -1);

  const metricItems = [
    { label: "Projects", value: activeProjects.length, icon: Layers },
    { label: "Active", value: inProgressTasks.length, icon: Activity },
    { label: "Review", value: waitingReviewTasks.length, icon: Clock },
    { label: "Blocked", value: blockedTasks.length, icon: AlertTriangle, danger: true },
    { label: "Decisions", value: pendingApprovals.length, icon: Shield, danger: true },
  ];

  return (
    <AppLayout title="Command Center">
      <div className="space-y-5 pb-12 max-w-[1440px]">

        {/* ── Status strip ────────────────────────────────── */}
        <StatusStrip mode={modeData?.mode ?? "production"} metrics={metricItems} />

        {/* ── Pipeline ────────────────────────────────────── */}
        {maxStageIdx >= 0 && (
          <div className="rounded-xl bg-surface-raised border border-border/30 px-6 py-4">
            <PipelineBar currentStageIndex={maxStageIdx} />
          </div>
        )}

        {/* ── Hero ────────────────────────────────────────── */}
        <HeroComposer />

        {/* ── Quick actions ───────────────────────────────── */}
        <QuickActions />

        {/* ── Active pipelines ────────────────────────────── */}
        {activeProjects.length > 0 && (
          <div className="rounded-2xl bg-card border border-border/40 px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold text-foreground tracking-tight flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground/40" strokeWidth={1.8} />
                Active Pipelines
              </h2>
              <span className="text-[11px] font-mono text-muted-foreground/40">
                {activeProjects.length} project{activeProjects.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-2">
              {activeProjects.slice(0, 6).map((p) => {
                const idx = resolveStageIndex(p.state);
                const isBlocked = p.state === "blocked";
                return (
                  <Link key={p.id} to={`/projects/${p.id}#delivery-board`} className="block">
                    <div className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-surface-glass transition-all duration-180 group">
                      <span className="text-[14px] font-semibold text-foreground w-[180px] truncate shrink-0 group-hover:text-primary transition-colors">
                        {p.name}
                      </span>
                      <MiniPipeline currentStageIndex={idx} blocked={isBlocked} className="flex-1" />
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground/30 group-hover:text-foreground/60 transition-colors font-semibold shrink-0">
                        <Columns3 className="h-3 w-3" /> Board
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Asymmetric grid: 7 / 5 ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* LEFT — Founder Inbox */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl bg-card border border-border/40 px-5 py-5 min-h-[380px] flex flex-col">
              <FounderInbox items={inboxItems} />
            </div>
          </div>

          {/* RIGHT — Delivery + Risk + Live */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="rounded-2xl bg-card border border-border/40 px-5 py-5 min-h-[220px] flex flex-col">
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

            <div className="rounded-2xl bg-surface-raised border border-border/30 px-5 py-5 flex-1 min-h-[200px] flex flex-col">
              <LiveFlow events={events} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
