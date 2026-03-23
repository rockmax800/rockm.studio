import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { mockTasks } from "@/data/mock";
import { PriorityBadge } from "@/components/StatusBadge";

export default function TasksPage() {
  return (
    <AppLayout title="Tasks">
      <div className="max-w-5xl mx-auto space-y-4">
        <p className="text-sm text-muted-foreground">{mockTasks.length} tasks</p>
        <div className="space-y-2">
          {mockTasks.map((t) => (
            <Card key={t.id} className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{t.projectName}</span>
                    <span>·</span>
                    <span>{t.domain}</span>
                    <span>·</span>
                    <span>{t.ownerRole}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge state={t.state} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}