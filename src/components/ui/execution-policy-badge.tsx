/* ═══════════════════════════════════════════════════════════
   ExecutionPolicyBadge — compact display-only strip showing
   the active execution engine, provider, model, and mode.

   Accepts an optional `policyOverride` to display a local
   session override instead of the global default.
   ═══════════════════════════════════════════════════════════ */

import { useExecutionPolicy } from "@/hooks/use-execution-policy";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Cpu, Zap, Bot, Sparkles } from "lucide-react";
import type { ExecutionPolicy } from "@/types/execution";

const PROVIDER_LABEL: Record<string, string> = {
  anthropic: "Claude",
  openai: "GPT",
  google: "Gemini",
  local: "Local",
};

interface Props {
  /** Contextual label shown before the chips */
  label?: string;
  className?: string;
  /** If provided, renders this policy instead of the global one */
  policyOverride?: ExecutionPolicy | null;
  /** Whether this is showing an override (adds a visual marker) */
  isOverride?: boolean;
}

export function ExecutionPolicyBadge({ label, className, policyOverride, isOverride }: Props) {
  const { policy: globalPolicy, isLoading } = useExecutionPolicy();

  if (isLoading && !policyOverride) return null;

  const policy = policyOverride ?? globalPolicy;
  const isRuflo = policy.executionEngine === "ruflo";
  const isExperimental = policy.experimental;
  const EngineIcon = isRuflo ? Zap : Cpu;

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {label && (
        <span className="text-[11px] text-muted-foreground font-medium shrink-0">{label}</span>
      )}

      {/* Override marker */}
      {isOverride && (
        <Badge variant="outline" className="text-[9px] px-1.5 border-primary/40 text-primary font-semibold">
          session
        </Badge>
      )}

      {/* Engine */}
      <span className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
        isRuflo
          ? "border-status-amber/40 bg-status-amber/5 text-status-amber"
          : "border-border/50 bg-muted/30 text-foreground/70"
      )}>
        <EngineIcon className="h-3 w-3" />
        {isRuflo ? "Ruflo" : "Native"}
      </span>

      {/* Provider + Model */}
      <span className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground/70">
        <Bot className="h-3 w-3 text-muted-foreground" />
        {PROVIDER_LABEL[policy.providerFamily] ?? policy.providerFamily}
        <span className="font-mono text-[10px] text-muted-foreground">{policy.modelName}</span>
      </span>

      {/* Mode — only show if swarm */}
      {policy.orchestrationMode === "swarm" && (
        <span className="inline-flex items-center gap-1 rounded-md border border-status-amber/40 bg-status-amber/5 px-2 py-0.5 text-[11px] font-semibold text-status-amber">
          <Sparkles className="h-3 w-3" /> Swarm
        </span>
      )}

      {/* Experimental marker */}
      {isExperimental && (
        <Badge variant="outline" className="text-[9px] px-1.5 border-status-amber/40 text-status-amber font-normal">
          experimental
        </Badge>
      )}
    </div>
  );
}
