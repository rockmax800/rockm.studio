import { AppLayout } from "@/components/AppLayout";
import { useProjects, useDashboardCounts, useApprovals, useActivityEvents, useTasks } from "@/hooks/use-data";
import { useSystemMode } from "@/hooks/use-system-mode";
import { useFounderInbox } from "@/hooks/use-founder-data";
import { FounderInbox } from "@/components/command-center/FounderInbox";
import { ActiveDelivery } from "@/components/command-center/ActiveDelivery";
import { LiveFlow } from "@/components/command-center/LiveFlow";
import { HeroComposer } from "@/components/command-center/HeroComposer";
import { RiskHealth } from "@/components/command-center/RiskHealth";
import { useQuery } from "@tanstack/react-query";
import { fetchWorkerNodes, fetchStalledEntities } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { ProductionFlow } from "@/components/ProductionFlow";

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

  return (
    <AppLayout title="Nerve Center">
      <div className="grid-content space-y-5 pb-8">
        {/* ═══ SECTION 1 — PRODUCTION FLOW BAR ═══════════════════ */}
        <div className="rounded-2xl bg-card border border-border px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest">
              Production Pipeline
            </h2>
            <span className="text-[12px] font-mono text-muted-foreground/50">
              {modeData?.mode ?? "production"}
            </span>
          </div>
          <ProductionFlow className="px-0" />
        </div>

        {/* ═══ SECTION 2 — HERO ACTION ZONE ══════════════════════ */}
        <HeroComposer />

        {/* ═══ SECTION 3 + 4 — ASYMMETRIC 7/5 GRID ══════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" style={{ minHeight: "calc(100vh - 380px)" }}>

          {/* LEFT 7 — FOUNDER ACTION BOARD */}
          <div className="lg:col-span-7 flex flex-col gap-5 min-h-0">
            <div className="rounded-2xl bg-card border border-border px-5 py-5 flex-1 min-h-0 overflow-hidden flex flex-col shadow-sm"
              style={{ minHeight: 340 }}>
              <FounderInbox items={inboxItems} />
            </div>
          </div>

          {/* RIGHT 5 — DELIVERY SNAPSHOT */}
          <div className="lg:col-span-5 flex flex-col gap-4 min-h-0">

            {/* A. Active Projects + Delivery */}
            <div className="rounded-2xl bg-card border border-border px-4 py-4 overflow-hidden flex flex-col shadow-sm"
              style={{ minHeight: 220 }}>
              <ActiveDelivery
                inProgress={inProgressTasks}
                waitingReview={waitingReviewTasks}
                blocked={blockedTasks}
                activeProjects={activeProjects}
              />
            </div>

            {/* B. Risk & Stalled */}
            <RiskHealth
              blocked={counts?.blockedTasks ?? 0}
              escalated={escalatedCount}
              failedRuns={failedRuns}
              failedDeploys={0}
              stalledRuns={stalled?.stalled_runs?.length ?? 0}
            />

            {/* C. Live Events */}
            <div className="rounded-2xl bg-secondary/30 border border-border/60 px-4 py-4 flex-1 min-h-0 overflow-hidden flex flex-col">
              <LiveFlow events={events} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
