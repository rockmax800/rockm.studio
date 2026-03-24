import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, Plus, Rocket } from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  state: string;
  domain: string;
  roleName?: string;
  roleCode?: string;
  updatedAt: string;
  artifactCount: number;
}

interface TaskGraphProps {
  tasks: TaskItem[];
  projectId: string;
}

const GROUP_ORDER = ["blocked", "escalated", "in_progress", "waiting_review", "rework", "ready", "validated", "done", "draft", "cancelled"] as const;

const GROUP_LABELS: Record<string, string> = {
  blocked: "Blocked", escalated: "Escalated", in_progress: "In Progress",
  waiting_review: "Review", rework: "Rework", ready: "Ready",
  validated: "Validated", done: "Done", cancelled: "Cancelled", draft: "Draft",
};

const GROUP_DOT: Record<string, string> = {
  blocked: "bg-lifecycle-blocked", escalated: "bg-lifecycle-escalated",
  in_progress: "bg-lifecycle-in-progress", waiting_review: "bg-lifecycle-review",
  rework: "bg-lifecycle-rework", ready: "bg-lifecycle-ready",
  validated: "bg-lifecycle-validated", done: "bg-lifecycle-done",
  draft: "bg-lifecycle-draft", cancelled: "bg-status-muted",
};

const GROUP_TEXT: Record<string, string> = {
  blocked: "text-lifecycle-blocked", escalated: "text-lifecycle-escalated",
  in_progress: "text-lifecycle-in-progress", waiting_review: "text-lifecycle-review",
  rework: "text-lifecycle-rework", ready: "text-lifecycle-ready",
  validated: "text-lifecycle-validated", done: "text-lifecycle-done",
  draft: "text-muted-foreground", cancelled: "text-status-muted",
};

const LEFT_BORDER: Record<string, string> = {
  blocked: "border-l-lifecycle-blocked",
  escalated: "border-l-lifecycle-escalated",
  in_progress: "border-l-lifecycle-in-progress",
  waiting_review: "border-l-lifecycle-review",
};

export function TaskGraph({ tasks, projectId }: TaskGraphProps) {
  const grouped = GROUP_ORDER.reduce((acc, state) => {
    const items = tasks.filter((t) => t.state === state);
    if (items.length > 0) acc.push({ state, items });
    return acc;
  }, [] as { state: string; items: TaskItem[] }[]);

  const knownStates = new Set(GROUP_ORDER);
  const other = tasks.filter((t) => !knownStates.has(t.state as any));
  if (other.length > 0) grouped.push({ state: "other", items: other });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-bold text-foreground tracking-tight">Task Flow</h3>
          <span className="text-[14px] font-mono font-bold text-muted-foreground">{tasks.length}</span>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-secondary">
          <Rocket className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-[14px] font-semibold text-foreground">Start from Blueprint</p>
            <p className="text-[12px] text-muted-foreground">Create the first task to begin delivery.</p>
          </div>
          <div className="flex-1" />
          <Button size="sm" className="h-7 text-[12px] gap-1 bg-foreground text-background hover:bg-foreground/90 rounded-lg font-bold">
            <Plus className="h-3 w-3" /> Create Task
          </Button>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-2 pr-2">
          <div className="space-y-3">
            {grouped.map(({ state, items }) => (
              <div key={state}>
                <div className="flex items-center gap-2 px-1 mb-1">
                  <div className={`h-2 w-2 rounded-full ${GROUP_DOT[state] ?? "bg-muted-foreground"}`} />
                  <span className="text-[12px] font-bold text-foreground uppercase tracking-wider">
                    {GROUP_LABELS[state] ?? state}
                  </span>
                  <span className={`text-[12px] font-mono font-bold ${GROUP_TEXT[state] ?? "text-muted-foreground"}`}>
                    {items.length}
                  </span>
                </div>

                <div className="space-y-px">
                  {items.map((t) => {
                    const borderClass = LEFT_BORDER[t.state] ?? "";
                    return (
                      <Link key={t.id} to={`/control/tasks/${t.id}`}>
                        <div className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary/80 transition-colors cursor-pointer ${
                          borderClass ? `border-l-2 ${borderClass}` : ""
                        }`}>
                          {/* Role avatar */}
                          <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-mono font-bold text-muted-foreground">
                              {(t.roleCode ?? t.roleName ?? t.domain ?? "?").slice(0, 2).toUpperCase()}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-foreground truncate leading-snug">{t.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {t.roleName && <span className="text-[10px] text-muted-foreground">{t.roleName}</span>}
                              <span className="text-[10px] font-mono text-muted-foreground/50">{t.domain}</span>
                            </div>
                          </div>

                          {t.artifactCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-bold text-muted-foreground shrink-0">
                              {t.artifactCount}
                            </span>
                          )}

                          <span className="text-[10px] font-mono text-muted-foreground tabular-nums whitespace-nowrap shrink-0">
                            {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}
                          </span>

                          <ChevronRight className="h-3 w-3 text-border-strong group-hover:text-foreground transition-colors shrink-0" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
