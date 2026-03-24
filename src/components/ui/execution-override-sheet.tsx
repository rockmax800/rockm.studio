/* ═══════════════════════════════════════════════════════════
   ExecutionOverrideSheet — founder-side per-session override
   for execution engine, provider, model, and mode.

   This override is local-only (React state). It does NOT
   persist to any database or modify system defaults.
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useExecutionPolicy } from "@/hooks/use-execution-policy";
import { Settings2, Cpu, Zap, Bot, Sparkles, Info } from "lucide-react";
import {
  ENGINE_EXPLAINER, PROVIDER_EXPLAINER, MODE_EXPLAINER, POLICY_SUMMARY,
} from "@/components/ui/execution-policy-explainer";
import type {
  ExecutionEngine,
  ProviderFamily,
  OrchestrationMode,
  ExecutionPolicy,
} from "@/types/execution";

/* ── Static data ──────────────────────────────── */

const ENGINES: { value: ExecutionEngine; label: string; icon: typeof Cpu }[] = [
  { value: "native", label: "Native", icon: Cpu },
  { value: "ruflo", label: "Ruflo", icon: Zap },
];

const PROVIDERS: { value: ProviderFamily; label: string; hint: string; models: string[] }[] = [
  { value: "anthropic", label: "Claude", hint: PROVIDER_EXPLAINER.anthropic.short, models: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-opus-20240229"] },
  { value: "openai", label: "GPT", hint: PROVIDER_EXPLAINER.openai.short, models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"] },
  { value: "google", label: "Gemini", hint: PROVIDER_EXPLAINER.google.short, models: ["gemini-2.5-pro", "gemini-2.5-flash"] },
  { value: "local", label: "Local", hint: PROVIDER_EXPLAINER.local.short, models: ["llama-3.1-70b", "mixtral-8x22b"] },
];

const MODES: { value: OrchestrationMode; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "swarm", label: "Swarm" },
];

/* ── Types ────────────────────────────────────── */

export interface SessionOverride {
  enabled: boolean;
  policy: ExecutionPolicy;
}

interface Props {
  override: SessionOverride;
  onChange: (next: SessionOverride) => void;
  /** Trigger button label */
  triggerLabel?: string;
}

/* ── Component ────────────────────────────────── */

export function ExecutionOverrideSheet({ override, onChange, triggerLabel = "Override" }: Props) {
  const { policy: globalPolicy } = useExecutionPolicy();
  const [open, setOpen] = useState(false);

  const active = override.enabled;
  const current = active ? override.policy : globalPolicy;

  const set = (patch: Partial<ExecutionPolicy>) => {
    onChange({
      enabled: true,
      policy: { ...override.policy, ...patch, experimental: (patch.executionEngine ?? override.policy.executionEngine) !== "native" || (patch.orchestrationMode ?? override.policy.orchestrationMode) === "swarm" },
    });
  };

  const toggleEnabled = (v: boolean) => {
    if (v) {
      // Initialize override from current global
      onChange({ enabled: true, policy: { ...globalPolicy } });
    } else {
      onChange({ ...override, enabled: false });
    }
  };

  const handleProviderChange = (pf: ProviderFamily) => {
    const models = PROVIDERS.find((p) => p.value === pf)?.models ?? [];
    set({ providerFamily: pf, modelName: models[0] ?? "" });
  };

  const availableModels = PROVIDERS.find((p) => p.value === current.providerFamily)?.models ?? [];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className={cn(
          "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-all",
          active
            ? "border-primary/50 bg-primary/5 text-primary"
            : "border-border/50 bg-muted/30 text-muted-foreground hover:text-foreground hover:border-border"
        )}>
          <Settings2 className="h-3 w-3" />
          {active ? "Overridden" : triggerLabel}
        </button>
      </SheetTrigger>

      <SheetContent className="w-[360px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="text-[15px]">Session Execution Override</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">

          {/* Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border/40 px-4 py-3">
            <div>
              <p className="text-[13px] font-semibold text-foreground">Override for this session</p>
              <p className="text-[11px] text-muted-foreground">Does not change system default</p>
            </div>
            <Switch checked={active} onCheckedChange={toggleEnabled} />
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>Session override only — does not change system default. This preference is lost when you leave.</span>
          </div>

          {/* Controls — only interactive when enabled */}
          <fieldset disabled={!active} className={cn(!active && "opacity-40 pointer-events-none")}>
            <div className="space-y-4">

              {/* Engine */}
              <div>
                <p className="text-[11px] text-muted-foreground font-medium mb-2">Engine</p>
                <div className="flex gap-2">
                  {ENGINES.map((e) => {
                    const Icon = e.icon;
                    const sel = current.executionEngine === e.value;
                    return (
                      <button
                        key={e.value}
                        onClick={() => set({ executionEngine: e.value })}
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-2 text-left transition-all flex items-center gap-2",
                          sel ? "border-primary/50 bg-primary/5 ring-1 ring-primary/15" : "border-border/40 hover:border-border/60"
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5", sel ? "text-primary" : "text-muted-foreground")} />
                        <span className="text-[12px] font-semibold">{e.label}</span>
                        {e.value === "ruflo" && (
                          <Badge variant="outline" className="text-[8px] px-1 border-status-amber/40 text-status-amber ml-auto">exp</Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Provider */}
              <div>
                <p className="text-[11px] text-muted-foreground font-medium mb-2">Provider</p>
                <div className="flex flex-wrap gap-1.5">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => handleProviderChange(p.value)}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all",
                        current.providerFamily === p.value
                          ? "border-primary/50 bg-primary/5 text-foreground"
                          : "border-border/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model */}
              <div>
                <p className="text-[11px] text-muted-foreground font-medium mb-2">Model</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableModels.map((m) => (
                    <button
                      key={m}
                      onClick={() => set({ modelName: m })}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-[10px] font-mono transition-all",
                        current.modelName === m
                          ? "border-primary/50 bg-primary/5 text-foreground"
                          : "border-border/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode */}
              <div>
                <p className="text-[11px] text-muted-foreground font-medium mb-2">Orchestration</p>
                <div className="flex gap-2">
                  {MODES.map((m) => {
                    const sel = current.orchestrationMode === m.value;
                    return (
                      <button
                        key={m.value}
                        onClick={() => set({ orchestrationMode: m.value })}
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-2 text-[12px] font-semibold transition-all",
                          sel ? "border-primary/50 bg-primary/5 ring-1 ring-primary/15" : "border-border/40 hover:border-border/60"
                        )}
                      >
                        {m.label}
                        {m.value === "swarm" && (
                          <Badge variant="outline" className="text-[8px] px-1 ml-1.5 border-status-amber/40 text-status-amber">exp</Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </fieldset>
        </div>
      </SheetContent>
    </Sheet>
  );
}
