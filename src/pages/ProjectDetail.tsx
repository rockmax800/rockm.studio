import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProject, useTasks, useActivityEvents } from "@/hooks/use-data";
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
  const { data: project, isLoading } = useProject(id!);
  const { data: tasks = [] } = useTasks(id);
  const { data: events = [] } = useActivityEvents(id);

  if (isLoading) {
    return <AppLayout title="Loading..."><p className="text-sm text-muted-foreground">Loading...</p></AppLayout>;
  }

  if (!project) {
    return (
      <AppLayout title="Project not found">
        <p className="text-muted-foreground">Project not found.</p>
      </AppLayout>
    );
  }

  const blockedCount = tasks.filter((t) => t.state === "blocked").length;
  const activeCount = tasks.filter((t) => !["done", "cancelled", "draft"].includes(t.state)).length;

  return (
    <AppLayout title={project.name}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start gap-3">
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

        <div className="grid grid-cols-3 gap-3">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active tasks</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold text-status-red">{blockedCount}</p>
              <p className="text-xs text-muted-foreground">Blocked</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold">{tasks.length}</p>
              <p className="text-xs text-muted-foreground">Total tasks</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="tasks">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle className="text-sm">Project Summary</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">State</span>
                  <StatusBadge state={project.state} />
                </div>
                {project.current_phase && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phase</span>
                    <span>{project.current_phase}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span>{formatRelativeTime(project.updated_at)}</span>
                </div>
                {project.founder_notes && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground text-xs mb-1">Founder notes</p>
                    <p className="text-sm">{project.founder_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4 space-y-2">
            {tasks.length === 0 ? (
              <Card className="border-none shadow-sm">
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No tasks yet. Create a task from a project or docs workspace.
                </CardContent>
              </Card>
            ) : (
              tasks.map((t) => (
                <Card key={t.id} className="border-none shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{t.domain}</span>
                        {(t as any).agent_roles?.name && <><span>·</span><span>{(t as any).agent_roles.name}</span></>}
                      </div>
                    </div>
                    <StatusBadge state={t.state} />
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            {events.length === 0 ? (
              <Card className="border-none shadow-sm">
                <CardContent className="p-8 text-center text-sm text-muted-foreground">No activity yet.</CardContent>
              </Card>
            ) : (
              <Card className="border-none shadow-sm">
                <CardContent className="p-0 divide-y divide-border">
                  {events.map((evt) => (
                    <div key={evt.id} className="px-4 py-3 flex items-start justify-between gap-2">
                      <p className="text-xs font-medium">{evt.event_type.replace(/_/g, " ")}</p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(evt.created_at)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}