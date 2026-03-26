import { Target, Truck, BadgeCheck, ShieldAlert, Eye, AlertTriangle, Info, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectGuidancePack, GuidanceGroup } from "@/types/project-guidance";
import { useState } from "react";

const ICON_MAP: Record<string, React.ElementType> = {
  Target, Truck, BadgeCheck, ShieldAlert, Eye, AlertTriangle,
};

function CompactGroup({ group }: { group: GuidanceGroup }) {
  const Icon = ICON_MAP[group.icon] ?? Info;
  const topEntry = group.entries[0];
  if (!topEntry) return null;

  return (
    <div className="py-2.5 first:pt-0 last:pb-0">
      <h5 className="text-[10px] font-bold text-foreground/50 flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 text-muted-foreground/30" /> {group.title}
      </h5>
      <p className="text-[10px] text-muted-foreground/60 leading-relaxed truncate">{topEntry.value}</p>
      {group.entries.length > 1 && (
        <span className="text-[9px] text-muted-foreground/25 font-mono">+{group.entries.length - 1} more</span>
      )}
    </div>
  );
}

interface Props {
  guidancePack: ProjectGuidancePack | null;
}

export function GuidancePreview({ guidancePack }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!guidancePack) {
    return (
      <div className="mx-4 mb-3 rounded-lg border border-border/20 bg-card/60 overflow-hidden">
        <div className="px-3 py-2 border-b border-border/10">
          <h4 className="text-[11px] font-bold text-muted-foreground/60 flex items-center gap-1.5">
            <BookOpen className="h-3 w-3 text-muted-foreground/30" /> Project Guidance
          </h4>
        </div>
        <div className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground/40">No project context available</p>
        </div>
      </div>
    );
  }

  const displayGroups = expanded ? guidancePack.groups : guidancePack.groups.slice(0, 3);

  return (
    <div className="mx-4 mb-3 rounded-lg border border-border/20 bg-card/60 overflow-hidden">
      <div className="px-3 py-2 border-b border-border/10 flex items-center justify-between">
        <h4 className="text-[11px] font-bold text-muted-foreground/60 flex items-center gap-1.5">
          <BookOpen className="h-3 w-3 text-muted-foreground/30" /> Project Guidance
        </h4>
        {guidancePack.isDraft && (
          <span className="text-[8px] font-bold text-status-amber/50 uppercase tracking-wider">draft</span>
        )}
      </div>
      <div className="px-3 divide-y divide-border/8">
        {displayGroups.map((group) => (
          <CompactGroup key={group.key} group={group} />
        ))}
      </div>
      {guidancePack.groups.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-3 py-1.5 text-[9px] text-muted-foreground/40 hover:text-muted-foreground/60 border-t border-border/8 text-center transition-colors"
        >
          {expanded ? "Show less" : `+${guidancePack.groups.length - 3} more sections`}
        </button>
      )}
    </div>
  );
}
