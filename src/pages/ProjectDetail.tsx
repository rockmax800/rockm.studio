import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockProjects, mockTasks, mockActivity } from "@/data/mock";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ProjectDetail() {
  const { id } = useParams();
  const project = mockProjects.find((p) => p.id === id);

  if (!project) {
    return (
      <AppLayout title="Project not found">
        <p className="text-muted-foreground">Project not found.</p>
      </AppLayout>
    );
  }

  const projectTasks = mockTasks.filter((t) => t.projectId === project.id);
  const projectActivity = mockActivity.filter((e) => e.projectName === project.name);

  return (
    <AppLayout title={project.name}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link to="/projects">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">{project.name}</h1>
                <StatusBadge state={project.state} />
              </div>
              <p className="text-sm text-muted-foreground">{project.purpose}</p>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold">{project.activeTasks}</p>
              <p className="text-xs text-muted-foreground">Active tasks</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold text-status-red">{project.blockedTasks}</p>
              <p className="text-xs text-muted-foreground">Blocked</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold text-status-amber">{project.pendingApprovals}</p>
              <p className="text-xs text-muted-foreground">Pending approvals</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tasks">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm">Project Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">State</span>
                  <StatusBadge state={project.state} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span>{formatRelativeTime(project.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4 space-y-2">
            {projectTasks.length === 0 ? (
              <Card className="border-none shadow-sm">
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No tasks yet. Create a task from a project or docs workspace.
                </CardContent>
              </Card>
            ) : (
              projectTasks.map((t) => (
                <Card key={t.id} className="border-none shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div>
                        <p className="text-sm font-medium">{t.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{t.domain}</span>
                          <span className="text-xs text-muted-foreground">· {t.ownerRole}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge state={t.state} />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <Card className="border-none shadow-sm">
              <CardContent className="p-0 divide-y divide-border">
                {projectActivity.map((evt) => (
                  <div key={evt.id} className="px-4 py-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium">{evt.label}</p>
                      <p className="text-xs text-muted-foreground">{evt.objectName}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(evt.timestamp)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}