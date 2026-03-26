import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DEFAULT_SKILL_PACKS, SKILL_CATEGORY_CONFIG,
  type SkillPack,
} from "@/types/skill-pack";
import {
  Package, Check, Plus, Info,
} from "lucide-react";

interface SkillPackPanelProps {
  employeeName: string;
  /** IDs of skill packs currently attached (from local state) */
  attachedIds: string[];
  onToggle: (id: string) => void;
}

export function SkillPackPanel({ employeeName, attachedIds, onToggle }: SkillPackPanelProps) {
  const packs: SkillPack[] = DEFAULT_SKILL_PACKS.map((sp) => ({
    ...sp,
    attached: attachedIds.includes(sp.id),
  }));

  const attachedCount = packs.filter((p) => p.attached).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-muted-foreground/40" />
        <span className="text-[13px] font-bold text-foreground">Skill Packs</span>
        <span className="text-[10px] font-mono text-muted-foreground/50 ml-auto">
          {attachedCount}/{packs.length} attached
        </span>
      </div>

      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/20 border border-border/20">
        <Info className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
          Skill packs are reusable capability bundles. Attach packs to shape how {employeeName} approaches work.
          <span className="block mt-0.5 text-muted-foreground/40">Local draft — not persisted to database yet.</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {packs.map((pack) => {
          const cat = SKILL_CATEGORY_CONFIG[pack.category];
          return (
            <div
              key={pack.id}
              className={cn(
                "rounded-xl border p-3.5 transition-all cursor-pointer group",
                pack.attached
                  ? "border-primary/30 bg-primary/[0.03]"
                  : "border-border/40 bg-card hover:border-border/60",
              )}
              onClick={() => onToggle(pack.id)}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md", cat.color)}>
                  {cat.label}
                </span>
                <span className="text-[12px] font-bold text-foreground flex-1">{pack.name}</span>
                <div className={cn(
                  "h-5 w-5 rounded-md flex items-center justify-center shrink-0 transition-colors",
                  pack.attached ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground/30 group-hover:text-muted-foreground",
                )}>
                  {pack.attached ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground/60 leading-relaxed mb-2">{pack.description}</p>
              <div className="space-y-0.5">
                {pack.effects.map((effect, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/20 mt-1.5 shrink-0" />
                    <span className="text-[10px] text-muted-foreground/50">{effect}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
