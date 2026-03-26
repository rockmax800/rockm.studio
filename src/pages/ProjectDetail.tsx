import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useProject, useTasks, useApprovals, useArtifacts, useActivityEvents } from "@/hooks/use-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BlueprintSnapshot } from "@/components/project-cockpit/BlueprintSnapshot";
import { TaskGraph } from "@/components/project-cockpit/TaskGraph";
import { EvidencePanel } from "@/components/project-cockpit/EvidencePanel";
import { ReleaseReadiness } from "@/components/project-cockpit/ReleaseReadiness";
import { ActivityTimeline } from "@/components/project-cockpit/ActivityTimeline";
import { RiskSummary } from "@/components/project-cockpit/RiskSummary";
import { DeliveryBoard } from "@/components/project-cockpit/DeliveryBoard";
import { ProjectSetupPanel } from "@/components/project-cockpit/ProjectSetupPanel";
import { VerificationRail } from "@/components/project-cockpit/VerificationRail";
import { ProjectGuidancePack } from "@/components/project-cockpit/ProjectGuidancePack";
import { PlanningPackageSummary } from "@/components/project-cockpit/PlanningPackageSummary";
import { CtoReadinessGate } from "@/components/project-cockpit/CtoReadinessGate";
import { deriveGuidancePack } from "@/types/project-guidance";
import { StatusBadge } from "@/components/StatusBadge";
import { PipelineBar, resolveStageIndex } from "@/components/PipelineBar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ExecutionPolicyBadge } from "@/components/ui/execution-policy-badge";
import { RunTraceMetaCard } from "@/components/system/RunTraceMetaCard";
import {
  ArrowLeft, Rocket, Pause, Building2, GitBranch,
  Upload, Clock, Server, Globe, Shield, Zap,
  AlertTriangle, CheckCircle2, FileText, ChevronRight, ClipboardList, Cpu, Target,
  Layers, Activity, Package, History, Columns3, Settings2, ShieldCheck, BookOpen,
} from "lucide-react";
import { ResearchModeBadge } from "@/components/ui/research-mode-badge";
import { CtoBacklogDraftPanel } from "@/components/intake/CtoBacklogDraftPanel";
import { AiTaskDraftPanel } from "@/components/intake/AiTaskDraftPanel";
import { EngineeringSlicesPanel } from "@/components/project-cockpit/EngineeringSlicesPanel";
import { TaskSpecDraftsPanel } from "@/components/project-cockpit/TaskSpecDraftsPanel";
import { ExecutionPlanPanel } from "@/components/project-cockpit/ExecutionPlanPanel";
import { TaskSpecSanityPanel } from "@/components/project-cockpit/TaskSpecSanityPanel";
import { CtoConformancePanel } from "@/components/project-cockpit/CtoConformancePanel";
import { MaterializeTasksPanel } from "@/components/project-cockpit/MaterializeTasksPanel";
import { CtoOverview } from "@/components/project-cockpit/CtoOverview";
import { CtoHandoffCard } from "@/components/project-cockpit/CtoHandoffCard";
import { buildHandoffContract } from "@/lib/cto-handoff";
import type { CTOBacklogCardDraft, AITaskDraft } from "@/types/front-office-planning";
import type { EngineeringSliceDraft } from "@/types/engineering-slices";
import type { TaskSpecDraft } from "@/types/taskspec-draft";
import type { ClarificationRequest } from "@/types/clarification-request";
import { createClarificationRequest } from "@/types/clarification-request";
import { ClarificationRequestCard } from "@/components/project-cockpit/ClarificationRequestCard";
import { decomposeBacklogToTasks } from "@/lib/ai-task-decomposition";
import { compileTaskSpecDrafts } from "@/lib/taskspec-draft-compiler";
import { buildExecutionPlan } from "@/lib/execution-planner";
import { validateTaskSpecDrafts } from "@/lib/taskspec-sanity";
import { evaluateConformance } from "@/lib/cto-conformance";
import { checkMaterializationGate, materializeDeliveryTasks } from "@/lib/materialize-delivery-tasks";
import {
  usePersistedSlices, usePersistedTaskSpecs, usePersistedPlan, usePersistedConformance,
  useSaveSlices, useSaveTaskSpecs, useSaveExecutionPlan,
} from "@/hooks/use-ai-cto-planning";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";

const RISK_COLORS = {
  low: "bg-status-green/10 text-status-green",
  medium: "bg-status-amber/10 text-status-amber",
  high: "bg-destructive/10 text-destructive",
};

function SectionHeader({ icon: Icon, title, count }: { icon: React.ElementType; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.8} />
      <h2 className="text-[16px] font-bold text-foreground tracking-tight">{title}</h2>
      {count !== undefined && (
        <span className="text-[11px] font-mono font-bold text-muted-foreground/40 ml-1">{count}</span>
      )}
    </div>
  );
}

