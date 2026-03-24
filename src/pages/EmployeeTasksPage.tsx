import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPersona, getStatusMeta } from "@/lib/personas";
import { ArrowLeft, ArrowUpRight, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STATE_DOT: Record<string, string> = {
  in_progress: "bg-status-amber",
  waiting_review: "bg-lifecycle-review",
  blocked: "bg-destructive",
  assigned: "bg-status-neutral",
  ready: "bg-status-blue",
  done: "bg-status-green",
  validated: "bg-status-green",
  cancelled: "bg-muted-foreground/20",
};

const STATE_LABEL: Record<string, string> = {
  in_progress: "In Progress",
  waiting_review: "Waiting Review",
  blocked: "Blocked",
  assigned: "Assigned",
  ready: "Ready",
  done: "Done",
  validated: "Validated",
  cancelled: "Cancelled",
};

export default function EmployeeTasksPage() {
  const { id = "" } = useParams();

  const { data: employee } = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      const { data } = await supabase.from("ai_employees").select("id, name, role_code, role_id, status").eq("id", id).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: roleData } = useQuery({
    queryKey: ["employee-role-name", employee?.role_id],
    queryFn: async () => {
      if (!employee?.role_id) return null;
      const { data } = await supabase.from("agent_roles").select("id, name").eq("id", employee.role_id).single();
      return data;
    },
    enabled: !!employee?.role_id,
  });

  const { data: activeTasks = [], isLoading: loadingActive } = useQuery({
    queryKey: ["emp-tasks-active", employee?.role_id],
    queryFn: async () => {
      if (!employee?.role_id) return [];
      const { data } = await supabase.from("tasks")
        .select("id, title, state, priority, updated_at, project_id")
        .eq("owner_role_id", employee.role_id)
        .in("state", ["in_progress", "assigned", "waiting_review", "blocked", "ready"])
        .order("updated_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!employee?.role_id,
  });

  const { data: completedTasks = [] } = useQuery({
    queryKey: ["emp-tasks-done", employee?.role_id],
    queryFn: async () => {
      if (!employee?.role_id) return [];
      const { data } = await supabase.from("tasks")
        .select("id, title, state, priority, updated_at, project_id")
        .eq("owner_role_id", employee.role_id)
        .in("state", ["done", "validated"])
        .order("updated_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!employee?.role_id,
  });

  const persona = employee ? getPersona(employee.role_code) : null;
  const st = employee ? getStatusMeta(employee.status) : null;
  const roleName = roleData?.name ?? employee?.role_code ?? "";

  const groups = [
    { key: "blocked", label: "Blocked", tasks: activeTasks.filter(t => t.state === "blocked") },
    { key: "waiting_review", label: "Waiting Review", tasks: activeTasks.filter(t => t.state === "waiting_review") },
    { key: "in_progress", label: "In Progress", tasks: activeTasks.filter(t => t.state === "in_progress") },
    { key: "assigned", label: "Assigned / Ready", tasks: activeTasks.filter(t => ["assigned", "ready"].includes(t.state)) },
    { key: "done", label: "Recently Completed", tasks: completedTasks },
  ];

  return (
    <AppLayout title={employee ? `${employee.name} — Tasks` : "Tasks"} fullHeight>
      <ScrollArea className="h-full">
        <div className="px-6 lg:px-8 py-5 max-w-[900px] space-y-5">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Link to="/office" className="hover:text-foreground transition-colors">Office</Link>
            <span className="text-border">/</span>
            <Link to={`/employees/${id}`} className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> {employee?.name ?? "Employee"}
            </Link>
            <span className="text-border">/</span>
            <span className="text-foreground font-medium">Tasks</span>
          </div>

          {/* Header */}
          {employee && persona && st && (
            <div className="flex items-center gap-3">
              <img src={persona.avatar} alt={employee.name} className="h-10 w-10 rounded-lg object-cover ring-1 ring-border/30" width={40} height={40} />
              <div>
                <h1 className="text-[18px] font-bold text-foreground tracking-tight">{employee.name}</h1>
                <p className="text-[12px] text-muted-foreground">{roleName} — Tasks owned by role contract</p>
              </div>
              <Badge variant="secondary" className="ml-auto text-[10px] h-auto py-0.5">{st.label}</Badge>
            </div>
          )}

          {/* Task groups */}
          {loadingActive ? (
            <p className="text-[13px] text-muted-foreground py-8">Loading tasks…</p>
          ) : (
            <div className="space-y-4">
              {groups.map(g => {
                if (g.tasks.length === 0) return null;
                return (
                  <div key={g.key}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${STATE_DOT[g.key] ?? "bg-muted-foreground/20"}`} />
                      <h2 className="text-[13px] font-bold text-foreground">{g.label}</h2>
                      <span className="text-[11px] text-muted-foreground/40 font-mono">{g.tasks.length}</span>
                    </div>
                    <div className="rounded-xl border border-border/40 bg-card divide-y divide-border/20">
                      {g.tasks.map(t => (
                        <Link key={t.id} to={`/control/tasks/${t.id}`}>
                          <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/15 transition-colors group">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATE_DOT[t.state] ?? "bg-muted-foreground/20"}`} />
                            <span className="text-[12px] text-foreground truncate flex-1">{t.title}</span>
                            <span className="text-[10px] text-muted-foreground/40">{STATE_LABEL[t.state] ?? t.state}</span>
                            {t.priority === "high" && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                            {t.updated_at && (
                              <span className="text-[10px] text-muted-foreground/30 font-mono">
                                {formatDistanceToNow(new Date(t.updated_at), { addSuffix: true })}
                              </span>
                            )}
                            <ArrowUpRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground shrink-0 transition-colors" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
              {activeTasks.length === 0 && completedTasks.length === 0 && (
                <p className="text-[12px] text-muted-foreground/40 py-6 text-center">No tasks assigned to this role.</p>
              )}
            </div>
          )}

          <div className="h-4" />
        </div>
      </ScrollArea>
    </AppLayout>
  );
}
