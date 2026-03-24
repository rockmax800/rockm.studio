import { AppLayout } from "@/components/AppLayout";
import { useProjects, useDashboardCounts, useApprovals, useActivityEvents, useTasks } from "@/hooks/use-data";
import { useSystemMode } from "@/hooks/use-system-mode";
import { useFounderInbox, useRiskAnalytics } from "@/hooks/use-founder-data";
import { StatusStrip } from "@/components/command-center/StatusStrip";
import { FounderInbox } from "@/components/command-center/FounderInbox";
import { ActiveDelivery } from "@/components/command-center/ActiveDelivery";
import { LiveFlow } from "@/components/command-center/LiveFlow";
import { HeroComposer } from "@/components/command-center/HeroComposer";
import { useQuery } from "@tanstack/react-query";
import { fetchWorkerNodes, fetchStalledEntities } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

export default function CommandCenter() {
  const { data: projects = [] } = useProjects();
  const { data: counts } = useDashboardCounts();
  const { data: approvals = [] } = useApprovals();
  const { data: events = [] } = useActivityEvents(undefined, 40);
  const { data: modeData } = useSystemMode();
  const { data: tasks = [] } = useTasks();
  const risk = useRiskAnalytics();
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

  const inProgressTasks = tasks.filter((t) => t.state === "in_progress").map(toDeliveryTask);
  const waitingReviewTasks = tasks.filter((t) => t.state === "waiting_review").map(toDeliveryTask);
  const blockedTasks = tasks.filter((t) => t.state === "blocked").map(toDeliveryTask);

  const onlineWorkers = workers.filter((w: any) => w.derived_status === "online").length;

  return (
    <AppLayout title="Command Center">
      <div className="max-w-[1800px] mx-auto space-y-2 h-[calc(100vh-4rem)] flex flex-col">
        {/* STATUS STRIP */}
        <StatusStrip
          systemMode={modeData?.mode ?? "production"}
          workerCount={onlineWorkers}
          activeRuns={stalled ? (counts?.failedRuns ?? 0) : 0}
          stalledRuns={stalled?.stalled_runs?.length ?? 0}
          pendingDecisions={counts?.pendingApprovals ?? 0}
          blockedTasks={counts?.blockedTasks ?? 0}
          deploysInProgress={activeDeploys.length}
        />

        {/* HERO COMPOSER */}
        <HeroComposer />

        {/* 3-COLUMN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 flex-1 min-h-0">
          {/* Column 1 — Founder Inbox */}
          <div className="rounded-lg bg-surface-overlay border border-border/40 p-2.5 flex flex-col min-h-0 shadow-lg shadow-background/50">
            <FounderInbox items={inboxItems} />
          </div>

          {/* Column 2 — Active Delivery */}
          <div className="rounded-lg bg-surface-overlay border border-border/40 p-2.5 flex flex-col min-h-0 shadow-lg shadow-background/50">
            <ActiveDelivery
              inProgress={inProgressTasks}
              waitingReview={waitingReviewTasks}
              blocked={blockedTasks}
            />
          </div>

          {/* Column 3 — Live Flow */}
          <div className="rounded-lg bg-surface-overlay border-l-2 border-l-primary/30 border border-border/40 p-2.5 flex flex-col min-h-0 shadow-lg shadow-background/50">
            <LiveFlow events={events} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