function MetricChip({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("text-[13px] font-bold font-mono tabular-nums", alert ? "text-status-amber" : "text-foreground")}>{value}</span>
      <span className="text-[11px] text-muted-foreground/50">{label}</span>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const [ctoBacklogCards, setCtoBacklogCards] = useState<CTOBacklogCardDraft[]>([]);
  const [engineeringSlices, setEngineeringSlices] = useState<EngineeringSliceDraft[]>([]);
  const [clarificationRequests, setClarificationRequests] = useState<ClarificationRequest[]>([]);
  const aiTaskDrafts = useMemo(() => decomposeBacklogToTasks(ctoBacklogCards), [ctoBacklogCards]);
  const taskSpecDrafts = useMemo(() => compileTaskSpecDrafts(engineeringSlices), [engineeringSlices]);
  const executionPlanResult = useMemo(() => buildExecutionPlan(taskSpecDrafts), [taskSpecDrafts]);
  const sanityReport = useMemo(() => validateTaskSpecDrafts(taskSpecDrafts, executionPlanResult.plan), [taskSpecDrafts, executionPlanResult.plan]);
  const conformanceSummary = useMemo(() => evaluateConformance(taskSpecDrafts), [taskSpecDrafts]);
  const cardTitles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of ctoBacklogCards) map[c.id] = c.featureSlice;
    return map;
  }, [ctoBacklogCards]);
  const { data: project, isLoading } = useProject(id!);
  const { data: tasks = [] } = useTasks(id);
  const { data: approvals = [] } = useApprovals(id);
  const { data: artifacts = [] } = useArtifacts(id);
  const { data: events = [] } = useActivityEvents(id, 30);

  // ── Persisted CTO planning artifacts ──
  const blueprintContractId = (project as any)?.blueprint_contract_id ?? null;
  const { data: persistedSlices } = usePersistedSlices(blueprintContractId);
  const { data: persistedTaskSpecs } = usePersistedTaskSpecs(blueprintContractId);
  const { data: persistedPlan } = usePersistedPlan(blueprintContractId);
  const { data: persistedConformance } = usePersistedConformance(id ?? null);
  const saveSlices = useSaveSlices(blueprintContractId);
  const saveTaskSpecs = useSaveTaskSpecs(blueprintContractId);
  const saveExecPlan = useSaveExecutionPlan(blueprintContractId);

  // Seed local state from persisted data on first load (once only)
  const seededRef = useRef(false);
  useEffect(() => {
    if (!seededRef.current && persistedSlices && persistedSlices.length > 0 && engineeringSlices.length === 0) {
      seededRef.current = true;
      setEngineeringSlices(persistedSlices);
    }
  }, [persistedSlices]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-persist — avoids infinite mutation loops.
  // Only persist when the serialized content actually changes.
  const lastPersistedSlicesRef = useRef<string>("");
  const lastPersistedSpecsRef = useRef<string>("");
  const lastPersistedPlanRef = useRef<string>("");

  useEffect(() => {
    if (!blueprintContractId || engineeringSlices.length === 0) return;
    const key = JSON.stringify(engineeringSlices.map((s) => s.id).sort());
    if (key === lastPersistedSlicesRef.current) return;
    lastPersistedSlicesRef.current = key;
    saveSlices.mutate(engineeringSlices);
  }, [engineeringSlices, blueprintContractId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!blueprintContractId || taskSpecDrafts.length === 0) return;
    const key = JSON.stringify(taskSpecDrafts.map((d) => d.id).sort());
    if (key === lastPersistedSpecsRef.current) return;
    lastPersistedSpecsRef.current = key;
    saveTaskSpecs.mutate(taskSpecDrafts);
  }, [taskSpecDrafts, blueprintContractId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!blueprintContractId || executionPlanResult.plan.batches.length === 0) return;
    const key = JSON.stringify(executionPlanResult.plan.batches.map((b) => b.batchNumber));
    if (key === lastPersistedPlanRef.current) return;
    lastPersistedPlanRef.current = key;
    saveExecPlan.mutate(executionPlanResult.plan);
  }, [executionPlanResult.plan, blueprintContractId]); // eslint-disable-line react-hooks/exhaustive-deps

  const planningApproved = approvals.some(
    (a) => a.approval_type === "blueprint_approval" && a.state === "decided" && (a as any).decision === "approved"
  );
  const materializationGate = useMemo(() => checkMaterializationGate({
    projectExists: !!project,
    projectState: project?.state ?? "draft",
    planningApproved,
    sanityReport,
    draftsCount: taskSpecDrafts.length,
  }), [project, planningApproved, sanityReport, taskSpecDrafts]);

  const handleMaterialize = useCallback(
    () => materializeDeliveryTasks(id!, taskSpecDrafts),
    [id, taskSpecDrafts],
  );

  const handleCreateClarification = useCallback(
    (moduleId: string, moduleName: string, ambiguity: string, requested: string) => {
      const req = createClarificationRequest({
        projectId: id!,
        blueprintId: blueprintContractId,
        affectedModuleId: moduleId,
        affectedModuleName: moduleName,
        ambiguityDescription: ambiguity,
        requestedClarification: requested,
      });
      setClarificationRequests((prev) => [...prev, req]);
    },
    [id, blueprintContractId],
  );

  const handleResolveClarification = useCallback((reqId: string, note: string) => {
    setClarificationRequests((prev) =>
      prev.map((r) => r.id === reqId ? { ...r, status: "resolved" as const, resolvedAt: new Date().toISOString(), resolverNote: note } : r),
    );
  }, []);

  const handleDismissClarification = useCallback((reqId: string) => {
    setClarificationRequests((prev) =>
      prev.map((r) => r.id === reqId ? { ...r, status: "dismissed" as const, resolvedAt: new Date().toISOString() } : r),
    );
  }, []);

  const { data: deployments = [] } = useQuery({
    queryKey: ["project-deploys", id],
    queryFn: async () => {
      const { data } = await supabase.from("deployments")
        .select("id, environment, status, version_label, started_at, finished_at")
        .eq("project_id", id!).order("started_at", { ascending: false }).limit(10);
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: domainBindings = [] } = useQuery({
    queryKey: ["project-domains", id],
    queryFn: async () => {
      const { data } = await supabase.from("domain_bindings").select("id, status, domain")
        .eq("project_id", id!).limit(5);
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: checkSuites = [] } = useQuery({
    queryKey: ["project-ci", id],
    queryFn: async () => {
      const { data } = await supabase.from("check_suites").select("id, status, summary")
        .eq("project_id", id!).order("started_at", { ascending: false }).limit(5);
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: failedRuns = [] } = useQuery({
    queryKey: ["project-failed-runs", id],
    queryFn: async () => {
      const taskIds = tasks.map((t) => t.id);
      if (taskIds.length === 0) return [];
      const { data } = await supabase.from("runs").select("id, task_id, state")
        .in("task_id", taskIds.slice(0, 100)).eq("state", "failed");
      return data ?? [];
    },
    enabled: tasks.length > 0,
  });

  const { data: repositories = [] } = useQuery({
    queryKey: ["project-repos", id],
    queryFn: async () => {
      const { data } = await supabase.from("repositories").select("id, repo_name, repo_owner, provider, status")
        .eq("project_id", id!).limit(5);
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: pullRequests = [] } = useQuery({
    queryKey: ["project-prs", id],
    queryFn: async () => {
      const { data } = await supabase.from("pull_requests").select("id, status")
        .eq("project_id", id!).limit(50);
      return data ?? [];
    },
    enabled: !!id,
  });

  /* ── Loading / Not found ── */
  if (isLoading) return (
    <AppLayout title="Loading…">
      <div className="px-6 py-10 space-y-4 max-w-[1400px]">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl bg-card border border-border/30 h-24 animate-pulse" />
        ))}
      </div>
    </AppLayout>
  );

  if (!project) return (
    <AppLayout title="Not found">
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <FileText className="h-6 w-6 text-muted-foreground/30" />
        </div>
        <h2 className="text-[18px] font-bold text-foreground">Project not found</h2>
        <p className="text-[13px] text-muted-foreground mt-1">This project may have been removed or doesn't exist.</p>
        <Link to="/projects" className="mt-5">
          <Button variant="outline" className="rounded-xl text-[13px] h-9 gap-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Projects
          </Button>
        </Link>
      </div>
    </AppLayout>
  );

  /* ── Computed ── */
  const blockedCount = tasks.filter((t) => t.state === "blocked").length;
  const escalatedCount = tasks.filter((t) => t.state === "escalated").length;
  const pendingApprovals = approvals.filter((a) => a.state === "pending");
  const doneCount = tasks.filter((t) => t.state === "done").length;
  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  // Evidence gap detection — project-level research readiness
  const hasOpenApprovals = pendingApprovals.length > 0;
  const hasFailures = failedRuns.length > 0;
  const isEarlyProject = progress < 20 && tasks.length > 0;
  const hasEvidenceGaps = hasOpenApprovals || hasFailures || (isEarlyProject && blockedCount > 0);
  const projectResearchPhase = hasEvidenceGaps ? "evidence-gathering" as const
    : isEarlyProject ? "researching" as const
    : "ready-to-execute" as const;
  const evidenceDetail = hasEvidenceGaps
    ? `${pendingApprovals.length > 0 ? `${pendingApprovals.length} pending approval(s)` : ""}${hasFailures ? `${pendingApprovals.length > 0 ? ", " : ""}${failedRuns.length} failed run(s) need investigation` : ""}${isEarlyProject && blockedCount > 0 ? ` · ${blockedCount} blocked task(s)` : ""}`
    : isEarlyProject ? "Project is early — verify assumptions before scaling execution."
    : undefined;

  const riskLevel: "low" | "medium" | "high" =
    blockedCount > 0 || escalatedCount > 0 || failedRuns.length >= 3 ? "high"
      : pendingApprovals.length > 0 || failedRuns.length > 0 ? "medium" : "low";

  const hasStagingLive = deployments.some((d: any) => d.environment === "staging" && d.status === "live");
  const hasProductionLive = deployments.some((d: any) => d.environment === "production" && d.status === "live");
  const ciPassed = checkSuites.some((c: any) => c.status === "passed");
  const ciFailed = checkSuites.some((c: any) => c.status === "failed");


  const taskItems = tasks.map((t) => ({
    id: t.id, title: t.title, state: t.state, domain: t.domain,
    roleName: (t as any).agent_roles?.name, roleCode: (t as any).agent_roles?.code,
    updatedAt: t.updated_at,
    artifactCount: artifacts.filter((a) => a.task_id === t.id).length,
  }));

  const stageIdx = resolveStageIndex(project.state);
  const blockedStageIdx = blockedCount > 0 ? 4 : undefined;

  /* ── Next Required Action ── */
  type NextAction = { label: string; description: string; icon: React.ElementType; variant: "destructive" | "warning" | "default"; linkTo?: string };
  const nextActions: NextAction[] = [];

  if (pendingApprovals.length > 0) {
    nextActions.push({ label: "Approve", description: `${pendingApprovals.length} approval(s) pending`, icon: Shield, variant: "warning", linkTo: "/founder" });
  }
  if (blockedCount > 0) {
    nextActions.push({ label: "Unblock", description: `${blockedCount} task(s) blocked`, icon: AlertTriangle, variant: "destructive" });
  }
  if (failedRuns.length > 0) {
    nextActions.push({ label: "Fix Failures", description: `${failedRuns.length} failed run(s)`, icon: AlertTriangle, variant: "destructive" });
  }
  if (ciPassed && !ciFailed && hasStagingLive) {
    nextActions.push({ label: "Deploy to Production", description: "All checks passed, staging live", icon: Rocket, variant: "default" });
  } else if (ciPassed && !hasStagingLive) {
    nextActions.push({ label: "Deploy to Staging", description: "CI passed, ready to stage", icon: Upload, variant: "default" });
  }
  if (nextActions.length === 0 && progress < 100) {
    nextActions.push({ label: "Continue Execution", description: `${progress}% complete`, icon: Zap, variant: "default" });
  }
  if (progress === 100 && !hasProductionLive) {
    nextActions.push({ label: "Finalize Release", description: "All tasks done", icon: CheckCircle2, variant: "default" });
  }

  const ACTION_STYLES = {
    destructive: "border-destructive/25 bg-destructive/[0.03]",
    warning: "border-status-amber/25 bg-status-amber/[0.03]",
    default: "border-primary/20 bg-primary/[0.03]",
  };
  const ACTION_ICON_STYLES = {
    destructive: "text-destructive bg-destructive/10",
    warning: "text-status-amber bg-status-amber/10",
    default: "text-primary bg-primary/10",
  };

  return (
    <AppLayout title={project.name} fullHeight>
      <ScrollArea className="h-full">
        <div className="px-6 py-5 space-y-5 max-w-[1400px] mx-auto">

          {/* ══ PIPELINE BAR ══ */}
          <div className="rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden px-6 py-4">
            <PipelineBar currentStageIndex={stageIdx} blockedStageIndex={blockedStageIdx} projectId={id} />
          </div>

          {/* ══ EVIDENCE READINESS ══ */}
          {projectResearchPhase !== "ready-to-execute" && (
            <ResearchModeBadge phase={projectResearchPhase} detail={evidenceDetail} />
          )}

          {/* ══ TOP HEADER ══ */}
          <div className="rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden">
            <div className="px-6 py-5">
              {/* Identity row */}
              <div className="flex items-center gap-3 flex-wrap">
                <Link to="/projects">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-xl">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <h1 className="text-[28px] font-bold tracking-[-0.025em] text-foreground truncate leading-none">
                  {project.name}
                </h1>
                <StatusBadge state={project.state} />
                <span className={cn("px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider", RISK_COLORS[riskLevel])}>
                  {riskLevel} risk
                </span>
                <div className="flex items-center gap-3 ml-2">
                  <span className={cn("flex items-center gap-1.5 text-[11px] font-mono font-bold", hasStagingLive ? "text-status-green" : "text-muted-foreground/25")}>
                    <Server className="h-3 w-3" /> STG {hasStagingLive ? "●" : "○"}
                  </span>
                  <span className={cn("flex items-center gap-1.5 text-[11px] font-mono font-bold", hasProductionLive ? "text-status-green" : "text-muted-foreground/25")}>
                    <Globe className="h-3 w-3" /> PRD {hasProductionLive ? "●" : "○"}
                  </span>
                </div>
                <div className="flex-1" />
                <ExecutionPolicyBadge label="Current execution environment" className="mr-3" />
                <div className="flex items-center gap-2">
                  {pendingApprovals.length > 0 && (
                    <Link to="/founder">
                      <Button size="sm" className="h-9 text-[13px] gap-2 bg-foreground text-background hover:bg-foreground/90 rounded-xl font-bold px-5">
                        <Shield className="h-4 w-4" /> Review {pendingApprovals.length}
                      </Button>
                    </Link>
                  )}
                  <Button variant="outline" size="sm" className="h-9 text-[13px] gap-2 px-4 rounded-xl font-semibold border-border/60">
                    <Upload className="h-3.5 w-3.5" /> Deploy Staging
                  </Button>
                  <Button size="sm" className="h-9 text-[13px] gap-2 px-4 bg-foreground text-background hover:bg-foreground/90 rounded-xl font-bold" disabled={!hasStagingLive}>
                    <Rocket className="h-3.5 w-3.5" /> Production
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl border-status-amber/30 text-status-amber hover:bg-status-amber/5">
                    <Pause className="h-4 w-4" />
                  </Button>
                  <Link to="/office">
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-foreground">
                      <Building2 className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-foreground">
                    <GitBranch className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Control strip */}
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border/20 flex-wrap">
                <div className="flex items-center gap-3 min-w-[200px] max-w-[280px]">
                  <span className="text-[12px] font-mono text-muted-foreground shrink-0">{doneCount}/{tasks.length}</span>
                  <Progress value={progress} className="h-2 flex-1" />
                  <span className="text-[14px] font-bold font-mono text-foreground tabular-nums">{progress}%</span>
                </div>
                <div className="h-4 w-px bg-border/30" />
                <MetricChip label="pending" value={pendingApprovals.length} alert={pendingApprovals.length > 0} />
                <MetricChip label="failed" value={failedRuns.length} alert={failedRuns.length > 0} />
                <MetricChip label="blocked" value={blockedCount} alert={blockedCount > 0} />
                <MetricChip label="domains" value={domainBindings.length} />
                <MetricChip label="CI" value={ciFailed ? "FAIL" : ciPassed ? "PASS" : "—"} alert={ciFailed} />
                <div className="flex-1" />
                <Link to={`/system?tab=audit&project=${id}`}>
                  <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground px-2">
                    <History className="h-3 w-3" /> Trace history
                  </Button>
                </Link>
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground/40">
                  <Zap className="h-3.5 w-3.5" />
                  <span className="font-mono font-bold text-foreground/40">—</span>
                  <span>tokens</span>
                </div>
              </div>
            </div>

            {/* Risk strip */}
            <div className="px-6 py-2.5 border-t border-border/20 bg-muted/20">
              <RiskSummary
                blockedTasks={blockedCount}
                stalledRuns={0}
                pendingApprovals={pendingApprovals.length}
                escalations={escalatedCount}
                failedRuns={failedRuns.length}
              />
            </div>
          </div>

          {/* ══ NEXT REQUIRED ACTION ══ */}
          {nextActions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-muted-foreground/40" strokeWidth={1.8} />
                <h2 className="text-[14px] font-bold text-foreground tracking-tight uppercase">Next Required Action</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {nextActions.slice(0, 3).map((action, i) => (
                  <div key={i} className={cn(
                    "rounded-2xl border px-5 py-4 flex items-center gap-4 transition-all hover:shadow-sm group cursor-default",
                    ACTION_STYLES[action.variant],
                  )}>
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", ACTION_ICON_STYLES[action.variant])}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[15px] font-bold text-foreground block leading-tight">{action.label}</span>
                      <span className="text-[12px] text-muted-foreground block mt-0.5">{action.description}</span>
                    </div>
                    {action.linkTo && (
                      <Link to={action.linkTo}>
                        <Button size="sm" variant="outline" className="h-8 text-[11px] rounded-lg gap-1 border-border/50 opacity-70 group-hover:opacity-100 transition-opacity">
                          Open <ChevronRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ ROW 1 — BLUEPRINT + RELEASE READINESS ══ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 rounded-2xl bg-card border border-border/40 shadow-sm p-5">
              <SectionHeader icon={FileText} title="Blueprint Summary" />
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
            <div className="lg:col-span-4 rounded-2xl bg-card border border-border/40 shadow-sm p-5">
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

          {/* ══ PROJECT GUIDANCE PACK ══ */}
          <div className="rounded-2xl bg-card border border-border/40 shadow-sm p-5">
            <SectionHeader icon={BookOpen} title="Project Guidance Pack" />
            <p className="text-[11px] text-muted-foreground/40 -mt-2 mb-4">
              Operating rules and quality expectations for this project — derived from current state.
            </p>
            <ProjectGuidancePack
              guidancePack={deriveGuidancePack(project, {
                taskCount: tasks.length,
                blockedCount: blockedCount,
                failedRunCount: failedRuns.length,
                pendingApprovalCount: pendingApprovals.length,
                hasCI: ciPassed || ciFailed,
                hasDomain: domainBindings.length > 0,
                riskLevel: riskLevel,
              })}
            />
          </div>

          {/* ══ PLANNING PACKAGE SUMMARY — Upstream Quality Audit ══ */}
          <div className="rounded-2xl bg-card border border-border/40 shadow-sm p-5">
            <SectionHeader icon={Target} title="Planning Package" />
            <p className="text-[11px] text-muted-foreground/40 -mt-2 mb-4">
              Upstream planning quality audit — clarification, decomposition, backlog, and task drafts.
            </p>
            <PlanningPackageSummary
              blueprintContractId={(project as any).blueprint_contract_id ?? null}
              intakeRequestId={(project as any).intake_request_id ?? null}
            />
          </div>

          {/* ══ CTO HANDOFF CONTRACT — Lead → CTO Planning Boundary ══ */}
          <div className="rounded-2xl bg-card border border-border/40 shadow-sm p-5">
            <SectionHeader icon={Target} title="CTO Handoff Contract" />
            <p className="text-[11px] text-muted-foreground/40 -mt-2 mb-4">
              Formal handoff from Company Lead planning to AI CTO engineering — shows what is ready and what is missing.
            </p>
            {(() => {
              const handoff = buildHandoffContract({
                blueprintId: blueprintContractId,
                clarificationComplete: true, // project exists = clarification done
                modules: ctoBacklogCards.map(c => ({ name: c.moduleName })),
                dependencyEdgeCount: 0,
                independenceAcknowledged: false,
                deliveryMode: null,
                mvpReductionComplete: true,
                isMvpProject: false,
                approvedByFounder: planningApproved,
                backlogCardCount: ctoBacklogCards.length,
                taskDraftCount: aiTaskDrafts.length,
              });
              return <CtoHandoffCard contract={handoff} />;
            })()}
          </div>

          {/* ══ CTO ENGINEERING OVERVIEW — Founder Health Summary ══ */}
          <div className="rounded-2xl bg-card border border-border/40 shadow-sm p-5">
            <SectionHeader icon={Cpu} title="CTO Engineering Overview" />
            <p className="text-[11px] text-muted-foreground/40 -mt-2 mb-4">
              Founder-level engineering health summary — click any metric to jump to its detail panel.
            </p>
            <CtoOverview
              readinessStatus="blocked"
              readinessPassedCount={0}
              readinessTotalCount={0}
              slicesCount={engineeringSlices.length}
              draftsCount={taskSpecDrafts.length}
              executionPlan={executionPlanResult.plan}
              sanityReport={sanityReport}
              conformanceSummary={conformanceSummary}
              projectId={id!}
            />
          </div>

          {/* ══ CTO READINESS GATE — Engineering Decomposition Prerequisite ══ */}
          <div id="cto-readiness-gate" className="rounded-2xl bg-card border border-border/40 shadow-sm p-5">
            <SectionHeader icon={Cpu} title="CTO Readiness Gate" />
            <p className="text-[11px] text-muted-foreground/40 -mt-2 mb-4">
              AI CTO engineering decomposition prerequisites — validates planning maturity before TaskSpec compilation.
            </p>
            <CtoReadinessGate
              blueprintContractId={(project as any).blueprint_contract_id ?? null}
              intakeRequestId={(project as any).intake_request_id ?? null}
            />
          </div>

          {/* ══ ENGINEERING SLICES — AI CTO Normalization Output ══ */}
          {engineeringSlices.length > 0 && (
            <div id="cto-engineering-slices" className="rounded-2xl bg-card border border-border/40 shadow-sm p-5">
              <SectionHeader icon={Layers} title="Engineering Slices" count={engineeringSlices.length} />
              <p className="text-[11px] text-muted-foreground/40 -mt-2 mb-4">
                Bounded engineering units normalized from planning modules — draft until launch gate.
              </p>
              <EngineeringSlicesPanel
                slices={engineeringSlices}
                onSlicesChange={setEngineeringSlices}
                locked={project.state !== "draft" && project.state !== "scoped"}
              />
            </div>
          )}

          {/* ══ TASKSPEC DRAFTS — AI CTO Compilation Output ══ */}
          {taskSpecDrafts.length > 0 && (
            <div id="cto-taskspec-drafts" className="rounded-2xl bg-card border border-border/40 shadow-sm p-5">
              <SectionHeader icon={FileText} title="TaskSpec Drafts" count={taskSpecDrafts.length} />
              <p className="text-[11px] text-muted-foreground/40 -mt-2 mb-4">
                Pre-delivery engineering planning — compiled from engineering slices into canonical TaskSpec format.
              </p>
              <TaskSpecDraftsPanel drafts={taskSpecDrafts} />
            </div>
          )}

          {/* ══ EXECUTION PLAN — Dependency-Ordered Batch Sequence ══ */}
          {taskSpecDrafts.length > 0 && (
            <div id="cto-execution-plan" className="rounded-2xl bg-card border border-border/40 shadow-sm p-5">
              <SectionHeader icon={Activity} title="Execution Plan" count={executionPlanResult.plan.batches.length} />
              <p className="text-[11px] text-muted-foreground/40 -mt-2 mb-4">
                Dependency-ordered batch sequence — draft until launch gate. Founder may reorder.
              </p>
              <ExecutionPlanPanel
                plan={executionPlanResult.plan}
                warnings={executionPlanResult.warnings}
                drafts={taskSpecDrafts}
              />
            </div>
          )}

          {/* ══ CTO SANITY CHECK — Pre-Delivery Quality Gate ══ */}
          {taskSpecDrafts.length > 0 && (
            <div id="cto-sanity-check" className="rounded-2xl bg-card border border-border/40 shadow-sm p-5">
              <SectionHeader icon={ShieldCheck} title="CTO Sanity Check" count={taskSpecDrafts.length} />
              <p className="text-[11px] text-muted-foreground/40 -mt-2 mb-4">
                Pre-delivery quality gate — must pass before live task materialization.
              </p>
              <TaskSpecSanityPanel report={sanityReport} />
            </div>
          )}

          {/* ══ CTO CONFORMANCE — Post-Run Engineering Guardrail ══ */}
          {taskSpecDrafts.length > 0 && (
            <div id="cto-conformance" className="rounded-2xl bg-card border border-border/40 shadow-sm p-5">
              <SectionHeader icon={ShieldCheck} title="CTO Conformance" count={conformanceSummary.totalDrafts} />
              <p className="text-[11px] text-muted-foreground/40 -mt-2 mb-4">
                Post-run conformance evaluation — engineering guardrail, does not replace Review/QA.
              </p>
              <CtoConformancePanel summary={conformanceSummary} />
            </div>
          )}

          {/* ══ MATERIALIZE DELIVERY TASKS — Founder-Only Launch Action ══ */}
          {taskSpecDrafts.length > 0 && (
            <div className="rounded-2xl bg-card border border-border/40 shadow-sm p-5">
              <SectionHeader icon={Rocket} title="Materialize Delivery Tasks" count={taskSpecDrafts.length} />
              <p className="text-[11px] text-muted-foreground/40 -mt-2 mb-4">
                Controlled transition from planning drafts to live Delivery Plane tasks — founder confirmation required.
              </p>
              <MaterializeTasksPanel
                gate={materializationGate}
                draftsCount={taskSpecDrafts.length}
                onMaterialize={handleMaterialize}
              />
            </div>
          )}

          {ctoBacklogCards.length > 0 && (
            <div className="rounded-2xl bg-card border border-border/40 shadow-sm p-5">
              <SectionHeader icon={ClipboardList} title="CTO Backlog Draft" count={ctoBacklogCards.length} />
              <p className="text-[11px] text-muted-foreground/40 -mt-2 mb-4">
                Pre-delivery planning artifact — live Delivery tasks are created from approved cards after launch gate.
              </p>
              <CtoBacklogDraftPanel
                cards={ctoBacklogCards}
                onCardsChange={setCtoBacklogCards}
                locked={project.state !== "draft" && project.state !== "scoped"}
              />
            </div>
          )}

          {/* ══ AI TASK DRAFTS — Atomic Pre-Delivery Planning ══ */}
          {aiTaskDrafts.length > 0 && (
            <div className="rounded-2xl bg-card border border-border/40 shadow-sm p-5">
              <SectionHeader icon={Cpu} title="AI Task Drafts" count={aiTaskDrafts.length} />
              <p className="text-[11px] text-muted-foreground/40 -mt-2 mb-4">
                Atomic task drafts decomposed from CTO Backlog — each affects one layer only. Becomes live Delivery tasks after launch gate.
              </p>
              <AiTaskDraftPanel
                drafts={aiTaskDrafts}
                cardTitles={cardTitles}
              />
            </div>
          )}

          {/* ══ DELIVERY BOARD ══ */}
          <div id="delivery-board" className="rounded-2xl bg-card border-2 border-primary/20 shadow-sm p-5 scroll-mt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Columns3 className="h-5 w-5 text-primary" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[16px] font-bold text-foreground tracking-tight">Delivery Board</h2>
                <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                  Task movement across delivery states — the canonical view of what's moving, stuck, or done.
                </p>
              </div>
              <span className="text-[12px] font-mono text-muted-foreground/40 shrink-0">{tasks.length} tasks</span>
            </div>
            <DeliveryBoard
              tasks={tasks.map((t) => ({
                id: t.id,
                title: t.title,
                state: t.state,
                domain: t.domain,
                priority: t.priority,
                updated_at: t.updated_at,
                owner_role_name: (t as any).agent_roles?.name,
                owner_role_code: (t as any).agent_roles?.code,
              }))}
              projectId={id!}
            />
          </div>

          {/* ══ VERIFICATION RAIL ══ */}
          <div className="rounded-2xl bg-card border border-border/40 shadow-sm p-5">
            <SectionHeader icon={ShieldCheck} title="Verification Rail" />
            <p className="text-[11px] text-muted-foreground/40 -mt-2 mb-4">
              Evidence-based verification — only what the system can actually observe. No silent pass.
            </p>
            <VerificationRail
              tasks={tasks}
              artifacts={artifacts}
              approvals={approvals}
              deployments={deployments}
              checkSuites={checkSuites}
              failedRuns={failedRuns}
              domainBindings={domainBindings}
            />
          </div>

          {/* ══ ROW 2 — TASK FLOW + ACTIVITY ══ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" style={{ minHeight: 420 }}>
            <div className="lg:col-span-8 rounded-2xl bg-card border border-border/40 shadow-sm p-5 flex flex-col min-h-0 overflow-hidden">
              <SectionHeader icon={Layers} title="Task Flow" count={tasks.length} />
              <div className="flex-1 min-h-0 overflow-hidden">
                <TaskGraph tasks={taskItems} projectId={id!} />
              </div>
            </div>
            <div className="lg:col-span-4 rounded-2xl bg-card border border-border/40 shadow-sm p-5 flex flex-col min-h-0 overflow-hidden">
              <SectionHeader icon={Activity} title="Activity" count={events.length} />
              <div className="flex-1 min-h-0 overflow-hidden">
                <ActivityTimeline events={events} />
              </div>
            </div>
          </div>

          {/* ══ ROW 3 — PROJECT SETUP ══ */}
          <div className="rounded-2xl bg-card border border-border/40 shadow-sm p-5">
            <SectionHeader icon={Settings2} title="Project Setup" />
            <p className="text-[11px] text-muted-foreground/40 -mt-2 mb-4">
              Infrastructure connections required for production delivery — repo, server, and domain.
            </p>
            <ProjectSetupPanel
              repo={{
                hasRepo: repositories.length > 0,
                repoName: repositories[0] ? `${repositories[0].repo_owner}/${repositories[0].repo_name}` : undefined,
                provider: repositories[0]?.provider,
                prCount: pullRequests.length,
                ciStatus: checkSuites.some((c: any) => c.status === "failed") ? "failed"
                  : checkSuites.some((c: any) => c.status === "passed") ? "passed"
                  : checkSuites.length > 0 ? "pending" : null,
              }}
              deploy={{
                hasStaging: deployments.some((d: any) => d.environment === "staging"),
                hasProduction: deployments.some((d: any) => d.environment === "production"),
                stagingStatus: deployments.find((d: any) => d.environment === "staging")?.status,
                productionStatus: deployments.find((d: any) => d.environment === "production")?.status,
                environmentCount: new Set(deployments.map((d: any) => d.environment)).size,
              }}
              domain={{
                hasDomain: domainBindings.length > 0,
                domains: domainBindings.map((d: any) => ({ domain: d.domain, status: d.status })),
              }}
              projectId={id!}
            />
          </div>

          {/* ══ ROW 4 — EVIDENCE & LOGS ══ */}
          <div className="rounded-2xl bg-card border border-border/40 shadow-sm p-5">
            <SectionHeader icon={Package} title="Evidence & Deployments" count={artifacts.length + deployments.length} />
            <EvidencePanel
              artifacts={artifacts.map((a) => ({
                id: a.id, title: a.title,
                artifact_type: a.artifact_type, state: a.state,
              }))}
              deployments={deployments.map((d: any) => ({
                id: d.id, environment: d.environment,
                status: d.status, version_label: d.version_label,
              }))}
              hasDomainBinding={domainBindings.length > 0}
            />
          </div>

          {/* ══ ROW 4 — EXECUTION TELEMETRY ══ */}
          <RunTraceMetaCard trace={null} title="Latest Run Execution Telemetry" />

          <div className="h-8" />
        </div>
      </ScrollArea>
    </AppLayout>
  );
}
