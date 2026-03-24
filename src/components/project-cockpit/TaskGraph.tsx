import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, Plus, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaskItem {
  id: string;
  title: string;
  state: string;
  domain: string;
  roleName?: string;
  updatedAt: string;
  artifactCount: number;
}

interface TaskGraphProps {
  tasks: TaskItem[];
  projectId: string;
}

const GROUP_ORDER = ["blocked", "in_progress", "waiting_review", "rework", "ready", "validated", "done", "cancelled", "draft", "escalated"] as const;

const GROUP_LABELS: Record<string, string> = {
  blocked: "Blocked",
  in_progress: "In Progress",
  waiting_review: "Review",
  rework: "Rework",
  ready: "Ready",
  validated: "Validated",
  done: "Done",
  cancelled: "Cancelled",
  draft: "Draft",
  escalated: "Escalated",
};

const GROUP_DOT_COLORS: Record<string, string> = {
  blocked: "bg-lifecycle-blocked",
  in_progress: "bg-lifecycle-in-progress",
  waiting_review: "bg-lifecycle-review",
  rework: "bg-status-amber",
  ready: "bg-lifecycle-ready",
  validated: "bg-lifecycle-validated",
  done: "bg-lifecycle-done",
  escalated: "bg-lifecycle-escalated",
  draft: "bg-lifecycle-draft",
  cancelled: "bg-status-muted",
};

export function TaskGraph({ tasks, projectId }: TaskGraphProps) {
  const grouped = GROUP_ORDER.reduce((acc, state) => {
    const items = tasks.filter((t) => t.state === state);
    if (items.length > 0) acc.push({ state, items });
    return acc;
  }, [] as { state: string; items: TaskItem[] }[]);

  // Catch any states not in GROUP_ORDER
  const knownStates = new Set(GROUP_ORDER);
  const other = tasks.filter((t) => !knownStates.has(t.state as any));
  if (other.length > 0) grouped.push({ state: "other", items: other });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Tasks ({tasks.length})
        </h2>
      </div>

      {tasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 border border-dashed border-border/50 rounded-lg p-4">
          <Rocket className="h-5 w-5 text-muted-foreground/30" />
          <p className="text-[10px] text-muted-foreground text-center">Start first task from blueprint</p>
          <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 border-border/50">
            <Plus className="h-3 w-3" /> Create Task
          </Button>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-1 pr-1">
          <div className="space-y-2">
            {grouped.map(({ state, items }) => (
              <div key={state}>
                <div className="flex items-center gap-1.5 px-1 mb-1">
                  <div className={`h-1.5 w-1.5 rounded-full ${GROUP_DOT_COLORS[state] ?? "bg-muted-foreground"}`} />
                  <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {GROUP_LABELS[state] ?? state}
                  </span>
                  <span className="text-[8px] font-mono text-muted-foreground">{items.length}</span>
                </div>
                <div className="space-y-0.5">
                  {items.map((t) => (
                    <Link key={t.id} to={`/control/tasks/${t.id}`}>
                      <div className="group flex items-center gap-2 px-2 py-1.5 rounded bg-card/50 border border-border/20 hover:border-primary/20 transition-colors cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium truncate leading-tight">{t.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[7px] font-mono text-muted-foreground">{t.domain}</span>
                            {t.roleName && (
                              <>
                                <span className="text-[7px] text-muted-foreground/40">·</span>
                                <span className="text-[7px] text-muted-foreground">{t.roleName}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {t.artifactCount > 0 && (
                          <Badge variant="outline" className="text-[6px] px-1 py-0 h-3 border-border/40">
                            {t.artifactCount}
                          </Badge>
                        )}
                        <span className="text-[7px] font-mono text-muted-foreground whitespace-nowrap shrink-0">
                          {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}
                        </span>
                        <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/20 group-hover:text-primary transition-colors shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
