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
  ready: "border-t-lifecycle-ready",
  in_progress: "border-t-lifecycle-in-progress",
  waiting_review: "border-t-lifecycle-review",
  rework: "border-t-lifecycle-rework",
  blocked: "border-t-lifecycle-blocked",
  escalated: "border-t-lifecycle-escalated",
  validated: "border-t-lifecycle-validated",
  done: "border-t-lifecycle-done",
  release: "border-t-lifecycle-deploying",
};

const HEADER_COLOR: Record<string, string> = {
  ready: "text-lifecycle-ready",
  in_progress: "text-lifecycle-in-progress",
  waiting_review: "text-lifecycle-review",
  rework: "text-lifecycle-rework",
  blocked: "text-lifecycle-blocked",
  escalated: "text-lifecycle-escalated",
  validated: "text-lifecycle-validated",
  done: "text-lifecycle-done",
  release: "text-lifecycle-deploying",
};

const BG_TINT: Record<string, string> = {
  blocked: "bg-status-red/[0.02]",
  escalated: "bg-lifecycle-escalated/[0.02]",
  in_progress: "bg-status-amber/[0.02]",
};

export function LifecycleRoom({ label, stateKey, tasks, onTaskClick, compact }: LifecycleRoomProps) {
  const border = BORDER_TOP[stateKey] ?? "border-t-muted";
  const header = HEADER_COLOR[stateKey] ?? "text-muted-foreground";
  const bgTint = BG_TINT[stateKey] ?? "bg-card";

  return (
    <div className={`flex flex-col border border-border border-t-[3px] ${border} rounded-[12px] ${bgTint} min-h-0 h-full`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className={`text-[12px] font-bold uppercase tracking-wider ${header}`}>{label}</span>
        <span className={`text-[12px] font-mono font-bold ${tasks.length > 0 ? header : "text-muted-foreground/20"}`}>
          {tasks.length}
        </span>
      </div>

      {/* Tasks */}
      {tasks.length === 0 ? (
        <div className="px-3 pb-2">
          <span className="text-[10px] text-muted-foreground/30 italic">No tasks</span>
        </div>
      ) : (
        <ScrollArea className="flex-1 px-1.5 pb-1.5">
          <div className="space-y-1">
            {tasks.slice(0, compact ? 5 : 20).map((t) => (
              <OfficeTaskCard key={t.id} task={t} onClick={() => onTaskClick(t.id)} />
            ))}
            {tasks.length > (compact ? 5 : 20) && (
              <div className="text-[10px] text-muted-foreground/40 text-center py-1">
                +{tasks.length - (compact ? 5 : 20)} more
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
