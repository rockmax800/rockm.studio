import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useDepartments } from "@/hooks/use-department-data";
import { useProjects } from "@/hooks/use-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  Smartphone, Bot, Globe, Building2, ArrowRight, Users, TrendingUp, Gauge,
} from "lucide-react";

const DEPT_ICONS: Record<string, React.ElementType> = { Smartphone, Bot, Globe, Building2 };

export default function DepartmentsPage() {
  const { data: departments = [], isLoading } = useDepartments();
  const { data: projects = [] } = useProjects();

  const { data: roles = [] } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_roles")
        .select("id, status, success_rate, total_runs, capacity_score");
      return data ?? [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["all-employees"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_employees")
        .select("id, status, success_rate, avg_latency");
      return data ?? [];
    },
  });

  const activeProjects = projects.filter((p) => ["active", "in_review", "scoped"].includes(p.state));
  const activeEmployees = employees.filter((e) => e.status === "active");
  const activeRoles = roles.filter((r) => r.status === "active");

  const getPoolMetrics = () => {
    const teamSize = departments.length > 0 ? Math.ceil(activeEmployees.length / departments.length) : 0;
    const avgSuccess = activeRoles.length > 0
      ? Math.round(activeRoles.reduce((s, r) => s + (r.success_rate ?? 0), 0) / activeRoles.length * 100)
      : 0;
    const totalCap = activeRoles.reduce((s, r) => s + (r.capacity_score ?? 1), 0);
    const usedCap = activeRoles.reduce((s, r) => s + Math.min(r.total_runs ?? 0, r.capacity_score ?? 1), 0);
    const loadPct = totalCap > 0 ? Math.round((usedCap / totalCap) * 100) : 0;
    return { teamSize, avgSuccess, loadPct };
  };

  return (
    <AppLayout title="Capability Pools">
      <div className="grid-content space-y-5 pb-8">
        {/* Header */}
        <div>
          <h1 className="text-[24px] font-bold text-foreground tracking-tight">Capability Pools</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Specialized production teams · Select a pool to manage
          </p>
        </div>

        {/* Summary strip */}
        <div className="flex items-center gap-4 text-[12px]">
          <Badge variant="secondary" className="text-[10px] font-medium gap-1">
            <Users className="h-3 w-3" /> {activeEmployees.length} agents
          </Badge>
          <Badge variant="secondary" className="text-[10px] font-medium gap-1">
            {activeProjects.length} active projects
          </Badge>
        </div>

        {isLoading ? (
          <p className="text-[12px] text-muted-foreground">Loading…</p>
        ) : departments.length === 0 ? (
          <div className="ds-card p-6">
            <p className="text-[12px] text-muted-foreground">No capability pools configured.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {departments.map((dept) => {
              const Icon = DEPT_ICONS[dept.icon] || Building2;
              const m = getPoolMetrics();
              const loadStatus = m.loadPct > 85 ? "Overloaded" : m.loadPct < 30 ? "Underutilized" : "Stable";
              const loadColor = m.loadPct > 85 ? "bg-red-100 text-red-700" : m.loadPct < 30 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";

              return (
                <div key={dept.id} className="ds-card p-0 overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all group">
                  {/* Header */}
                  <div className="px-5 pt-5 pb-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[16px] font-bold text-foreground leading-tight">{dept.name}</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          {dept.description || "Specialized production capability"}
                        </p>
                      </div>
                      <Badge className={`text-[9px] font-semibold px-2 py-0.5 border-0 shrink-0 ${loadColor}`}>
                        {loadStatus}
                      </Badge>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="px-5 pb-3 grid grid-cols-3 gap-3">
                    <MetricCell icon={<Users className="h-3 w-3 text-muted-foreground/60" />} value={m.teamSize} label="team" />
                    <MetricCell icon={<TrendingUp className="h-3 w-3 text-green-500/70" />} value={`${m.avgSuccess}%`} label="success" />
                    <MetricCell icon={<Gauge className="h-3 w-3 text-amber-500/70" />} value={`${m.loadPct}%`} label="load" />
                  </div>

                  {/* Load bar */}
                  <div className="px-5 pb-4">
                    <Progress value={m.loadPct} className="h-1" />
                  </div>

                  {/* Enter */}
                  <div className="px-5 py-3 border-t border-border/40 bg-secondary/10">
                    <Link to={`/departments/${dept.slug}`}>
                      <Button size="sm" className="w-full text-[11px] h-8 gap-1.5 font-semibold">
                        Enter Team Studio <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function MetricCell({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-[12px] font-semibold text-foreground">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
