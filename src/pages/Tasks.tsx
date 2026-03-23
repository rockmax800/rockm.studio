import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { useTasks } from "@/hooks/use-data";

export default function TasksPage() {
  const { data: tasks = [], isLoading } = useTasks();

  return (
    <AppLayout title="Tasks">
      <div className="max-w-5xl mx-auto space-y-4">
        <p className="text-sm text-muted-foreground">{tasks.length} tasks</p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : tasks.length === 0 ? (
          <Card className="border-none shadow-sm">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No tasks yet. Create a task from a project or docs workspace.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <Card key={t.id} className="border-none shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{t.domain}</span>
                      {(t as any).agent_roles?.name && <><span>·</span><span>{(t as any).agent_roles.name}</span></>}
                    </div>
                  </div>
                  <StatusBadge state={t.state} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}