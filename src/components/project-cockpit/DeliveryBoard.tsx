import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle, Clock, CheckCircle2, Rocket, ArrowUpRight,
  Loader2, Eye, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface BoardTask {
  id: string;
  title: string;
  state: string;
  domain?: string;
  priority?: string;
  updated_at: string;
  owner_role_name?: string;
  owner_role_code?: string;
}

interface DeliveryBoardProps {
  tasks: BoardTask[];
  projectId: string;
}

/* ═══════════════════════════════════════════════════════════
   COLUMN DEFINITIONS
   ═══════════════════════════════════════════════════════════ */

const COLUMNS = [
  {
    key: "ready",
    label: "Ready",
    states: ["ready", "assigned"],
    icon: <Zap className="h-3.5 w-3.5" />,
    dotCls: "bg-status-neutral",
    headerCls: "border-t-muted-foreground/20",
  },
  {
    key: "in_progress",
    label: "In Progress",
    states: ["in_progress"],
    icon: <Loader2 className="h-3.5 w-3.5" />,
    dotCls: "bg-status-amber",
    headerCls: "border-t-status-amber",
  },
  {
    key: "review",
    label: "Review",
    states: ["waiting_review"],
    icon: <Eye className="h-3.5 w-3.5" />,
    dotCls: "bg-lifecycle-review",
    headerCls: "border-t-lifecycle-review",
  },
  {
    key: "blocked",
    label: "Blocked",
    states: ["blocked", "escalated", "rework_required"],
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    dotCls: "bg-destructive",
    headerCls: "border-t-destructive",
  },
  {
    key: "validated",
    label: "Validated",
    states: ["validated"],
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    dotCls: "bg-status-green",
    headerCls: "border-t-status-green",
  },
  {
    key: "done",
    label: "Done",
    states: ["done"],
    icon: <Rocket className="h-3.5 w-3.5" />,
    dotCls: "bg-status-green/60",
    headerCls: "border-t-status-green/40",
  },
] as const;

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

export function DeliveryBoard({ tasks, projectId }: DeliveryBoardProps) {
  const buckets = COLUMNS.map((col) => ({
    ...col,
    tasks: tasks.filter((t) => col.states.includes(t.state)),
  }));

  if (tasks.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-[12px] text-muted-foreground/40">No tasks in this project yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 min-h-[280px]">
      {buckets.map((col) => (
        <div key={col.key} className={cn(
          "rounded-xl border border-border/30 bg-secondary/20 flex flex-col min-h-0 overflow-hidden",
          "border-t-[3px]",
          col.headerCls,
        )}>
          {/* Column header */}
          <div className="px-3 py-2.5 flex items-center gap-2 border-b border-border/20 shrink-0">
            <span className="text-muted-foreground/40">{col.icon}</span>
            <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">{col.label}</span>
            <span className="ml-auto text-[10px] font-mono font-bold text-muted-foreground/30">{col.tasks.length}</span>
          </div>

          {/* Cards */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 space-y-1.5">
              {col.tasks.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/25 text-center py-4">—</p>
              ) : (
                col.tasks.map((task) => (
                  <Link key={task.id} to={`/control/tasks/${task.id}`}>
                    <div className="rounded-lg border border-border/20 bg-card px-3 py-2.5 hover:bg-surface-glass transition-colors group cursor-pointer">
                      <p className="text-[11px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {task.owner_role_name && (
                          <span className="text-[9px] font-medium text-muted-foreground/50 bg-muted/40 px-1.5 py-0.5 rounded">
                            {task.owner_role_name}
                          </span>
                        )}
                        {task.priority === "high" || task.priority === "blocker" ? (
                          <AlertTriangle className="h-3 w-3 text-destructive/60" />
                        ) : null}
                      </div>
                      <p className="text-[9px] text-muted-foreground/30 mt-1 font-mono">
                        {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}
