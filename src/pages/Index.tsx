import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProjects, useDashboardCounts, useApprovals, useActivityEvents } from "@/hooks/use-data";
import { useSystemMode } from "@/hooks/use-system-mode";
import { useFounderInbox, useRiskAnalytics } from "@/hooks/use-founder-data";
import {
  AlertTriangle,
  Stamp,
  Zap,
  FolderKanban,
  ArrowRight,
  Shield,
  Activity,
  Clock,
  Rocket,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

const EVENT_TYPE_COLORS: Record<string, string> = {
  "task_assigned": "text-status-blue",
  "run_started": "text-status-amber",
  "run_completed": "text-status-green",
  "run_failed": "text-status-red",
  "artifact_submitted": "text-status-cyan",
  "review_approved": "text-status-green",
  "review_rejected": "text-status-red",
  "approval_created": "text-status-amber",
  "approval_resolved": "text-status-green",
  "task_escalated": "text-status-red",
  "deployment_started": "text-status-cyan",
  "deployment_completed": "text-status-green",
};

export default function CommandCenter() {
  const { data: projects = [] } = useProjects();
  const { data: counts } = useDashboardCounts();
  const { data: approvals = [] } = useApprovals();
  const { data: events = [] } = useActivityEvents(undefined, 30);
  const { data: modeData } = useSystemMode();
  const risk = useRiskAnalytics();
  const inbox = useFounderInbox();

  const pendingApprovals = approvals.filter((a) => a.state === "pending");
  const activeProjects = projects.filter(p => !["archived", "cancelled"].includes(p.state));
  const escalations = inbox.data?.escalations ?? [];

  return (
    <AppLayout title="Command Center">
      <div className="max-w-[1600px] mx-auto space-y-4">
        {/* STATUS STRIP */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusPill
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            label="Blocked"
            value={counts?.blockedTasks ?? 0}
            variant={counts?.blockedTasks ? "danger" : "neutral"}
          />
          <StatusPill
            icon={<Zap className="h-3.5 w-3.5" />}
            label="Failed Runs"
            value={counts?.failedRuns ?? 0}
            variant={counts?.failedRuns ? "danger" : "neutral"}
          />
          <StatusPill
            icon={<Stamp className="h-3.5 w-3.5" />}
            label="Decisions"
            value={counts?.pendingApprovals ?? 0}
            variant={counts?.pendingApprovals ? "warning" : "neutral"}
          />
          <StatusPill
            icon={<Shield className="h-3.5 w-3.5" />}
            label="In Review"
            value={counts?.waitingReview ?? 0}
            variant={counts?.waitingReview ? "info" : "neutral"}
          />
          <StatusPill
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Active Projects"
            value={activeProjects.length}
            variant="neutral"
          />
          {risk.data && risk.data.retry_loops_detected.length > 0 && (
            <StatusPill
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Retry Loops"
              value={risk.data.retry_loops_detected.length}
              variant="danger"
            />
          )}
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-4">
          {/* MAIN COLUMN */}
          <div className="space-y-4">
            {/* FOUNDER INBOX */}
            {(pendingApprovals.length > 0 || escalations.length > 0) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Founder Inbox
                  </h2>
                  <Link to="/founder">
                    <Button variant="ghost" size="sm" className="text-[10px] h-6 gap-1 text-muted-foreground">
                      View all <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {pendingApprovals.slice(0, 6).map((a) => (
                    <InboxCard
                      key={a.id}
                      type={a.approval_type.replace(/_/g, " ")}
                      title={a.summary}
                      riskLevel={a.consequence_if_rejected ? "high" : "normal"}
                      timestamp={a.created_at}
                      actionLabel="Approve"
                      linkTo={`/control/approvals/${a.id}`}
                    />
                  ))}
                  {escalations.slice(0, 3).map((e: any) => (
                    <InboxCard
                      key={e.id}
                      type="escalation"
                      title={e.title}
                      riskLevel="high"
                      timestamp={e.updated_at}
                      actionLabel="Review"
                      linkTo={`/control/tasks/${e.id}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ACTIVE PROJECTS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Active Projects
                </h2>
                <Link to="/projects">
                  <Button variant="ghost" size="sm" className="text-[10px] h-6 gap-1 text-muted-foreground">
                    All <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
              {activeProjects.length === 0 ? (
                <Card className="border-border/50">
                  <CardContent className="p-6 text-center">
                    <Rocket className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No active projects. Start a presale.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-1.5">
                  {activeProjects.slice(0, 8).map((p) => (
                    <Link key={p.id} to={`/projects/${p.id}`}>
                      <div className="group flex items-center gap-3 px-3 py-2.5 rounded-md bg-card border border-border/50 hover:border-primary/30 hover:bg-surface-glass transition-all cursor-pointer">
                        <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
                          <FolderKanban className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{p.purpose}</p>
                        </div>
                        <StatusBadge state={p.state} className="text-[9px] shrink-0" />
                        <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(p.updated_at), { addSuffix: true })}
                        </span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* LIVE DELIVERY FEED */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Live Feed
            </h2>
            <Card className="border-border/50 h-[calc(100vh-12rem)]">
              <CardContent className="p-0">
                <ScrollArea className="h-full">
                  <div className="divide-y divide-border/30">
                    {events.length === 0 ? (
                      <div className="p-6 text-center">
                        <Activity className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-[10px] text-muted-foreground">Waiting for events…</p>
                      </div>
                    ) : (
                      events.map((evt) => (
                        <div key={evt.id} className="px-3 py-2 hover:bg-surface-glass/50 transition-colors animate-slide-up">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                EVENT_TYPE_COLORS[evt.event_type]
                                  ? EVENT_TYPE_COLORS[evt.event_type].replace("text-", "bg-")
                                  : "bg-muted-foreground"
                              }`} />
                              <p className={`text-[10px] font-medium truncate ${
                                EVENT_TYPE_COLORS[evt.event_type] ?? "text-foreground"
                              }`}>
                                {evt.event_type.replace(/_/g, " ")}
                              </p>
                            </div>
                            <span className="text-[9px] font-mono text-muted-foreground whitespace-nowrap shrink-0">
                              {formatDistanceToNow(new Date(evt.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 ml-3">
                            <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 border-border/50">
                              {evt.entity_type}
                            </Badge>
                            <span className="text-[8px] text-muted-foreground">{evt.actor_type}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatusPill({
  icon,
  label,
  value,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  variant: "danger" | "warning" | "info" | "neutral";
}) {
  const styles = {
    danger: "bg-status-red/10 text-status-red border-status-red/20",
    warning: "bg-status-amber/10 text-status-amber border-status-amber/20",
    info: "bg-status-cyan/10 text-status-cyan border-status-cyan/20",
    neutral: "bg-muted/50 text-muted-foreground border-border/50",
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${styles[variant]} transition-colors`}>
      {icon}
      <span className="text-lg font-bold font-mono leading-none">{value}</span>
      <span className="text-[10px] opacity-70">{label}</span>
    </div>
  );
}

function InboxCard({
  type,
  title,
  riskLevel,
  timestamp,
  actionLabel,
  linkTo,
}: {
  type: string;
  title: string;
  riskLevel: "high" | "normal";
  timestamp: string;
  actionLabel: string;
  linkTo: string;
}) {
  return (
    <Link to={linkTo}>
      <Card className={`border-border/50 hover:border-primary/30 transition-all cursor-pointer ${
        riskLevel === "high" ? "border-l-2 border-l-status-red" : ""
      }`}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
              {type}
            </span>
            {riskLevel === "high" && (
              <Badge variant="destructive" className="text-[8px] px-1 py-0 h-3.5">
                HIGH RISK
              </Badge>
            )}
          </div>
          <p className="text-xs font-medium line-clamp-2">{title}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[9px] font-mono text-muted-foreground">
              {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
            </span>
            <Button size="sm" className="h-5 text-[10px] px-2">
              {actionLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
