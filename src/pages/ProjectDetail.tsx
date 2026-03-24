import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useProject, useTasks, useApprovals, useArtifacts, useActivityEvents } from "@/hooks/use-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProjectTopBar } from "@/components/project-cockpit/ProjectTopBar";
import { BlueprintSnapshot } from "@/components/project-cockpit/BlueprintSnapshot";
import { TaskGraph } from "@/components/project-cockpit/TaskGraph";
import { EvidencePanel } from "@/components/project-cockpit/EvidencePanel";
import { ReleaseReadiness } from "@/components/project-cockpit/ReleaseReadiness";
import { ActivityTimeline } from "@/components/project-cockpit/ActivityTimeline";
import { RiskSummary } from "@/components/project-cockpit/RiskSummary";
import { ProductionFlow } from "@/components/ProductionFlow";

export default function ProjectDetail() {
  const { id } = useParams();
  const { data: project, isLoading } = useProject(id!);
  const { data: tasks = [] } = useTasks(id);
  const { data: approvals = [] } = useApprovals(id);
  const { data: artifacts = [] } = useArtifacts(id);
  const { data: events = [] } = useActivityEvents(id, 30);

  const { data: deployments = [] } = useQuery({
    queryKey: ["project-deploys", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("deployments")
        .select("id, environment, status, version_label, started_at, finished_at")
        .eq("project_id", id!)
        .order("started_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: domainBindings = [] } = useQuery({
    queryKey: ["project-domains", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("domain_bindings")
        .select("id, status, domain")
        .eq("project_id", id!)
        .limit(5);
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: checkSuites = [] } = useQuery({
    queryKey: ["project-ci", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("check_suites")
        .select("id, status, summary")
        .eq("project_id", id!)
        .order("started_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: failedRuns = [] } = useQuery({
    queryKey: ["project-failed-runs", id],
    queryFn: async () => {
      const taskIds = tasks.map((t) => t.id);
      if (taskIds.length === 0) return [];
      const { data } = await supabase
        .from("runs")
        .select("id, task_id, state")
        .in("task_id", taskIds.slice(0, 100))
        .eq("state", "failed");
      return data ?? [];
    },
    enabled: tasks.length > 0,
  });

  if (isLoading) {
    return (
      <AppLayout title="Loading…">
        <div className="flex items-center gap-2 p-6 text-muted-foreground text-[13px]">Loading project…</div>
      </AppLayout>
    );
  }
  if (!project) {
    return (
      <AppLayout title="Not found">
        <div className="flex items-center gap-2 p-6 text-muted-foreground text-[13px]">Project not found.</div>
      </AppLayout>
    );
  }

  const blockedCount = tasks.filter((t) => t.state === "blocked").length;
  const escalatedCount = tasks.filter((t) => t.state === "escalated").length;
  const pendingApprovals = approvals.filter((a) => a.state === "pending");
  const doneCount = tasks.filter((t) => t.state === "done").length;

  const riskLevel: "low" | "medium" | "high" =
    blockedCount > 0 || escalatedCount > 0 || failedRuns.length >= 3
      ? "high"
      : pendingApprovals.length > 0 || failedRuns.length > 0
        ? "medium"
        : "low";

  let nextAction: string | null = null;
  if (pendingApprovals.length > 0) nextAction = `${pendingApprovals.length} approval(s) pending`;
  else if (blockedCount > 0) nextAction = `${blockedCount} task(s) blocked`;
  else if (failedRuns.length > 0) nextAction = `${failedRuns.length} failed run(s)`;

  const hasStagingLive = deployments.some((d: any) => d.environment === "staging" && d.status === "live");
  const hasProductionLive = deployments.some((d: any) => d.environment === "production" && d.status === "live");
  const hasPatches = artifacts.some((a) => (a.artifact_type as string) === "code_patch");
  const hasPRs = artifacts.some((a) => (a.artifact_type as string) === "pull_request");

  // CI status
  const ciPassed = checkSuites.some((c: any) => c.status === "passed");
  const ciFailed = checkSuites.some((c: any) => c.status === "failed");

  const taskItems = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    state: t.state,
    domain: t.domain,
    roleName: (t as any).agent_roles?.name,
    roleCode: (t as any).agent_roles?.code,
    updatedAt: t.updated_at,
    artifactCount: artifacts.filter((a) => a.task_id === t.id).length,
  }));

  return (
    <AppLayout title={project.name} fullHeight>
      <div className="grid-content px-6 py-4 space-y-3 h-full overflow-auto">
        {/* ── PRODUCTION FLOW ── */}
        <ProductionFlow projectState={project.state} className="px-1" />

        {/* ── TOP HEADER ──────────────────────────────── */}
        <ProjectTopBar
          project={project}
          riskLevel={riskLevel}
          nextAction={nextAction}
          pendingApprovalsCount={pendingApprovals.length}
          hasStagingLive={hasStagingLive}
          hasProductionLive={hasProductionLive}
          tasksDone={doneCount}
          tasksTotal={tasks.length}
        />

        {/* ── ROW 1: Blueprint (8) + Release Readiness (4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-8 ds-card p-4">
            <BlueprintSnapshot
              purpose={project.purpose}
              founderNotes={project.founder_notes}
              currentPhase={project.current_phase}
              updatedAt={project.updated_at}
              acceptanceCriteriaCount={0}
              openQuestionsCount={0}
              riskLevel={riskLevel}
            />
          </div>
          <div className="lg:col-span-4 ds-card p-4 bg-secondary/30">
            <ReleaseReadiness
              ciStatus={ciFailed ? "failed" : ciPassed ? "passed" : "pending"}
              qaStatus={artifacts.some((a) => (a.artifact_type as string) === "test_result") ? "passed" : "pending"}
              domainBound={domainBindings.length > 0}
              deployEligible={hasStagingLive && ciPassed && !ciFailed}
              hasStagingLive={hasStagingLive}
              hasProductionLive={hasProductionLive}
            />
          </div>
        </div>

        {/* ── ROW 2: Task Flow (8) + Activity Timeline (4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3" style={{ minHeight: 400 }}>
          <div className="lg:col-span-8 ds-card p-4 flex flex-col min-h-0 overflow-hidden">
            <TaskGraph tasks={taskItems} projectId={id!} />
          </div>
          <div className="lg:col-span-4 ds-card p-4 flex flex-col min-h-0 overflow-hidden bg-secondary/20">
            <ActivityTimeline events={events} />
          </div>
        </div>

        {/* ── ROW 3: Evidence & Logs (full width) */}
        <div className="ds-card p-4">
          <EvidencePanel
            artifacts={artifacts.map((a) => ({
              id: a.id,
              title: a.title,
              artifact_type: a.artifact_type,
              state: a.state,
            }))}
            deployments={deployments.map((d: any) => ({
              id: d.id,
              environment: d.environment,
              status: d.status,
              version_label: d.version_label,
            }))}
            hasDomainBinding={domainBindings.length > 0}
          />
        </div>

        {/* ── ROW 4: Risk strip */}
        <RiskSummary
          blockedTasks={blockedCount}
          stalledRuns={0}
          pendingApprovals={pendingApprovals.length}
          escalations={escalatedCount}
          failedRuns={failedRuns.length}
        />
      </div>
    </AppLayout>
  );
}
