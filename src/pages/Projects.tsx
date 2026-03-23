import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { mockProjects } from "@/data/mock";
import { Button } from "@/components/ui/button";
import { FolderKanban, Plus } from "lucide-react";
import { Link } from "react-router-dom";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ProjectsPage() {
  return (
    <AppLayout title="Projects">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {mockProjects.length} projects
          </p>
          <Button size="sm" className="gap-1">
            <Plus className="h-3.5 w-3.5" /> New project
          </Button>
        </div>

        <div className="space-y-2">
          {mockProjects.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`}>
              <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <FolderKanban className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{p.name}</p>
                        <StatusBadge state={p.state} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{p.purpose}</p>
                    </div>
                    <div className="hidden sm:flex gap-6 text-xs text-muted-foreground shrink-0">
                      <div className="text-center">
                        <p className="font-semibold text-foreground">{p.activeTasks}</p>
                        <p>tasks</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-status-red">{p.blockedTasks}</p>
                        <p>blocked</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-status-amber">{p.pendingApprovals}</p>
                        <p>approvals</p>
                      </div>
                      <div className="text-center">
                        <p>{formatDate(p.updatedAt)}</p>
                        <p>updated</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}