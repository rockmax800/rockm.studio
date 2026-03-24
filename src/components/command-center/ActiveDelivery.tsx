import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronRight,
  Play,
  Eye,
  AlertTriangle,
  Rocket,
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

interface ActiveDeliveryProps {
  inProgress: DeliveryTask[];
  waitingReview: DeliveryTask[];
  blocked: DeliveryTask[];
}

const STATE_CFG: Record<string, { color: string; bg: string; icon: typeof Play; label: string }> = {
  in_progress: { color: "text-lifecycle-in-progress", bg: "bg-lifecycle-in-progress", icon: Play, label: "Running" },
  waiting_review: { color: "text-lifecycle-review", bg: "bg-lifecycle-review", icon: Eye, label: "Review" },
  blocked: { color: "text-lifecycle-blocked", bg: "bg-lifecycle-blocked", icon: AlertTriangle, label: "Blocked" },
};

function TaskRow({ task }: { task: DeliveryTask }) {
  const cfg = STATE_CFG[task.state] ?? STATE_CFG.in_progress;
  const Icon = cfg.icon;
  const isRunning = task.state === "in_progress";

  return (
    <Link to={`/control/tasks/${task.id}`}>
      <div className="group flex items-center gap-3 px-3 py-2.5 rounded-[12px] hover:bg-secondary transition-colors duration-180 cursor-pointer">
        <div className="relative shrink-0">
          <Icon className={`h-4 w-4 ${cfg.color}`} />
          {isRunning && (
            <div className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${cfg.bg} animate-run-pulse`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-foreground truncate">{task.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[12px] text-muted-foreground">{task.projectName}</span>
            {task.roleCode && (
              <span className="text-[11px] font-mono text-muted-foreground/60">{task.roleCode}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`ds-badge ${cfg.bg}/10 ${cfg.color} text-[10px]`}>{cfg.label}</span>
          <span className="text-[11px] font-mono text-muted-foreground tabular-nums hidden xl:inline">
            {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
          </span>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-border-strong group-hover:text-foreground transition-colors shrink-0" />
      </div>
    </Link>
  );
}

function SectionLabel({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-3 pb-1">
      <div className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-[13px] font-semibold text-foreground">{label}</span>
      <span className={`text-[13px] font-mono font-bold ${color.replace("bg-", "text-")}`}>{count}</span>
    </div>
  );
}

export function ActiveDelivery({ inProgress, waitingReview, blocked }: ActiveDeliveryProps) {
  const isEmpty = inProgress.length === 0 && waitingReview.length === 0 && blocked.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-section-title text-foreground">Active Work</h3>
        <Link to="/tasks">
          <Button variant="ghost" size="sm" className="h-7 text-[13px] gap-1 text-muted-foreground hover:text-foreground">
            All <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-start gap-2 px-3 py-3 rounded-lg bg-secondary">
          <p className="text-[14px] text-muted-foreground">
            Launch a project to start production.
          </p>
          <Link to="/presale/new">
            <Button size="sm" className="h-8 text-[13px] gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg">
              <Rocket className="h-3.5 w-3.5" /> Launch Project
            </Button>
          </Link>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-2 pr-2">
          <div>
            {blocked.length > 0 && (
              <div>
                <SectionLabel label="Blocked" count={blocked.length} color="bg-lifecycle-blocked" />
                {blocked.slice(0, 5).map((t) => <TaskRow key={t.id} task={t} />)}
              </div>
            )}
            {waitingReview.length > 0 && (
              <div>
                <SectionLabel label="Waiting Review" count={waitingReview.length} color="bg-lifecycle-review" />
                {waitingReview.slice(0, 5).map((t) => <TaskRow key={t.id} task={t} />)}
              </div>
            )}
            {inProgress.length > 0 && (
              <div>
                <SectionLabel label="In Progress" count={inProgress.length} color="bg-lifecycle-in-progress" />
                {inProgress.slice(0, 8).map((t) => <TaskRow key={t.id} task={t} />)}
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
