import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProject, useTasks, useActivityEvents, useApprovals, useRuns } from "@/hooks/use-data";
import {
  ArrowLeft,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Zap,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

const STAGE_ORDER = ["draft", "scoped", "active", "in_review", "completed", "archived"];

export default function ProjectDetail() {
  const { id } = useParams();
  const { data: project, isLoading } = useProject(id!);
  const { data: tasks = [] } = useTasks(id);
  const { data: events = [] } = useActivityEvents(id);
  const { data: approvals = [] } = useApprovals(id);
  const { data: runs = [] } = useRuns();

  if (isLoading) {
    return <AppLayout title="Loading…"><p className="text-xs text-muted-foreground p-4">Loading…</p></AppLayout>;
  }
  if (!project) {
    return <AppLayout title="Not found"><p className="text-xs text-muted-foreground p-4">Project not found.</p></AppLayout>;
  }

  const blockedCount = tasks.filter((t) => t.state === "blocked").length;
  const activeCount = tasks.filter((t) => !["done", "cancelled", "draft"].includes(t.state)).length;
  const doneCount = tasks.filter((t) => t.state === "done").length;
  const pendingApprovals = approvals.filter((a) => a.state === "pending");
  const failedRuns = runs.filter((r: any) => r.state === "failed" && tasks.some(t => t.id === r.task_id));
  const reviewingCount = tasks.filter(t => t.state === "waiting_review").length;

  // Stage progress
  const stageIdx = STAGE_ORDER.indexOf(project.state);
  const stageProgress = stageIdx >= 0 ? Math.round(((stageIdx + 1) / STAGE_ORDER.length) * 100) : 10;

  // Task completion
  const taskProgress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  // Determine next founder action
  let nextAction: string | null = null;
  if (pendingApprovals.length > 0) nextAction = `${pendingApprovals.length} approval(s) pending`;
  else if (blockedCount > 0) nextAction = `${blockedCount} task(s) blocked — requires intervention`;
  else if (failedRuns.length > 0) nextAction = `${failedRuns.length} failed run(s) — check diagnostics`;

  return (
    <AppLayout title={project.name}>
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Link to="/projects">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold">{project.name}</h1>
              <StatusBadge state={project.state} className="text-[9px]" />
            </div>
            <p className="text-[10px] text-muted-foreground">{project.purpose}</p>
          </div>
          <span className="text-[9px] font-mono text-muted-foreground">
            {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
          </span>
        </div>

        {/* Stage Progress */}
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Stage Progress</span>
              <span className="text-[10px] font-mono text-muted-foreground">{stageProgress}%</span>
            </div>
            <Progress value={stageProgress} className="h-1.5" />
            <div className="flex justify-between mt-1.5">
              {STAGE_ORDER.map((s, i) => (
                <span
                  key={s}
                  className={`text-[8px] font-mono ${
                    i <= stageIdx ? "text-primary" : "text-muted-foreground/40"
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Metric strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <MetricCard icon={<Activity className="h-3.5 w-3.5 text-status-cyan" />} label="Active" value={activeCount} />
          <MetricCard icon={<CheckCircle2 className="h-3.5 w-3.5 text-status-green" />} label="Done" value={`${doneCount}/${tasks.length}`} sub={`${taskProgress}%`} />
          <MetricCard icon={<AlertTriangle className="h-3.5 w-3.5 text-status-red" />} label="Blocked" value={blockedCount} alert={blockedCount > 0} />
          <MetricCard icon={<Shield className="h-3.5 w-3.5 text-status-amber" />} label="In Review" value={reviewingCount} />
          <MetricCard icon={<Zap className="h-3.5 w-3.5 text-status-red" />} label="Failed" value={failedRuns.length} alert={failedRuns.length > 0} />
        </div>

        {/* Next founder action */}
        {nextAction && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-status-amber/30 bg-status-amber/5">
            <Clock className="h-3.5 w-3.5 text-status-amber shrink-0" />
            <span className="text-[10px] text-status-amber font-medium">Next action required:</span>
            <span className="text-[10px] text-foreground">{nextAction}</span>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="tasks">
          <TabsList className="bg-muted/50 border border-border/50">
            <TabsTrigger value="tasks" className="text-[10px]">Tasks ({tasks.length})</TabsTrigger>
            <TabsTrigger value="overview" className="text-[10px]">Overview</TabsTrigger>
            <TabsTrigger value="activity" className="text-[10px]">Activity ({events.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-3 space-y-1">
            {tasks.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-6 text-center text-[10px] text-muted-foreground">
                  No tasks created yet.
                </CardContent>
              </Card>
            ) : (
              tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-md bg-card border border-border/50 hover:border-primary/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <span className="font-mono">{t.domain}</span>
                      {(t as any).agent_roles?.name && (
                        <>
                          <span>·</span>
                          <span>{(t as any).agent_roles.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <StatusBadge state={t.state} className="text-[9px] shrink-0" />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="overview" className="mt-3">
            <Card className="border-border/50">
              <CardContent className="p-4 space-y-2 text-xs">
                <InfoRow label="State" value={<StatusBadge state={project.state} className="text-[9px]" />} />
                {project.current_phase && <InfoRow label="Phase" value={project.current_phase} />}
                <InfoRow label="Updated" value={formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })} />
                {project.founder_notes && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-[10px] text-muted-foreground mb-1">Founder notes</p>
                    <p className="text-xs">{project.founder_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-3">
            {events.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-6 text-center text-[10px] text-muted-foreground">No activity.</CardContent>
              </Card>
            ) : (
              <div className="space-y-0.5">
                {events.map((evt) => (
                  <div key={evt.id} className="flex items-center justify-between px-3 py-2 rounded-md bg-card border border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                      <span className="text-[10px] font-medium">{evt.event_type.replace(/_/g, " ")}</span>
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground">
                      {formatDistanceToNow(new Date(evt.created_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <Card className={`border-border/50 ${alert ? "border-status-red/30" : ""}`}>
      <CardContent className="p-3 flex items-center gap-2">
        {icon}
        <div>
          <p className={`text-sm font-bold font-mono leading-none ${alert ? "text-status-red" : ""}`}>
            {value}
          </p>
          <p className="text-[9px] text-muted-foreground">{label}</p>
        </div>
        {sub && <span className="text-[9px] font-mono text-muted-foreground ml-auto">{sub}</span>}
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground text-[10px]">{label}</span>
      {typeof value === "string" ? <span className="text-[10px] font-mono">{value}</span> : value}
    </div>
  );
}
