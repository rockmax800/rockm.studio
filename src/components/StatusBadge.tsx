import { Badge } from "@/components/ui/badge";
import { getStatusVariant, formatState } from "@/lib/status";

interface StatusBadgeProps {
  state: string;
  className?: string;
}

export function StatusBadge({ state, className }: StatusBadgeProps) {
  const variant = getStatusVariant(state);
  return (
    <Badge variant={variant} className={className}>
      {formatState(state)}
    </Badge>
  );
}

interface PriorityBadgeProps {
  priority: "normal" | "high" | "blocker";
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const variant = priority === "blocker" ? "red" : priority === "high" ? "amber" : "neutral";
  return (
    <Badge variant={variant} className={className}>
      {priority}
    </Badge>
  );
}