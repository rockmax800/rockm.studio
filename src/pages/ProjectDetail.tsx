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
import { StatusBadge } from "@/components/StatusBadge";
import { PipelineBar, resolveStageIndex } from "@/components/PipelineBar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Rocket, Pause, Building2, GitBranch,
  Upload, Clock, Server, Globe, Shield, Zap,
  AlertTriangle, CheckCircle2, FileText,
} from "lucide-react";

const RISK_COLORS = {
  low: "bg-status-green/10 text-status-green",
  medium: "bg-status-amber/10 text-status-amber",
  high: "bg-destructive/10 text-destructive",
};

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

  if (isLoading) return <AppLayout title="Loading…"><p className="p-8 text-[13px] text-muted-foreground">Loading…</p></AppLayout>;
  if (!project) return <AppLayout title="Not found"><p className="p-8 text-[13px] text-muted-foreground">Not found.</p></AppLayout>;

  /* ── Computed ── */
  const blockedCount = tasks.filter((t) => t.state === "blocked").length;
  const escalatedCount = tasks.filter((t) => t.state === "escalated").length;
  const pendingApprovals = approvals.filter((a) => a.state === "pending");
  const doneCount = tasks.filter((t) => t.state === "done").length;
  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

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
  const blockedStageIdx = blockedCount > 0 ? 4 : undefined; // execution stage

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
    destructive: "bg-destructive/5 border-destructive/20 text-destructive",
    warning: "bg-status-amber/5 border-status-amber/20 text-status-amber",
    default: "bg-primary/5 border-primary/20 text-primary",
  };

  return (
    <AppLayout title={project.name} fullHeight>
      <ScrollArea className="h-full">
        <div className="px-6 py-5 space-y-5 max-w-[1400px]">

          {/* ════════════════════════════════════════════════════════
              PIPELINE BAR — Full-width 8 stages
              ════════════════════════════════════════════════════════ */}
          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden px-6 py-4">
            <PipelineBar currentStageIndex={stageIdx} blockedStageIndex={blockedStageIdx} projectId={id} />
          </div>

          {/* ════════════════════════════════════════════════════════
              TOP HEADER — Project identity + actions
              ════════════════════════════════════════════════════════ */}
          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="px-6 py-5">
              {/* Row 1 */}
              <div className="flex items-center gap-3">
                <Link to="/projects">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <h1 className="text-[30px] font-bold tracking-[-0.025em] text-foreground truncate leading-none">
                  {project.name}
                </h1>
                <StatusBadge state={project.state} />
                <span className={cn("px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider", RISK_COLORS[riskLevel])}>
                  {riskLevel} risk
                </span>
                <div className="flex items-center gap-2 ml-1">
                  <span className={cn("flex items-center gap-1 text-[11px] font-mono font-bold", hasStagingLive ? "text-status-green" : "text-muted-foreground/30")}>
                    <Server className="h-3 w-3" /> STG {hasStagingLive ? "●" : "○"}
                  </span>
                  <span className={cn("flex items-center gap-1 text-[11px] font-mono font-bold", hasProductionLive ? "text-status-green" : "text-muted-foreground/30")}>
                    <Globe className="h-3 w-3" /> PRD {hasProductionLive ? "●" : "○"}
                  </span>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                  {pendingApprovals.length > 0 && (
                    <Link to="/founder">
                      <Button size="sm" className="h-9 text-[13px] gap-2 bg-foreground text-background hover:bg-foreground/90 rounded-xl font-bold px-5">
                        <Shield className="h-4 w-4" /> Review {pendingApprovals.length}
                      </Button>
                    </Link>
                  )}
                  <Button variant="outline" size="sm" className="h-9 text-[13px] gap-2 px-4 rounded-xl font-semibold">
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

              {/* Row 2 — Progress + Token budget */}
              <div className="flex items-center gap-5 mt-4 pt-4 border-t border-border/30">
                <div className="flex items-center gap-3 flex-1 max-w-[320px]">
                  <span className="text-[12px] font-mono text-muted-foreground shrink-0">{doneCount}/{tasks.length} tasks</span>
                  <Progress value={progress} className="h-2 flex-1" />
                  <span className="text-[14px] font-bold font-mono text-foreground tabular-nums">{progress}%</span>
                </div>
                <div className="ml-auto flex items-center gap-2 text-[12px] text-muted-foreground/50">
                  <Zap className="h-3.5 w-3.5" />
                  <span className="font-mono font-bold text-foreground/60">—</span>
                  <span>tokens</span>
                </div>
              </div>
            </div>

            {/* Risk strip */}
            <div className="px-6 py-2.5 border-t border-border/30 bg-secondary/10">
              <RiskSummary
                blockedTasks={blockedCount}
                stalledRuns={0}
                pendingApprovals={pendingApprovals.length}
                escalations={escalatedCount}
                failedRuns={failedRuns.length}
              />
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════
              NEXT REQUIRED ACTION
              ════════════════════════════════════════════════════════ */}
          {nextActions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {nextActions.slice(0, 3).map((action, i) => (
                <div key={i} className={cn(
                  "rounded-xl border px-5 py-4 flex items-center gap-4 transition-all hover:shadow-sm",
                  ACTION_STYLES[action.variant],
                )}>
                  <div className="h-10 w-10 rounded-xl bg-card border border-border/30 flex items-center justify-center shrink-0">
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[15px] font-bold block leading-tight">{action.label}</span>
                    <span className="text-[12px] opacity-70 block mt-0.5">{action.description}</span>
                  </div>
                  {action.linkTo && (
                    <Link to={action.linkTo}>
                      <Button size="sm" variant="outline" className="h-8 text-[11px] rounded-lg border-current/20">
                        Open
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              ROW 1 — BLUEPRINT (8) + RELEASE READINESS (4)
              ════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 rounded-2xl bg-card border border-border shadow-sm p-5">
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
            <div className="lg:col-span-4 rounded-2xl bg-card border border-border shadow-sm p-5 bg-secondary/15">
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

          {/* ════════════════════════════════════════════════════════
              ROW 2 — TASK FLOW (8) + ACTIVITY (4)
              ════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" style={{ minHeight: 420 }}>
            <div className="lg:col-span-8 rounded-2xl bg-card border border-border shadow-sm p-5 flex flex-col min-h-0 overflow-hidden border-t-[3px] border-t-primary/15">
              <TaskGraph tasks={taskItems} projectId={id!} />
            </div>
            <div className="lg:col-span-4 rounded-2xl bg-card border border-border shadow-sm p-5 flex flex-col min-h-0 overflow-hidden bg-secondary/10">
              <ActivityTimeline events={events} />
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════
              ROW 3 — EVIDENCE & LOGS
              ════════════════════════════════════════════════════════ */}
          <div className="rounded-2xl bg-card border border-border shadow-sm p-5">
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

          <div className="h-6" />
        </div>
      </ScrollArea>
    </AppLayout>
  );
}
