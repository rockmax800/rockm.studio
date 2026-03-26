import { useProjects, useTasks, useApprovals, useArtifacts } from "@/hooks/use-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { deriveVerification } from "@/components/project-cockpit/VerificationRail";
import type { VerificationStatus } from "@/types/verification";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, ShieldCheck } from "lucide-react";

const STATUS_ICON: Record<VerificationStatus, React.ElementType> = {
  pass: CheckCircle2, warning: AlertTriangle, missing: HelpCircle, blocked: XCircle,
};
const STATUS_COLOR: Record<VerificationStatus, string> = {
  pass: "text-status-green", warning: "text-status-amber", missing: "text-muted-foreground", blocked: "text-destructive",
};

export function VerificationSummary() {
  const { data: projects = [] } = useProjects();
  const activeProjects = projects.filter((p) => !["archived", "cancelled"].includes(p.state));

  if (activeProjects.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/30">
        <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground/40" />
        <span className="text-[11px] text-muted-foreground">No active projects to verify.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="h-4 w-4 text-muted-foreground/40" />
        <span className="text-[13px] font-bold text-foreground">Verification Rail</span>
        <span className="text-[10px] text-muted-foreground font-mono ml-auto">{activeProjects.length} project(s)</span>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-1 mb-2">
        Decisions without full verification may carry unassessed risk.
      </p>
      {activeProjects.slice(0, 5).map((project) => (
        <ProjectVerificationRow key={project.id} projectId={project.id} projectName={project.name} />
      ))}
    </div>
  );
}

function ProjectVerificationRow({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { data: tasks = [] } = useTasks(projectId);
  const { data: approvals = [] } = useApprovals(projectId);
  const { data: artifacts = [] } = useArtifacts(projectId);

  const { data: deployments = [] } = useQuery({
    queryKey: ["vr-deploys", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("deployments")
        .select("id, environment, status").eq("project_id", projectId).limit(10);
      return data ?? [];
    },
  });
  const { data: checkSuites = [] } = useQuery({
    queryKey: ["vr-ci", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("check_suites")
        .select("id, status").eq("project_id", projectId).limit(10);
      return data ?? [];
    },
  });
  const { data: domainBindings = [] } = useQuery({
    queryKey: ["vr-domains", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("domain_bindings")
        .select("id, status, domain").eq("project_id", projectId).limit(5);
      return data ?? [];
    },
  });
  const { data: failedRuns = [] } = useQuery({
    queryKey: ["vr-failed", projectId],
    queryFn: async () => {
      const taskIds = tasks.map((t) => t.id);
      if (taskIds.length === 0) return [];
      const { data } = await supabase.from("runs").select("id, task_id, state")
        .in("task_id", taskIds.slice(0, 100)).eq("state", "failed");
      return data ?? [];
    },
    enabled: tasks.length > 0,
  });

  const state = deriveVerification({ tasks, artifacts, approvals, deployments, checkSuites, failedRuns, domainBindings });
  const Icon = STATUS_ICON[state.overallStatus];

  return (
    <Link to={`/projects/${projectId}`} className="block">
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/30 hover:border-border/60 transition-colors bg-card">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", STATUS_COLOR[state.overallStatus])} />
        <span className="text-[12px] font-semibold text-foreground truncate flex-1">{projectName}</span>
        <div className="flex items-center gap-1.5">
          {state.sections.map((s) => {
            const SIcon = STATUS_ICON[s.status];
            return (
              <div key={s.id} title={`${s.title}: ${s.status}`}>
                <SIcon className={cn("h-3 w-3", STATUS_COLOR[s.status])} />
              </div>
            );
          })}
        </div>
        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
          {state.passCount}/{state.sections.length}
        </span>
      </div>
    </Link>
  );
}
