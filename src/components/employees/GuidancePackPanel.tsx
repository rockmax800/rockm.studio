import { cn } from "@/lib/utils";
import {
  DEFAULT_GUIDANCE_DIMENSIONS,
  DEFAULT_SKILL_PACKS,
  SKILL_CATEGORY_CONFIG,
  type GuidanceDimension,
} from "@/types/skill-pack";
import {
  Sliders, Info, Check, Package, FileText,
} from "lucide-react";

interface GuidancePackPanelProps {
  employeeName: string;
  dimensions: GuidanceDimension[];
  onDimensionChange: (key: string, value: number) => void;
  attachedSkillPackIds: string[];
  hasPublishedPrompt: boolean;
}

export function GuidancePackPanel({
  employeeName,
  dimensions,
  onDimensionChange,
  attachedSkillPackIds,
  hasPublishedPrompt,
}: GuidancePackPanelProps) {
  const attachedPacks = DEFAULT_SKILL_PACKS.filter((sp) => attachedSkillPackIds.includes(sp.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sliders className="h-4 w-4 text-muted-foreground/40" />
        <span className="text-[13px] font-bold text-foreground">Current Guidance</span>
        <span className="text-[10px] text-muted-foreground/50 ml-auto">
          {hasPublishedPrompt ? "Published prompt active" : "Draft only"}
        </span>
      </div>

      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/20 border border-border/20">
        <Info className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
          Guidance shapes {employeeName}'s working style. Adjust dimensions to calibrate behavior.
          <span className="block mt-0.5 text-muted-foreground/40">Local draft — publish through Training Lab to activate.</span>
        </p>
      </div>

      {/* Dimensions */}
      <div className="space-y-3">
        {dimensions.map((dim) => (
          <div key={dim.key} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-foreground">{dim.label}</span>
              <span className="text-[10px] font-mono text-muted-foreground/50">{dim.value}/5</span>
            </div>
            <p className="text-[10px] text-muted-foreground/40">{dim.description}</p>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-muted-foreground/40 w-[80px] text-right shrink-0">{dim.labels[0]}</span>
              <div className="flex-1 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    onClick={() => onDimensionChange(dim.key, v)}
                    className={cn(
                      "flex-1 h-2 rounded-full transition-colors",
                      v <= dim.value ? "bg-primary" : "bg-muted/40",
                    )}
                  />
                ))}
              </div>
              <span className="text-[9px] text-muted-foreground/40 w-[80px] shrink-0">{dim.labels[1]}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Attached Skill Packs summary */}
      <div className="pt-3 border-t border-border/20">
        <div className="flex items-center gap-2 mb-2">
          <Package className="h-3.5 w-3.5 text-muted-foreground/40" />
          <span className="text-[12px] font-bold text-foreground">Attached Skill Packs</span>
        </div>
        {attachedPacks.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/40">No skill packs attached yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {attachedPacks.map((sp) => {
              const cat = SKILL_CATEGORY_CONFIG[sp.category];
              return (
                <div key={sp.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border/30 bg-card">
                  <Check className="h-3 w-3 text-primary shrink-0" />
                  <span className="text-[11px] font-semibold text-foreground">{sp.name}</span>
                  <span className={cn("text-[8px] font-bold px-1 py-0.5 rounded", cat.color)}>{cat.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Published prompt status */}
      <div className="pt-3 border-t border-border/20">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground/40" />
          <span className="text-[12px] font-bold text-foreground">Published Prompt</span>
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded ml-auto",
            hasPublishedPrompt ? "bg-status-green/15 text-status-green" : "bg-muted/30 text-muted-foreground/50",
          )}>
            {hasPublishedPrompt ? "Active" : "None"}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground/40 mt-1">
          {hasPublishedPrompt
            ? "This agent's behavior is governed by a published prompt. Skill packs and guidance dimensions shape future drafts."
            : "No published prompt. Use the Training Lab to create, refine, and publish guidance."}
        </p>
      </div>
    </div>
  );
}
