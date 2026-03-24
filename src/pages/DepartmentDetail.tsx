import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDepartment } from "@/hooks/use-department-data";
import { useProjects, useTasks } from "@/hooks/use-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  TrendingUp,
  FolderKanban,
  Gauge,
  AlertTriangle,
  ArrowRight,
  GraduationCap,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  ShieldAlert,
} from "lucide-react";

const STATUS_META: Record<string, { label: string; dot: string }> = {
  active: { label: "Working", dot: "bg-green-500 animate-pulse" },
  idle: { label: "Idle", dot: "bg-muted-foreground/25" },
  reviewing: { label: "Reviewing", dot: "bg-amber-500" },
  blocked: { label: "Blocked", dot: "bg-red-500" },
};

export default function DepartmentDetail() {
  const { slug = "" } = useParams();
  const { data: dept, isLoading: deptLoading } = useDepartment(slug);
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();

  const { data: employees = [] } = useQuery({
    queryKey: ["dept-employees"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_employees")
        .select("id, name, role_code, status, success_rate, avg_latency, avg_cost, bug_rate, escalation_rate, reputation_score, model_name, provider")
        .order("reputation_score", { ascending: false });
      return data ?? [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["dept-roles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_roles")
        .select("id, code, name, status, success_rate, performance_score, total_runs, capacity_score")
        .eq("status", "active");
      return data ?? [];
    },
  });

  const { data: learningProposals = [] } = useQuery({
    queryKey: ["dept-learning"],
    queryFn: async () => {
      const { data } = await supabase
        .from("learning_proposals")
        .select("id, proposal_type, status, hypothesis, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  if (deptLoading) {
    return <AppLayout title="Loading…"><p className="text-[12px] text-muted-foreground p-6">Loading…</p></AppLayout>;
  }
  if (!dept) {
    return <AppLayout title="Not found"><p className="text-[12px] text-muted-foreground p-6">Department not found.</p></AppLayout>;
  }

  const activeProjects = projects.filter((p) => ["active", "in_review", "scoped"].includes(p.state));
  const activeEmployees = employees.filter((e) => e.status === "active");
  const avgSuccess = activeEmployees.length > 0
    ? activeEmployees.reduce((s, e) => s + (e.success_rate ?? 0), 0) / activeEmployees.length
    : 0;

  const inProgressTasks = tasks.filter((t) => t.state === "in_progress");
  const reviewTasks = tasks.filter((t) => t.state === "waiting_review");
  const blockedTasks = tasks.filter((t) => t.state === "blocked");

  const pendingLearning = learningProposals.filter((l) => l.status === "candidate" || l.status === "approved");
  const recentPromoted = learningProposals.filter((l) => l.status === "promoted");
  const failedEvals = learningProposals.filter((l) => l.status === "rejected");

  // Derive employee status from tasks
  const getEmployeeStatus = (roleCode: string): string => {
    if (blockedTasks.some((t) => (t as any).agent_roles?.code === roleCode)) return "blocked";
    if (reviewTasks.some((t) => (t as any).agent_roles?.code === roleCode)) return "reviewing";
    if (inProgressTasks.some((t) => (t as any).agent_roles?.code === roleCode)) return "active";
    return "idle";
  };

  const getEmployeeTask = (roleCode: string): string | null => {
    const task = [...inProgressTasks, ...reviewTasks, ...blockedTasks].find(
      (t) => (t as any).agent_roles?.code === roleCode
    );
    return task ? task.title : null;
  };

  const totalCapacity = roles.reduce((s, r) => s + (r.capacity_score ?? 1), 0);
  const usedCapacity = roles.reduce((s, r) => s + Math.min(r.total_runs ?? 0, r.capacity_score ?? 1), 0);
  const loadPct = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;

  return (
    <AppLayout title={dept.name} fullHeight>
      <div className="grid-content px-6 py-4 space-y-4 h-full overflow-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Link to="/departments" className="hover:text-foreground transition-colors">Capabilities</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{dept.name}</span>
        </div>

        {/* ── TOP HEADER ──────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-semibold text-foreground tracking-tight">{dept.name}</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">{dept.description || "Specialized production capability"}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-semibold text-foreground">{activeEmployees.length}</span> team
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="font-semibold text-foreground">{Math.round(avgSuccess * 100)}%</span> success
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <FolderKanban className="h-3.5 w-3.5" />
                  <span className="font-semibold text-foreground">{activeProjects.length}</span> projects
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Gauge className="h-3.5 w-3.5" />
                  <span className="font-semibold text-foreground">{loadPct}%</span> load
                </span>
              </div>
              <Progress value={loadPct} className="h-1 mt-1.5 w-48" />
            </div>
          </div>
        </div>

        {/* ── SECTION 1: TEAM OVERVIEW ─────────────────────── */}
        <div>
          <h2 className="text-[14px] font-semibold text-foreground mb-3">Team</h2>
          {activeEmployees.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No active team members.</p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {activeEmployees.map((emp) => {
                const status = getEmployeeStatus(emp.role_code);
                const currentTask = getEmployeeTask(emp.role_code);
                const meta = STATUS_META[status] ?? STATUS_META.idle;
                const isUnderperforming = (emp.success_rate ?? 0) < 0.6 || (emp.bug_rate ?? 0) > 0.3;
                const roleName = roles.find((r) => r.code === emp.role_code)?.name ?? emp.role_code;

                return (
                  <Link key={emp.id} to={`/employees/${emp.id}`}>
                  <div
                    className={`ds-card p-3 hover:-translate-y-px transition-all cursor-pointer group ${
                      status === "blocked" ? "border-l-2 border-l-destructive" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Avatar */}
                      <div className="h-8 w-8 rounded-lg bg-foreground/5 flex items-center justify-center text-[10px] font-bold text-foreground/60 shrink-0">
                        {emp.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-semibold text-foreground truncate">{emp.name}</span>
                          {isUnderperforming && (
                            <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{roleName}</p>
                      </div>
                    </div>

                    {/* Status + task */}
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                      <span className="text-[10px] text-muted-foreground">{meta.label}</span>
                    </div>
                    {currentTask && (
                      <p className="text-[10px] text-foreground/60 mt-1 line-clamp-1 pl-3">
                        → {currentTask}
                      </p>
                    )}

                    {/* Metrics row */}
                    <div className="mt-2.5 pt-2 border-t border-border/30 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <TrendingUp className="h-2.5 w-2.5" />
                        {Math.round((emp.success_rate ?? 0) * 100)}%
                      </span>
                      <span className="flex items-center gap-0.5">
                        ★ {(emp.reputation_score ?? 0).toFixed(1)}
                      </span>
                      {emp.model_name && (
                        <span className="truncate text-[9px] ml-auto font-mono text-muted-foreground/50">
                          {emp.model_name}
                        </span>
                      )}
                    </div>
                  </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── SECTION 2: ACTIVE WORK ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <WorkSection
            title="In Progress"
            icon={<Loader2 className="h-3.5 w-3.5 text-muted-foreground" />}
            items={inProgressTasks.slice(0, 8)}
            accentClass="border-t-amber-500"
          />
          <WorkSection
            title="Pending Review"
            icon={<Eye className="h-3.5 w-3.5 text-muted-foreground" />}
            items={reviewTasks.slice(0, 8)}
            accentClass="border-t-violet-500"
          />
          <WorkSection
            title="Blocked"
            icon={<ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />}
            items={blockedTasks.slice(0, 8)}
            accentClass="border-t-destructive"
          />
        </div>

        {/* ── SECTION 3: LEARNING STATUS ──────────────────── */}
        <div>
          <h2 className="text-[14px] font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            Learning Status
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <LearningBlock
              title="Pending Proposals"
              count={pendingLearning.length}
              items={pendingLearning.slice(0, 4)}
              dotClass="bg-amber-500"
            />
            <LearningBlock
              title="Recent Improvements"
              count={recentPromoted.length}
              items={recentPromoted.slice(0, 4)}
              dotClass="bg-green-500"
            />
            <LearningBlock
              title="Failed Evaluations"
              count={failedEvals.length}
              items={failedEvals.slice(0, 4)}
              dotClass="bg-red-400"
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/* ── Work Section ────────────────────────────────────────────── */
function WorkSection({
  title, icon, items, accentClass,
}: {
  title: string;
  icon: React.ReactNode;
  items: any[];
  accentClass: string;
}) {
  return (
    <div className={`ds-card p-3 border-t-[3px] ${accentClass}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
          {icon} {title}
        </h3>
        <span className="text-[10px] text-muted-foreground font-mono">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[10px] text-muted-foreground/50">No items</p>
      ) : (
        <div className="space-y-1">
          {items.map((t) => (
            <Link key={t.id} to={`/control/tasks/${t.id}`}>
              <div className="flex items-center gap-2 py-1 hover:bg-secondary/30 rounded px-1.5 transition-colors">
                <span className="text-[11px] text-foreground/70 truncate flex-1">{t.title}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Learning Block ──────────────────────────────────────────── */
function LearningBlock({
  title, count, items, dotClass,
}: {
  title: string;
  count: number;
  items: any[];
  dotClass: string;
}) {
  return (
    <div className="ds-card p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[12px] font-semibold text-foreground">{title}</h3>
        <span className="text-[11px] font-semibold text-foreground">{count}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[10px] text-muted-foreground/50">None</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((lp) => (
            <div key={lp.id} className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dotClass}`} />
              <span className="line-clamp-1">{lp.hypothesis || lp.proposal_type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
