import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { mockProjects, mockTasks, mockActivity } from "@/data/mock";
import {
  AlertTriangle,
  Stamp,
  ShieldCheck,
  Zap,
  FolderKanban,
  ArrowRight,
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

const blockedTasks = mockTasks.filter((t) => t.state === "blocked");
const reviewTasks = mockTasks.filter((t) => t.state === "waiting_review");

const priorityCards = [
  { label: "Blocked tasks", count: blockedTasks.length, icon: AlertTriangle, variant: "red" as const },
  { label: "Pending approvals", count: 3, icon: Stamp, variant: "amber" as const },
  { label: "Awaiting review", count: reviewTasks.length, icon: ShieldCheck, variant: "amber" as const },
  { label: "Failed runs", count: 1, icon: Zap, variant: "red" as const },
];

export default function Dashboard() {
  return (
    <AppLayout title="Dashboard">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Priority strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {priorityCards.map((c) => (
            <Card key={c.label} className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center bg-status-${c.variant}/15`}>
                  <c.icon className={`h-4 w-4 text-status-${c.variant}`} />
                </div>
                <div>
                  <p className="text-2xl font-semibold leading-none">{c.count}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Active projects */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Active Projects</h2>
              <Link to="/projects">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="space-y-2">
              {mockProjects.map((p) => (
                <Card key={p.id} className="border-none shadow-sm">
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
                      <span>{p.activeTasks} active</span>
                      {p.blockedTasks > 0 && (
                        <span className="text-status-red">{p.blockedTasks} blocked</span>
                      )}
                      {p.pendingApprovals > 0 && (
                        <span className="text-status-amber">{p.pendingApprovals} approvals</span>
                      )}
                      <span className="ml-auto">{formatRelativeTime(p.updatedAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Activity feed */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Activity</h2>
            <Card className="border-none shadow-sm">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {mockActivity.slice(0, 6).map((evt) => (
                    <div key={evt.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium">{evt.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {evt.objectName}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(evt.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Decision queue */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Founder Decision Queue</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { type: "Architecture Approval", title: "Backend service boundaries", project: "AI Workshop OS", urgency: "high" as const },
              { type: "Schema Approval", title: "Task-Run table linkage", project: "AI Workshop OS", urgency: "blocker" as const },
              { type: "Project Activation", title: "Auth Service Rebuild", project: "Auth Service Rebuild", urgency: "normal" as const },
            ].map((d, i) => (
              <Card key={i} className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      {d.type}
                    </span>
                    <PriorityBadge priority={d.urgency} />
                  </div>
                  <p className="text-sm font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{d.project}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="h-7 text-xs">Approve</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs">Inspect</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}