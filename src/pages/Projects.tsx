import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { useProjects } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { FolderKanban, FileText, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();

  return (
    <AppLayout title="Projects">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {projects.length} projects
          </p>
          <Link to="/presale/new">
            <Button size="sm" className="gap-1.5 bg-foreground text-background hover:bg-foreground/90 rounded-lg">
              <FileText className="h-3.5 w-3.5" /> Start New Intake
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border bg-secondary/10 p-12 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground/15 mx-auto mb-4" />
            <h2 className="text-[20px] font-bold text-foreground">No Projects Yet</h2>
            <p className="text-[14px] text-muted-foreground mt-2 max-w-[400px] mx-auto leading-relaxed">
              Projects are created through the structured intake flow. Start with an intake to define scope, select a team, and freeze a blueprint.
            </p>
            <Link to="/presale/new">
              <Button className="mt-6 h-12 px-7 gap-2.5 text-[15px] font-bold bg-foreground text-background hover:bg-foreground/90 rounded-xl">
                <FileText className="h-5 w-5" />
                Start Structured Intake
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((p) => (
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
                      <div className="hidden sm:block text-xs text-muted-foreground shrink-0">
                        {formatDate(p.updated_at)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
