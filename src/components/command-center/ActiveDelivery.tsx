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
  CircleDot,
  GitPullRequest,
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

const STATE_CONFIG: Record<string, { color: string; bg: string; icon: typeof Play; label: string }> = {
  in_progress: { color: "text-lifecycle-in-progress", bg: "bg-lifecycle-in-progress", icon: Play, label: "Running" },
  waiting_review: { color: "text-lifecycle-review", bg: "bg-lifecycle-review", icon: Eye, label: "Review" },
  blocked: { color: "text-lifecycle-blocked", bg: "bg-lifecycle-blocked", icon: AlertTriangle, label: "Blocked" },
};

function TaskRow({ task }: { task: DeliveryTask }) {
  const config = STATE_CONFIG[task.state] ?? STATE_CONFIG.in_progress;
  const Icon = config.icon;
  const isRunning = task.state === "in_progress";

  return (
    <Link to={`/control/tasks/${task.id}`}>
      <div className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-glass/60 transition-all hover:translate-x-0.5 cursor-pointer">
        <div className="relative shrink-0">
          <Icon className={`h-3.5 w-3.5 ${config.color}`} />
          {isRunning && (
            <div className={`absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ${config.bg} animate-pulse`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium truncate leading-tight text-foreground">{task.title}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Badge variant="outline" className="text-[7px] px-1 py-0 h-3 border-border/40 truncate max-w-[80px] font-medium">
              {task.projectName}
            </Badge>
            {task.roleCode && (
              <span className="text-[8px] text-muted-foreground font-mono">{task.roleCode}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline" className={`text-[7px] px-1 py-0 h-3 border-0 ${config.color} bg-transparent font-bold`}>
            {config.label}
          </Badge>
          <span className="text-[8px] font-mono text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
          </span>
        </div>
        <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/20 group-hover:text-primary transition-colors shrink-0" />
      </div>
    </Link>
  );
}

function SectionHeader({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 pt-2 pb-1">
      <div className={`h-1.5 w-1.5 rounded-full ${color}`} />
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={`text-[10px] font-mono font-bold ${color.replace("bg-", "text-")}`}>{count}</span>
    </div>
  );
}

export function ActiveDelivery({ inProgress, waitingReview, blocked }: ActiveDeliveryProps) {
  const isEmpty = inProgress.length === 0 && waitingReview.length === 0 && blocked.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">
          Active Delivery
        </h2>
        <Link to="/tasks">
          <Button variant="ghost" size="sm" className="h-5 text-[9px] gap-0.5 text-muted-foreground px-1.5">
            All <ChevronRight className="h-2.5 w-2.5" />
          </Button>
        </Link>
      </div>

      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <Rocket className="h-5 w-5 text-muted-foreground/30" />
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed max-w-[180px]">
            Delivery floor idle. Launch project to start production.
          </p>
          <Link to="/presale/new">
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 border-primary/30 text-primary hover:bg-primary/10">
              <Rocket className="h-3 w-3" /> Launch Project
            </Button>
          </Link>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-1 pr-1">
          <div className="space-y-0.5">
            {blocked.length > 0 && (
              <div>
                <SectionHeader label="Blocked" count={blocked.length} color="bg-status-red" />
                {blocked.slice(0, 5).map((t) => <TaskRow key={t.id} task={t} />)}
              </div>
            )}
            {waitingReview.length > 0 && (
              <div>
                <SectionHeader label="Waiting Review" count={waitingReview.length} color="bg-lifecycle-review" />
                {waitingReview.slice(0, 5).map((t) => <TaskRow key={t.id} task={t} />)}
              </div>
            )}
            {inProgress.length > 0 && (
              <div>
                <SectionHeader label="In Progress" count={inProgress.length} color="bg-lifecycle-in-progress" />
                {inProgress.slice(0, 8).map((t) => <TaskRow key={t.id} task={t} />)}
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
