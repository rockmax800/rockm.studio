import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronRight, Play, Eye, AlertTriangle, Rocket,
  FolderKanban, Activity, Shield,
} from "lucide-react";

interface DeliveryTask {
  id: string;
  projectName: string;
  projectId: string;
  title: string;
  state: string;
  roleName?: string;
  roleCode?: string;
  updatedAt: string;
}

interface ActiveProject {
  id: string;
  name: string;
  state: string;
}

interface ActiveDeliveryProps {
  inProgress: DeliveryTask[];
  waitingReview: DeliveryTask[];
  blocked: DeliveryTask[];
  activeProjects?: ActiveProject[];
}

const STATE_DOT: Record<string, string> = {
  in_progress: "bg-status-amber",
  waiting_review: "bg-lifecycle-review",
  blocked: "bg-destructive",
};

const PROJECT_STATE_LABEL: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-status-amber/10 text-status-amber" },
  in_review: { label: "Review", cls: "bg-lifecycle-review/10 text-lifecycle-review" },
  completed: { label: "Done", cls: "bg-status-green/10 text-status-green" },
};

export function ActiveDelivery({ inProgress, waitingReview, blocked, activeProjects = [] }: ActiveDeliveryProps) {
  const isEmpty = inProgress.length === 0 && waitingReview.length === 0 && blocked.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[16px] font-bold text-foreground tracking-tight">Delivery Snapshot</h3>
          <span className="text-[12px] font-mono text-muted-foreground/50">
            {inProgress.length + waitingReview.length + blocked.length} tasks
          </span>
        </div>
        <Link to="/tasks">
          <Button variant="ghost" size="sm" className="h-6 text-[12px] gap-1 text-muted-foreground hover:text-foreground">
            All <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      {/* Active projects strip */}
      {activeProjects.length > 0 && (
        <div className="mb-3 space-y-1">
          {activeProjects.slice(0, 4).map((p) => {
            const cfg = PROJECT_STATE_LABEL[p.state] ?? { label: p.state, cls: "bg-secondary text-muted-foreground" };
            return (
              <Link key={p.id} to={`/control/projects/${p.id}`}>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors group">
                  <FolderKanban className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                  <span className="text-[13px] font-semibold text-foreground truncate flex-1">{p.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/20 group-hover:text-muted-foreground transition-colors shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {isEmpty ? (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary/50 text-[13px] text-muted-foreground">
          <Activity className="h-3.5 w-3.5" />
          <span>No active tasks. Start a project to begin delivery.</span>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-1 pr-1">
          <div className="space-y-0.5">
            {blocked.length > 0 && (
              <>
                <SectionLabel label="Blocked" count={blocked.length} dotCls="bg-destructive" />
                {blocked.slice(0, 4).map((t) => <TaskRow key={t.id} task={t} />)}
              </>
            )}
            {waitingReview.length > 0 && (
              <>
                <SectionLabel label="Review" count={waitingReview.length} dotCls="bg-lifecycle-review" />
                {waitingReview.slice(0, 4).map((t) => <TaskRow key={t.id} task={t} />)}
              </>
            )}
            {inProgress.length > 0 && (
              <>
                <SectionLabel label="In Progress" count={inProgress.length} dotCls="bg-status-amber" />
                {inProgress.slice(0, 6).map((t) => <TaskRow key={t.id} task={t} />)}
              </>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function SectionLabel({ label, count, dotCls }: { label: string; count: number; dotCls: string }) {
  return (
    <div className="flex items-center gap-2 px-2 pt-2.5 pb-1">
      <div className={`h-2 w-2 rounded-full ${dotCls}`} />
      <span className="text-[12px] font-bold text-foreground uppercase tracking-wider">{label}</span>
      <span className="text-[12px] font-mono font-bold text-muted-foreground/50">{count}</span>
    </div>
  );
}

function TaskRow({ task }: { task: DeliveryTask }) {
  const dot = STATE_DOT[task.state] ?? "bg-muted-foreground/30";
  const isBlocked = task.state === "blocked";

  return (
    <Link to={`/control/tasks/${task.id}`}>
      <div className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors cursor-pointer ${
        isBlocked ? "hover:bg-destructive/5" : "hover:bg-secondary/50"
      }`}>
        <div className={`h-2 w-2 rounded-full shrink-0 ${dot} ${task.state === "in_progress" ? "animate-pulse" : ""}`} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-foreground truncate">{task.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-muted-foreground/60 truncate">{task.projectName}</span>
            {task.roleCode && (
              <span className="text-[10px] font-mono text-muted-foreground/30">{task.roleCode}</span>
            )}
          </div>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground/40 tabular-nums hidden xl:inline shrink-0">
          {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
        </span>
        <ChevronRight className="h-3 w-3 text-muted-foreground/15 group-hover:text-muted-foreground/50 transition-colors shrink-0" />
      </div>
    </Link>
  );
}
