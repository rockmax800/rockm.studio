import { ScrollArea } from "@/components/ui/scroll-area";
import { OfficeTaskCard, type OfficeTaskCardData } from "./OfficeTaskCard";

interface LifecycleRoomProps {
  label: string;
  stateKey: string;
  tasks: OfficeTaskCardData[];
  onTaskClick: (taskId: string) => void;
}

const ROOM_BORDER_COLORS: Record<string, string> = {
  ready: "border-t-lifecycle-ready",
  assigned: "border-t-lifecycle-ready",
  in_progress: "border-t-lifecycle-in-progress",
  waiting_review: "border-t-lifecycle-review",
  rework: "border-t-status-amber",
  blocked: "border-t-lifecycle-blocked",
  escalated: "border-t-lifecycle-escalated",
  validated: "border-t-lifecycle-validated",
  done: "border-t-lifecycle-done",
  release: "border-t-lifecycle-running",
};

const ROOM_HEADER_COLORS: Record<string, string> = {
  ready: "text-lifecycle-ready",
  assigned: "text-lifecycle-ready",
  in_progress: "text-lifecycle-in-progress",
  waiting_review: "text-lifecycle-review",
  rework: "text-status-amber",
  blocked: "text-lifecycle-blocked",
  escalated: "text-lifecycle-escalated",
  validated: "text-lifecycle-validated",
  done: "text-lifecycle-done",
  release: "text-lifecycle-running",
};

export function LifecycleRoom({ label, stateKey, tasks, onTaskClick }: LifecycleRoomProps) {
  const borderColor = ROOM_BORDER_COLORS[stateKey] ?? "border-t-muted-foreground";
  const headerColor = ROOM_HEADER_COLORS[stateKey] ?? "text-muted-foreground";

  return (
    <div className={`flex flex-col border border-border/20 border-t-2 ${borderColor} rounded-lg bg-card/20 min-h-0 h-full`}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/15">
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-semibold uppercase tracking-wider ${headerColor}`}>
            {label}
          </span>
        </div>
        <span className={`text-[10px] font-mono font-bold ${headerColor}`}>
          {tasks.length}
        </span>
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-2">
          <span className="text-[8px] text-muted-foreground/30 font-mono">—</span>
        </div>
      ) : (
        <ScrollArea className="flex-1 p-1">
          <div className="space-y-0.5">
            {tasks.map((t) => (
              <OfficeTaskCard
                key={t.id}
                task={t}
                onClick={() => onTaskClick(t.id)}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
