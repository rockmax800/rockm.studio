/* ═══════════════════════════════════════════════════════════
   ExecutionPolicyPanel — global execution defaults UI for
   the System → Execution tab.
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useExecutionPolicy } from "@/hooks/use-execution-policy";
import { useUpdateExecutionPolicy } from "@/hooks/use-update-execution-policy";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Cpu, Zap, AlertTriangle, Check, Loader2, Info,
  Server, Bot, Sparkles, Shield,
} from "lucide-react";
import type {
  ExecutionEngine,
  ProviderFamily,
  OrchestrationMode,
  ExecutionPolicySettings,
} from "@/types/execution";

/* ── Static data ──────────────────────────────── */

const ENGINES: { value: ExecutionEngine; label: string; desc: string; icon: typeof Server }[] = [
  { value: "native", label: "Native", desc: "Built-in execution flow", icon: Server },
  { value: "ruflo", label: "Ruflo", desc: "External experimental engine", icon: Zap },
];

const PROVIDERS: { value: ProviderFamily; label: string; models: string[] }[] = [
  { value: "anthropic", label: "Anthropic (Claude)", models: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-opus-20240229"] },
  { value: "openai", label: "OpenAI (GPT)", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"] },
  { value: "google", label: "Google (Gemini)", models: ["gemini-2.5-pro", "gemini-2.5-flash"] },
  { value: "local", label: "Local", models: ["llama-3.1-70b", "mixtral-8x22b"] },
];

const MODES: { value: OrchestrationMode; label: string; desc: string }[] = [
  { value: "single", label: "Single Agent", desc: "One agent per run" },
  { value: "swarm", label: "Swarm", desc: "Multi-agent orchestration" },
];

/* ── Component ────────────────────────────────── */

export default function ExecutionPolicyPanel() {
  const { policy, isLoading } = useExecutionPolicy();
  const mutation = useUpdateExecutionPolicy();

  const [engine, setEngine] = useState<ExecutionEngine>("native");
  const [provider, setProvider] = useState<ProviderFamily>("anthropic");
  const [model, setModel] = useState("claude-sonnet-4-20250514");
  const [mode, setMode] = useState<OrchestrationMode>("single");
  const [dirty, setDirty] = useState(false);

  // Sync local state from resolved policy
  useEffect(() => {
    if (!isLoading) {
      setEngine(policy.executionEngine);
      setProvider(policy.providerFamily);
      setModel(policy.modelName);
      setMode(policy.orchestrationMode);
      setDirty(false);
    }
  }, [isLoading, policy]);

  const availableModels = PROVIDERS.find((p) => p.value === provider)?.models ?? [];

  const handleProviderChange = (v: ProviderFamily) => {
    setProvider(v);
    const models = PROVIDERS.find((p) => p.value === v)?.models ?? [];
    setModel(models[0] ?? "");
    setDirty(true);
  };

  const isExperimental = engine === "ruflo" || mode === "swarm";

  const handleSave = () => {
    const defaults: ExecutionPolicySettings = {
      execution_engine: engine,
      provider_family: provider,
      model_name: model,
      orchestration_mode: mode,
      fallback_provider_family: null,
      fallback_model_name: null,
    };
    mutation.mutate(defaults, {
      onSuccess: () => {
        toast({ title: "Execution policy saved", description: "Global defaults updated." });
        setDirty(false);
      },
      onError: (err) => {
        toast({
          title: "Failed to save",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading execution policy…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Warning box */}
      <Card className="border-status-amber/30 bg-status-amber/5 border shadow-none">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-status-amber shrink-0 mt-0.5" />
          <div className="text-[13px] text-foreground/80 leading-relaxed space-y-1">
            <p>
              <strong>Native</strong> = current built-in execution flow (runs processed by internal services).
            </p>
            <p>
              <strong>Ruflo</strong> = external experimental orchestration engine. Work is delegated externally but
              all product state (projects, tasks, runs, artifacts, reviews, approvals, deployments) remains in this app.
            </p>
            <p className="text-muted-foreground text-[12px] italic">
              Ruflo integration is not yet fully connected to a backend dispatcher. Selecting it records your preference
              but does not currently route execution externally.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Engine selector */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu className="h-4 w-4" /> Execution Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {ENGINES.map((e) => {
              const Icon = e.icon;
              const selected = engine === e.value;
              return (
                <button
                  key={e.value}
                  onClick={() => { setEngine(e.value); setDirty(true); }}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left transition-all",
                    selected
                      ? "border-primary/50 bg-primary/5 ring-2 ring-primary/15"
                      : "border-border/40 hover:border-border/60 hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={cn("h-4 w-4", selected ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-[14px] font-semibold text-foreground">{e.label}</span>
                    {e.value === "ruflo" && (
                      <Badge variant="outline" className="text-[9px] px-1.5 border-status-amber/40 text-status-amber">
                        Experimental
                      </Badge>
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground">{e.desc}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Provider + Model */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="h-4 w-4" /> Provider & Model
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider chips */}
          <div>
            <p className="text-[12px] text-muted-foreground mb-2 font-medium">Provider Family</p>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handleProviderChange(p.value)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-all",
                    provider === p.value
                      ? "border-primary/50 bg-primary/5 text-foreground"
                      : "border-border/40 text-muted-foreground hover:border-border/60 hover:text-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Model select */}
          <div>
            <p className="text-[12px] text-muted-foreground mb-2 font-medium">Default Model</p>
            <div className="flex flex-wrap gap-2">
              {availableModels.map((m) => (
                <button
                  key={m}
                  onClick={() => { setModel(m); setDirty(true); }}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-[12px] font-mono transition-all",
                    model === m
                      ? "border-primary/50 bg-primary/5 text-foreground"
                      : "border-border/40 text-muted-foreground hover:border-border/60"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orchestration Mode */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Orchestration Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {MODES.map((m) => {
              const selected = mode === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => { setMode(m.value); setDirty(true); }}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left transition-all",
                    selected
                      ? "border-primary/50 bg-primary/5 ring-2 ring-primary/15"
                      : "border-border/40 hover:border-border/60 hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[14px] font-semibold text-foreground">{m.label}</span>
                    {m.value === "swarm" && (
                      <Badge variant="outline" className="text-[9px] px-1.5 border-status-amber/40 text-status-amber">
                        Experimental
                      </Badge>
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground">{m.desc}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Save bar */}
      {dirty && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          {isExperimental && (
            <Badge className="text-[10px] bg-status-amber/15 text-status-amber border-status-amber/30" variant="outline">
              Experimental
            </Badge>
          )}
          <span className="text-[13px] text-foreground flex-1">Unsaved changes</span>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-[12px] font-semibold rounded-lg"
            onClick={handleSave}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Save Defaults
          </Button>
        </div>
      )}

      {/* Effective Policy Summary (read-only) */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" /> Effective Execution Policy
            <Badge variant="outline" className="text-[9px] ml-auto font-normal">read-only</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted/30 border border-border/30 divide-y divide-border/20">
            <Row label="Engine" value={policy.executionEngine} tag={policy.executionEngine === "ruflo" ? "experimental" : undefined} />
            <Row label="Provider" value={policy.providerFamily} />
            <Row label="Model" value={policy.modelName} mono />
            <Row label="Orchestration" value={policy.orchestrationMode} tag={policy.orchestrationMode === "swarm" ? "experimental" : undefined} />
            <Row label="Fallback Provider" value={policy.fallbackProviderFamily ?? "none"} />
            <Row label="Fallback Model" value={policy.fallbackModelName ?? "none"} mono />
          </div>
          <div className="flex items-start gap-2 mt-3 text-[11px] text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              This reflects the currently persisted global defaults. Individual runs may override these
              at the project or task level (not yet implemented).
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, mono, tag }: { label: string; value: string; mono?: boolean; tag?: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {tag && (
          <Badge variant="outline" className="text-[9px] px-1.5 border-status-amber/40 text-status-amber">
            {tag}
          </Badge>
        )}
        <span className={cn("text-[12px] font-medium text-foreground", mono && "font-mono")}>{value}</span>
      </div>
    </div>
  );
}
