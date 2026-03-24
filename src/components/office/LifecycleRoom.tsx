import { ScrollArea } from "@/components/ui/scroll-area";
import { OfficeTaskCard, type OfficeTaskCardData } from "./OfficeTaskCard";

interface LifecycleRoomProps {
  label: string;
  stateKey: string;
  tasks: OfficeTaskCardData[];
  onTaskClick: (taskId: string) => void;
  compact?: boolean;
}

const BORDER_TOP: Record<string, string> = {
  ready: "border-t-status-blue",
  in_progress: "border-t-status-amber",
  waiting_review: "border-t-lifecycle-review",
  rework: "border-t-status-amber",
  blocked: "border-t-destructive",
  escalated: "border-t-destructive",
  validated: "border-t-status-green",
  done: "border-t-status-green",
  release: "border-t-primary",
};

const COUNT_CLS: Record<string, string> = {
  blocked: "text-destructive",
  escalated: "text-destructive",
  in_progress: "text-status-amber",
  waiting_review: "text-lifecycle-review",
  ready: "text-status-blue",
  validated: "text-status-green",
  done: "text-status-green",
  release: "text-primary",
  rework: "text-status-amber",
};

export function LifecycleRoom({ label, stateKey, tasks, onTaskClick, compact }: LifecycleRoomProps) {
  const border = BORDER_TOP[stateKey] ?? "border-t-border";
  const countColor = COUNT_CLS[stateKey] ?? "text-muted-foreground";

  return (
    <div className={`flex flex-col border border-border/40 border-t-[3px] ${border} rounded-xl bg-card min-h-0 h-full overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/20">
        <span className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground/60">{label}</span>
        <span className={`text-[11px] font-bold font-mono ${tasks.length > 0 ? countColor : "text-muted-foreground/20"}`}>
          {tasks.length}
        </span>
      </div>

      {/* Tasks */}
      {tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-3 py-4">
          <span className="text-[12px] text-muted-foreground/20">No tasks</span>
        </div>
      ) : (
        <ScrollArea className="flex-1 px-2 pb-2 pt-1">
          <div className="space-y-1.5">
            {tasks.slice(0, compact ? 5 : 25).map((t) => (
              <OfficeTaskCard key={t.id} task={t} onClick={() => onTaskClick(t.id)} />
            ))}
            {tasks.length > (compact ? 5 : 25) && (
              <div className="text-[11px] text-muted-foreground/30 text-center py-2 font-medium">
                +{tasks.length - (compact ? 5 : 25)} more
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
