import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { useProjects, useDashboardCounts, useApprovals, useActivityEvents } from "@/hooks/use-data";
import { usePresales } from "@/hooks/use-department-data";
import { useTasks } from "@/hooks/use-data";
import {
  AlertTriangle,
  Stamp,
  ShieldCheck,
  Zap,
  FolderKanban,
  ArrowRight,
  Plus,
  FileText,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const priorityIcons = [
  { key: "blockedTasks", label: "Blocked tasks", icon: AlertTriangle },
  { key: "pendingApprovals", label: "Pending approvals", icon: Stamp },
  { key: "waitingReview", label: "Awaiting review", icon: ShieldCheck },
  { key: "failedRuns", label: "Failed runs", icon: Zap },
] as const;

export default function Dashboard() {
  const { data: projects = [] } = useProjects();
  const { data: counts } = useDashboardCounts();
  const { data: approvals = [] } = useApprovals();
  const { data: presales = [] } = usePresales();
  const { data: tasks = [] } = useTasks();
  const { data: events = [] } = useActivityEvents(undefined, 8);

  const pendingApprovals = approvals.filter((a) => a.state === "pending");
  const activePresales = presales.filter(p => p.status !== "converted" && p.status !== "cancelled");
  const activeTasks = tasks.filter(t => ["in_progress", "assigned", "running"].includes(t.state));

  return (
    <AppLayout title="Home">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Priority strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {priorityIcons.map((c) => {
            const count = counts?.[c.key] ?? 0;
            const isRed = c.key === "blockedTasks" || c.key === "failedRuns";
            return (
              <Card key={c.key} className="border-none shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isRed ? "bg-destructive/15" : "bg-primary/10"}`}>
                    <c.icon className={`h-4 w-4 ${isRed ? "text-destructive" : "text-primary"}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold leading-none">{count}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Active Projects */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Active Projects</h2>
              <Link to="/projects">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            {projects.length === 0 ? (
              <Card className="border-none shadow-sm">
                <CardContent className="p-8 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    No projects yet. Start a presale to launch your first project.
                  </p>
                  <Link to="/departments">
                    <Button size="sm" className="gap-1">
                      <Plus className="h-3.5 w-3.5" /> Start Presale
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {projects.slice(0, 5).map((p) => (
                  <Link key={p.id} to={`/projects/${p.id}`}>
                    <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                              <FolderKanban className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.purpose}</p>
                            </div>
                          </div>
                          <StatusBadge state={p.state} />
                        </div>
                        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                          <span className="ml-auto">{formatRelativeTime(p.updated_at)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Active Presales */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Active Presales</h2>
                <Link to="/departments">
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    New <Plus className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
              {activePresales.length === 0 ? (
                <Card className="border-none shadow-sm">
                  <CardContent className="p-5 text-center">
                    <FileText className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      No active presales.{" "}
                      <Link to="/departments" className="text-primary hover:underline">
                        Start one →
                      </Link>
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-none shadow-sm">
                  <CardContent className="p-0 divide-y divide-border">
                    {activePresales.slice(0, 5).map(ps => (
                      <Link key={ps.id} to={`/departments/${ps.department_slug}/presales/${ps.id}`}>
                        <div className="px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
                          <p className="text-xs font-medium">{ps.client_name || "Untitled"}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-muted-foreground">{ps.department_slug}</span>
                            <Badge variant="secondary" className="text-[9px]">{ps.status}</Badge>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Running Tasks */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Running Tasks</h2>
              {activeTasks.length === 0 ? (
                <Card className="border-none shadow-sm">
                  <CardContent className="p-5 text-center text-xs text-muted-foreground">
                    No active tasks.
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-none shadow-sm">
                  <CardContent className="p-0 divide-y divide-border">
                    {activeTasks.slice(0, 5).map(t => (
                      <div key={t.id} className="px-4 py-3">
                        <p className="text-xs font-medium">{t.title}</p>
                        <div className="flex items-center justify-between mt-1">
                          <StatusBadge state={t.state} className="text-[9px]" />
                          <span className="text-[10px] text-muted-foreground">{t.domain}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Activity */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Recent Activity</h2>
              {events.length === 0 ? (
                <Card className="border-none shadow-sm">
                  <CardContent className="p-5 text-center text-xs text-muted-foreground">
                    No activity yet.
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-none shadow-sm">
                  <CardContent className="p-0 divide-y divide-border">
                    {events.slice(0, 5).map((evt) => (
                      <div key={evt.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium">{evt.event_type.replace(/_/g, " ")}</p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatRelativeTime(evt.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Decision queue */}
        {pendingApprovals.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Founder Decision Queue</h2>
            <div className="grid md:grid-cols-3 gap-3">
              {pendingApprovals.slice(0, 6).map((a) => (
                <Card key={a.id} className="border-none shadow-sm">
                  <CardContent className="p-4">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      {a.approval_type.replace(/_/g, " ")}
                    </span>
                    <p className="text-sm font-medium mt-1">{a.summary}</p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" className="h-7 text-xs">Approve</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs">Inspect</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
