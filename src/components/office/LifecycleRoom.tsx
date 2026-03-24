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
  ready: "border-t-blue-400",
  in_progress: "border-t-amber-400",
  waiting_review: "border-t-violet-500",
  rework: "border-t-orange-500",
  blocked: "border-t-red-500",
  escalated: "border-t-pink-600",
  validated: "border-t-emerald-500",
  done: "border-t-green-500",
  release: "border-t-indigo-500",
};

const HEADER_COLOR: Record<string, string> = {
  ready: "text-blue-600",
  in_progress: "text-amber-600",
  waiting_review: "text-violet-600",
  rework: "text-orange-600",
  blocked: "text-red-600",
  escalated: "text-pink-700",
  validated: "text-emerald-600",
  done: "text-green-600",
  release: "text-indigo-600",
};

const BG_TINT: Record<string, string> = {
  blocked: "bg-red-50/30",
  escalated: "bg-pink-50/20",
  in_progress: "bg-amber-50/15",
  waiting_review: "bg-violet-50/15",
};

const COUNT_BG: Record<string, string> = {
  blocked: "bg-red-100 text-red-700",
  escalated: "bg-pink-100 text-pink-700",
  in_progress: "bg-amber-100 text-amber-700",
  waiting_review: "bg-violet-100 text-violet-700",
  ready: "bg-blue-100 text-blue-700",
  validated: "bg-emerald-100 text-emerald-700",
  done: "bg-green-100 text-green-700",
  release: "bg-indigo-100 text-indigo-700",
  rework: "bg-orange-100 text-orange-700",
};

export function LifecycleRoom({ label, stateKey, tasks, onTaskClick, compact }: LifecycleRoomProps) {
  const border = BORDER_TOP[stateKey] ?? "border-t-muted";
  const header = HEADER_COLOR[stateKey] ?? "text-muted-foreground";
  const bgTint = BG_TINT[stateKey] ?? "bg-card";
  const countCls = COUNT_BG[stateKey] ?? "bg-secondary text-muted-foreground";

  return (
    <div className={`flex flex-col border border-border/60 border-t-[3px] ${border} rounded-xl ${bgTint} min-h-0 h-full overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/20">
        <span className={`text-[13px] font-bold uppercase tracking-wider ${header}`}>{label}</span>
        <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-full ${tasks.length > 0 ? countCls : "bg-secondary/50 text-muted-foreground/30"}`}>
          {tasks.length}
        </span>
      </div>

      {/* Tasks */}
      {tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-3 py-4">
          <span className="text-[12px] text-muted-foreground/30">No tasks</span>
        </div>
      ) : (
        <ScrollArea className="flex-1 px-2 pb-2 pt-1">
          <div className="space-y-1.5">
            {tasks.slice(0, compact ? 5 : 25).map((t) => (
              <OfficeTaskCard key={t.id} task={t} onClick={() => onTaskClick(t.id)} />
            ))}
            {tasks.length > (compact ? 5 : 25) && (
              <div className="text-[11px] text-muted-foreground/40 text-center py-2 font-medium">
                +{tasks.length - (compact ? 5 : 25)} more
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
