import { Target, Truck, BadgeCheck, ShieldAlert, Eye, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectGuidancePack as GuidancePackType, GuidanceGroup } from "@/types/project-guidance";

const ICON_MAP: Record<string, React.ElementType> = {
  Target, Truck, BadgeCheck, ShieldAlert, Eye, AlertTriangle,
};

const SOURCE_STYLES: Record<string, string> = {
  brief: "bg-primary/10 text-primary",
  blueprint: "bg-status-blue/10 text-status-blue",
  founder: "bg-status-amber/10 text-status-amber",
  generated: "bg-muted text-muted-foreground",
};

function GuidanceGroupCard({ group }: { group: GuidanceGroup }) {
  const Icon = ICON_MAP[group.icon] ?? Info;

  return (
    <div className="rounded-xl border border-border/20 bg-card/40 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/10 bg-muted/20">
        <Icon className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.8} />
        <h4 className="text-[12px] font-bold text-foreground/80 tracking-tight">{group.title}</h4>
        <span className="text-[10px] font-mono text-muted-foreground/30 ml-auto">{group.entries.length}</span>
      </div>
      <div className="divide-y divide-border/8">
        {group.entries.map((entry, i) => (
          <div key={i} className="px-4 py-2.5 flex items-start gap-3">
            <span className="text-[11px] font-semibold text-muted-foreground/60 shrink-0 min-w-[100px] pt-0.5">
              {entry.label}
            </span>
            <p className="text-[12px] text-foreground/70 leading-relaxed flex-1">{entry.value}</p>
            <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider", SOURCE_STYLES[entry.source])}>
              {entry.source}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  guidancePack: GuidancePackType;
}

export function ProjectGuidancePack({ guidancePack }: Props) {
  return (
    <div className="space-y-3">
      {/* Draft notice */}
      {guidancePack.isDraft && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-status-amber/[0.04] border border-status-amber/15">
          <Info className="h-3.5 w-3.5 text-status-amber/60 shrink-0" />
          <p className="text-[11px] text-status-amber/70 leading-relaxed">
            Generated guidance — derived from current project state. Not yet persisted as canonical.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {guidancePack.groups.map((group) => (
          <GuidanceGroupCard key={group.key} group={group} />
        ))}
      </div>
    </div>
  );
}
