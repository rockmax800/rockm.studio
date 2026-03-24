import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useProject, useTasks, useApprovals, useArtifacts } from "@/hooks/use-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProjectTopBar } from "@/components/project-cockpit/ProjectTopBar";
import { BlueprintSnapshot } from "@/components/project-cockpit/BlueprintSnapshot";
import { TaskGraph } from "@/components/project-cockpit/TaskGraph";
import { EvidencePanel } from "@/components/project-cockpit/EvidencePanel";
import { DeliveryLane } from "@/components/project-cockpit/DeliveryLane";
import { RiskSummary } from "@/components/project-cockpit/RiskSummary";

export default function ProjectDetail() {
  const { id } = useParams();
  const { data: project, isLoading } = useProject(id!);
  const { data: tasks = [] } = useTasks(id);
  const { data: approvals = [] } = useApprovals(id);
  const { data: artifacts = [] } = useArtifacts(id);

  // Deployments for this project
  const { data: deployments = [] } = useQuery({
    queryKey: ["project-deploys", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("deployments")
        .select("id, environment, status, version_label")
        .eq("project_id", id!)
        .order("started_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!id,
  });

  // Domain bindings
  const { data: domainBindings = [] } = useQuery({
    queryKey: ["project-domains", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("domain_bindings")
        .select("id")
        .eq("project_id", id!)
        .limit(1);
      return data ?? [];
    },
    enabled: !!id,
  });

  // Runs for failed count
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
        <p className="text-xs text-muted-foreground p-4">Loading…</p>
      </AppLayout>
    );
  }
  if (!project) {
    return (
      <AppLayout title="Not found">
        <p className="text-xs text-muted-foreground p-4">Project not found.</p>
      </AppLayout>
    );
  }

  const blockedCount = tasks.filter((t) => t.state === "blocked").length;
  const escalatedCount = tasks.filter((t) => t.state === "escalated").length;
  const pendingApprovals = approvals.filter((a) => a.state === "pending");
  const doneCount = tasks.filter((t) => t.state === "done").length;

  // Risk level
  const riskLevel: "low" | "medium" | "high" =
    blockedCount > 0 || escalatedCount > 0 || failedRuns.length >= 3
      ? "high"
      : pendingApprovals.length > 0 || failedRuns.length > 0
        ? "medium"
        : "low";

  // Next founder action
  let nextAction: string | null = null;
  if (pendingApprovals.length > 0) nextAction = `${pendingApprovals.length} approval(s) pending`;
  else if (blockedCount > 0) nextAction = `${blockedCount} task(s) blocked`;
  else if (failedRuns.length > 0) nextAction = `${failedRuns.length} failed run(s)`;

  // Staging/production status
  const hasStagingLive = deployments.some((d: any) => d.environment === "staging" && d.status === "live");
  const hasProductionLive = deployments.some((d: any) => d.environment === "production" && d.status === "live");

  // Delivery lane stages
  const hasPatches = artifacts.some((a) => a.artifact_type === "code_patch");
  const hasPRs = artifacts.some((a) => a.artifact_type === "pull_request");
  const hasCIPassed = true; // Inferred from deployments existing
  const deliveryStages = [
    { label: "Tasks", status: (tasks.length > 0 ? (doneCount === tasks.length && tasks.length > 0 ? "done" : "active") : "pending") as any },
    { label: "PR", status: (hasPRs ? "done" : hasPatches ? "active" : "pending") as any },
    { label: "CI", status: (hasPRs ? "done" : "pending") as any },
    { label: "Staging", status: (hasStagingLive ? "done" : deployments.some((d: any) => d.environment === "staging") ? "active" : "pending") as any },
    { label: "Approval", status: (pendingApprovals.length > 0 ? "active" : hasStagingLive ? "done" : "pending") as any },
    { label: "Production", status: (hasProductionLive ? "done" : "pending") as any },
  ];

  // Task items
  const taskItems = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    state: t.state,
    domain: t.domain,
    roleName: (t as any).agent_roles?.name,
    updatedAt: t.updated_at,
    artifactCount: artifacts.filter((a) => a.task_id === t.id).length,
  }));

  // Stalled runs (approximate: failed runs for this project)
  const stalledRunsCount = 0; // Would need heartbeat data, keep 0 for now

  return (
    <AppLayout title={project.name}>
      <div className="max-w-[1800px] mx-auto space-y-2.5 h-[calc(100vh-4rem)]">
        {/* Top Bar */}
        <ProjectTopBar
          project={project}
          riskLevel={riskLevel}
          nextAction={nextAction}
          pendingApprovalsCount={pendingApprovals.length}
          hasStagingLive={hasStagingLive}
          hasProductionLive={hasProductionLive}
        />

        {/* Blueprint + Delivery Lane + Risk row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
          <BlueprintSnapshot
            purpose={project.purpose}
            founderNotes={project.founder_notes}
            currentPhase={project.current_phase}
            updatedAt={project.updated_at}
            acceptanceCriteriaCount={0}
            openQuestionsCount={0}
            riskLevel={riskLevel}
          />
          <DeliveryLane stages={deliveryStages} />
          <RiskSummary
            blockedTasks={blockedCount}
            stalledRuns={stalledRunsCount}
            pendingApprovals={pendingApprovals.length}
            escalations={escalatedCount}
            failedRuns={failedRuns.length}
          />
        </div>

        {/* Main 2-column: Tasks + Evidence */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-2.5" style={{ height: "calc(100% - 11rem)" }}>
          <div className="border border-border/30 rounded-lg bg-card/30 p-3 flex flex-col min-h-0">
            <TaskGraph tasks={taskItems} projectId={id!} />
          </div>
          <div className="border border-border/30 rounded-lg bg-card/30 p-3 flex flex-col min-h-0">
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
        </div>
      </div>
    </AppLayout>
  );
}
