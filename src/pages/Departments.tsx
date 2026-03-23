import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useDepartments, usePresales } from "@/hooks/use-department-data";
import { useProjects } from "@/hooks/use-data";
import { Link } from "react-router-dom";
import {
  Smartphone,
  Bot,
  Globe,
  Building2,
  ArrowRight,
  Plus,
  FolderKanban,
  FileText,
  Activity,
} from "lucide-react";

const DEPT_ICONS: Record<string, React.ElementType> = {
  Smartphone,
  Bot,
  Globe,
  Building2,
};

export default function DepartmentsPage() {
  const { data: departments = [], isLoading } = useDepartments();
  const { data: presales = [] } = usePresales();
  const { data: projects = [] } = useProjects();

  const getDeptStats = (slug: string) => {
    const deptPresales = presales.filter(p => p.department_slug === slug && p.status !== "converted" && p.status !== "cancelled");
    // For now, show all non-archived projects (department-project mapping could be enhanced later)
    const activeProjects = projects.filter(p => ["active", "in_review", "scoped"].includes(p.state));
    return {
      presaleCount: deptPresales.length,
      projectCount: Math.ceil(activeProjects.length / departments.length) || 0,
      loadPct: Math.floor(Math.random() * 60 + 20), // placeholder until real load calc
    };
  };

  return (
    <AppLayout title="Departments">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Production Departments</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Choose a department to start a presale or manage production
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Create Department
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading departments…</p>
        ) : departments.length === 0 ? (
          <Card className="border-none shadow-sm">
            <CardContent className="p-12 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                No departments yet. Create your first production department to get started.
              </p>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Create Department
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {departments.map((dept) => {
              const Icon = DEPT_ICONS[dept.icon] || Building2;
              const stats = getDeptStats(dept.slug);
              return (
                <Card key={dept.id} className="border-none shadow-sm hover:shadow-md transition-shadow group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{dept.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {dept.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <FolderKanban className="h-3 w-3" />
                        </div>
                        <p className="text-lg font-semibold">{stats.projectCount}</p>
                        <p className="text-[10px] text-muted-foreground">Projects</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <FileText className="h-3 w-3" />
                        </div>
                        <p className="text-lg font-semibold">{stats.presaleCount}</p>
                        <p className="text-[10px] text-muted-foreground">Presales</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Activity className="h-3 w-3" />
                        </div>
                        <p className="text-lg font-semibold">{stats.loadPct}%</p>
                        <p className="text-[10px] text-muted-foreground">Load</p>
                      </div>
                    </div>

                    <Progress value={stats.loadPct} className="h-1.5 mb-4" />

                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {stats.presaleCount} active presales
                        </Badge>
                      </div>
                      <Link to={`/departments/${dept.slug}`}>
                        <Button size="sm" variant="default" className="gap-1 text-xs h-8">
                          Enter <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
