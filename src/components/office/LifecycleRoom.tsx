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
  rework: "border-t-lifecycle-rework",
  blocked: "border-t-lifecycle-blocked",
  escalated: "border-t-lifecycle-escalated",
  validated: "border-t-lifecycle-validated",
  done: "border-t-lifecycle-done",
  release: "border-t-lifecycle-deploying",
};

const ROOM_HEADER_COLORS: Record<string, string> = {
  ready: "text-lifecycle-ready",
  assigned: "text-lifecycle-ready",
  in_progress: "text-lifecycle-in-progress",
  waiting_review: "text-lifecycle-review",
  rework: "text-lifecycle-rework",
  blocked: "text-lifecycle-blocked",
  escalated: "text-lifecycle-escalated",
  validated: "text-lifecycle-validated",
  done: "text-lifecycle-done",
  release: "text-lifecycle-deploying",
};

export function LifecycleRoom({ label, stateKey, tasks, onTaskClick }: LifecycleRoomProps) {
  const borderColor = ROOM_BORDER_COLORS[stateKey] ?? "border-t-muted";
  const headerColor = ROOM_HEADER_COLORS[stateKey] ?? "text-muted-foreground";

  return (
    <div className={`flex flex-col border border-border border-t-2 ${borderColor} rounded-[12px] bg-card min-h-0 h-full`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className={`text-[13px] font-semibold ${headerColor}`}>
          {label}
        </span>
        <span className={`text-[13px] font-mono font-bold ${tasks.length > 0 ? headerColor : "text-muted-foreground/30"}`}>
          {tasks.length}
        </span>
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-2">
          <span className="text-[11px] text-muted-foreground/30">—</span>
        </div>
      ) : (
        <ScrollArea className="flex-1 p-1.5">
          <div className="space-y-1">
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
