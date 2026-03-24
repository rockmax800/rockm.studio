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
  Smartphone,
  Bot,
  Globe,
  Building2,
  ArrowRight,
  Users,
  Zap,
  Clock,
  FolderKanban,
  TrendingUp,
  GraduationCap,
  Gauge,
} from "lucide-react";

const DEPT_ICONS: Record<string, React.ElementType> = {
  Smartphone,
  Bot,
  Globe,
  Building2,
};

export default function DepartmentsPage() {
  const { data: departments = [], isLoading } = useDepartments();
  const { data: projects = [] } = useProjects();

  // Fetch roles and employees for capability metrics
  const { data: roles = [] } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_roles")
        .select("id, name, code, status, performance_score, success_rate, total_runs, capacity_score, team_id, skill_profile");
      return data ?? [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["all-employees"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_employees")
        .select("id, name, role_code, status, success_rate, avg_latency, reputation_score");
      return data ?? [];
    },
  });

  const { data: learningProposals = [] } = useQuery({
    queryKey: ["recent-learning"],
    queryFn: async () => {
      const { data } = await supabase
        .from("learning_proposals")
        .select("id, proposal_type, status, hypothesis, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const activeProjects = projects.filter((p) =>
    ["active", "in_review", "scoped"].includes(p.state)
  );

  const getDeptCapability = (slug: string) => {
    const activeRoles = roles.filter((r) => r.status === "active");
    const deptEmployees = employees.filter((e) => e.status === "active");
    const perDept = departments.length > 0 ? Math.ceil(activeRoles.length / departments.length) : 0;
    const teamSize = departments.length > 0 ? Math.ceil(deptEmployees.length / departments.length) : 0;

    const avgSuccess =
      activeRoles.length > 0
        ? activeRoles.reduce((s, r) => s + (r.success_rate ?? 0), 0) / activeRoles.length
        : 0;

    const avgLatency =
      deptEmployees.length > 0
        ? deptEmployees.reduce((s, e) => s + (e.avg_latency ?? 0), 0) / deptEmployees.length
        : 0;

    const totalCapacity = activeRoles.reduce((s, r) => s + (r.capacity_score ?? 1), 0);
    const usedCapacity = activeRoles.reduce(
      (s, r) => s + Math.min(r.total_runs ?? 0, r.capacity_score ?? 1),
      0
    );
    const loadPct = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;

    const projectCount =
      departments.length > 0 ? Math.ceil(activeProjects.length / departments.length) : 0;

    // Top strengths from skill profiles
    const strengths: string[] = [];
    activeRoles.forEach((r) => {
      if (r.skill_profile && typeof r.skill_profile === "object" && !Array.isArray(r.skill_profile)) {
        Object.keys(r.skill_profile as Record<string, unknown>).forEach((k) => {
          if (!strengths.includes(k) && strengths.length < 4) strengths.push(k);
        });
      }
    });

    const recentLearning = learningProposals.slice(0, 3);

    return {
      roleCount: perDept,
      teamSize,
      successRate: Math.round(avgSuccess * 100),
      avgDeliveryTime: avgLatency > 0 ? `${(avgLatency / 1000).toFixed(1)}s` : "—",
      projectCount,
      loadPct,
      strengths: strengths.length > 0 ? strengths : ["General delivery", "Code generation"],
      recentLearning,
    };
  };

  return (
    <AppLayout title="Capability Pools">
      <div className="grid-content space-y-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-semibold text-foreground tracking-tight">
              Capability Pools
            </h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Specialized production capabilities · Team strength · Learning progress
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Badge variant="secondary" className="text-[10px] font-medium gap-1">
              <Users className="h-3 w-3" />
              {employees.filter((e) => e.status === "active").length} active agents
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-medium gap-1">
              <FolderKanban className="h-3 w-3" />
              {activeProjects.length} active projects
            </Badge>
          </div>
        </div>

        {isLoading ? (
          <p className="text-[12px] text-muted-foreground">Loading capabilities…</p>
        ) : departments.length === 0 ? (
          <div className="ds-card p-6">
            <p className="text-[12px] text-muted-foreground">
              No capability pools configured.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {departments.map((dept) => {
              const Icon = DEPT_ICONS[dept.icon] || Building2;
              const cap = getDeptCapability(dept.slug);
              return (
                <div
                  key={dept.id}
                  className="ds-card p-0 overflow-hidden hover:-translate-y-px transition-all group"
                >
                  {/* Header stripe */}
                  <div className="px-5 pt-4 pb-3 border-b border-border/50">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                        <Icon className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[14px] font-semibold text-foreground leading-tight">
                          {dept.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          {dept.description || "Specialized production capability"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="px-5 py-3 grid grid-cols-3 gap-x-4 gap-y-2.5 border-b border-border/30 bg-secondary/20">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3 text-muted-foreground/70" />
                      <span className="text-[12px] font-semibold">{cap.teamSize}</span>
                      <span className="text-[10px] text-muted-foreground">team</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3 w-3 text-green-500/80" />
                      <span className="text-[12px] font-semibold">{cap.successRate}%</span>
                      <span className="text-[10px] text-muted-foreground">success</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground/70" />
                      <span className="text-[12px] font-semibold">{cap.avgDeliveryTime}</span>
                      <span className="text-[10px] text-muted-foreground">avg</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FolderKanban className="h-3 w-3 text-blue-500/80" />
                      <span className="text-[12px] font-semibold">{cap.projectCount}</span>
                      <span className="text-[10px] text-muted-foreground">projects</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Gauge className="h-3 w-3 text-amber-500/80" />
                      <span className="text-[12px] font-semibold">{cap.loadPct}%</span>
                      <span className="text-[10px] text-muted-foreground">load</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-violet-500/80" />
                      <span className="text-[12px] font-semibold">{cap.roleCount}</span>
                      <span className="text-[10px] text-muted-foreground">roles</span>
                    </div>
                  </div>

                  {/* Load bar */}
                  <div className="px-5 py-2 border-b border-border/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        Current Load
                      </span>
                      <span className="text-[10px] text-muted-foreground">{cap.loadPct}%</span>
                    </div>
                    <Progress value={cap.loadPct} className="h-1" />
                  </div>

                  {/* Strengths + Learning */}
                  <div className="px-5 py-3 space-y-2.5">
                    {/* Top strengths */}
                    <div>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        Strengths
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {cap.strengths.map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="text-[10px] font-normal px-1.5 py-0"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Recent learning */}
                    {cap.recentLearning.length > 0 && (
                      <div>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" /> Recent Learning
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {cap.recentLearning.map((lp) => (
                            <div
                              key={lp.id}
                              className="text-[11px] text-muted-foreground flex items-center gap-1.5"
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  lp.status === "promoted"
                                    ? "bg-green-500"
                                    : lp.status === "approved"
                                      ? "bg-blue-500"
                                      : "bg-muted-foreground/30"
                                }`}
                              />
                              <span className="truncate">{lp.hypothesis || lp.proposal_type}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-5 py-3 border-t border-border/40 flex items-center justify-between bg-secondary/10">
                    <Link to={`/departments/${dept.slug}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-[11px] h-7 text-muted-foreground hover:text-foreground"
                      >
                        Enter Capability <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                    <Link to="/intake">
                      <Button size="sm" variant="default" className="text-[11px] h-7 gap-1">
                        Start Project
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
