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
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Rocket, Pause, Building2, GitBranch,
  Upload, Clock, Server, Globe, Shield, ChevronRight,
  FileText, Layers, Activity, CheckCircle2, AlertTriangle, Zap,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   PIPELINE STAGES — matches Command Center
   ═══════════════════════════════════════════════════════════════ */
const PIPELINE = [
  { key: "intake",    label: "Intake",    states: ["draft"],     icon: FileText },
  { key: "blueprint", label: "Blueprint", states: ["scoped"],    icon: Layers },
  { key: "kickoff",   label: "Kickoff",   states: [],            icon: Rocket },
  { key: "delivery",  label: "Delivery",  states: ["active", "blocked"], icon: Activity },
  { key: "review",    label: "Review",    states: ["in_review"], icon: Shield },
  { key: "release",   label: "Release",   states: ["completed", "archived", "paused"], icon: CheckCircle2 },
] as const;

function resolveStageIndex(state?: string): number {
  if (!state) return -1;
  return PIPELINE.findIndex((s) => (s.states as readonly string[]).includes(state));
}

const STAGE_COLORS: Record<string, { active: string; activeBg: string; done: string; border: string }> = {
  intake:    { active: "text-status-blue",       activeBg: "bg-status-blue/8",      done: "text-status-blue/40",       border: "border-status-blue" },
  blueprint: { active: "text-lifecycle-review",  activeBg: "bg-lifecycle-review/8",  done: "text-lifecycle-review/40",  border: "border-lifecycle-review" },
  kickoff:   { active: "text-status-cyan",       activeBg: "bg-status-cyan/8",      done: "text-status-cyan/40",       border: "border-status-cyan" },
  delivery:  { active: "text-status-amber",      activeBg: "bg-status-amber/8",     done: "text-status-amber/40",      border: "border-status-amber" },
  review:    { active: "text-lifecycle-rework",   activeBg: "bg-lifecycle-rework/8",  done: "text-lifecycle-rework/40",  border: "border-lifecycle-rework" },
  release:   { active: "text-status-green",      activeBg: "bg-status-green/8",     done: "text-status-green/40",      border: "border-status-green" },
};

const RISK_COLORS = {
  low: "bg-status-green/10 text-status-green",
  medium: "bg-status-amber/10 text-status-amber",
  high: "bg-destructive/10 text-destructive",
};

/* ═══════════════════════════════════════════════════════════════ */

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

  let nextAction: string | null = null;
  if (pendingApprovals.length > 0) nextAction = `${pendingApprovals.length} approval(s) pending`;
  else if (blockedCount > 0) nextAction = `${blockedCount} task(s) blocked`;
  else if (failedRuns.length > 0) nextAction = `${failedRuns.length} failed run(s)`;

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

  return (
    <AppLayout title={project.name} fullHeight>
      <ScrollArea className="h-full">
        <div className="px-6 py-5 space-y-5 max-w-[1400px]">

          {/* ════════════════════════════════════════════════════════
              PIPELINE BAR — Inline horizontal flow
              ════════════════════════════════════════════════════════ */}
          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="px-6 py-4">
              <div className="flex items-center gap-0">
                {PIPELINE.map((stage, i) => {
                  const isCurrent = i === stageIdx;
                  const isDone = stageIdx > i && stageIdx >= 0;
                  const colors = STAGE_COLORS[stage.key];
                  const Icon = stage.icon;

                  return (
                    <div key={stage.key} className="flex items-center flex-1 min-w-0">
                      <div className={cn(
                        "relative rounded-xl px-4 py-3 transition-all flex-1 border-2",
                        isCurrent
                          ? `${colors.activeBg} ${colors.border} shadow-sm`
                          : isDone
                            ? "border-transparent bg-secondary/20"
                            : "border-transparent",
                      )}>
                        {isCurrent && (
                          <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
                            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-50", colors.active.replace("text-", "bg-"))} />
                            <span className={cn("relative inline-flex rounded-full h-2 w-2", colors.active.replace("text-", "bg-"))} />
                          </span>
                        )}
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                            isCurrent ? `${colors.activeBg} border ${colors.border}` : "bg-secondary/40",
                          )}>
                            <Icon className={cn("h-4 w-4", isCurrent ? colors.active : isDone ? colors.done : "text-muted-foreground/20")} />
                          </div>
                          <span className={cn(
                            "text-[14px] font-bold leading-tight truncate",
                            isCurrent ? colors.active : isDone ? "text-foreground/50" : "text-muted-foreground/25",
                          )}>
                            {stage.label}
                          </span>
                        </div>
                      </div>
                      {i < PIPELINE.length - 1 && (
                        <ChevronRight className={cn("h-4 w-4 mx-0.5 shrink-0", isDone ? "text-muted-foreground/25" : "text-muted-foreground/10")} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════
              TOP HEADER — Project identity + actions
              ════════════════════════════════════════════════════════ */}
          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="px-6 py-5">
              {/* Row 1 — Name + badges + actions */}
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

                {/* Env badges */}
                <div className="flex items-center gap-2 ml-1">
                  <span className={cn("flex items-center gap-1 text-[11px] font-mono font-bold", hasStagingLive ? "text-status-green" : "text-muted-foreground/30")}>
                    <Server className="h-3 w-3" /> STG {hasStagingLive ? "●" : "○"}
                  </span>
                  <span className={cn("flex items-center gap-1 text-[11px] font-mono font-bold", hasProductionLive ? "text-status-green" : "text-muted-foreground/30")}>
                    <Globe className="h-3 w-3" /> PRD {hasProductionLive ? "●" : "○"}
                  </span>
                </div>

                <div className="flex-1" />

                {/* Actions */}
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

              {/* Row 2 — Progress + Next Action + Token budget */}
              <div className="flex items-center gap-5 mt-4 pt-4 border-t border-border/30">
                <div className="flex items-center gap-3 flex-1 max-w-[320px]">
                  <span className="text-[12px] font-mono text-muted-foreground shrink-0">{doneCount}/{tasks.length} tasks</span>
                  <Progress value={progress} className="h-2 flex-1" />
                  <span className="text-[14px] font-bold font-mono text-foreground tabular-nums">{progress}%</span>
                </div>

                {nextAction && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-status-amber/5 border border-status-amber/15">
                    <Clock className="h-3.5 w-3.5 text-status-amber shrink-0" />
                    <span className="text-[13px] text-status-amber font-bold">{nextAction}</span>
                  </div>
                )}

                {/* Token/budget placeholder */}
                <div className="ml-auto flex items-center gap-2 text-[12px] text-muted-foreground/50">
                  <Zap className="h-3.5 w-3.5" />
                  <span className="font-mono font-bold text-foreground/60">—</span>
                  <span>tokens</span>
                </div>
              </div>
            </div>

            {/* Risk strip — inside header card */}
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
              ROW 3 — EVIDENCE & LOGS (Full Width)
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
