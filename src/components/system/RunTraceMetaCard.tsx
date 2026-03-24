/* ═══════════════════════════════════════════════════════════
   RunTraceMetaCard — reusable card that renders execution
   telemetry for a run. Shows an honest empty state when
   trace data is not yet available.
   ═══════════════════════════════════════════════════════════ */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Cpu, Zap, Bot, Sparkles, Hash, Clock, Coins, Info } from "lucide-react";
import type { ExternalRunTrace } from "@/types/external-run-trace";

const PROVIDER_LABEL: Record<string, string> = {
  anthropic: "Claude",
  openai: "GPT",
  google: "Gemini",
  local: "Local",
};

interface Props {
  /** Trace data; null = not yet available */
  trace: ExternalRunTrace | null;
  /** Optional title override */
  title?: string;
  className?: string;
}

export function RunTraceMetaCard({ trace, title = "Execution Telemetry", className }: Props) {
  if (!trace) {
    return (
      <Card className={cn("border-none shadow-sm", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu className="h-4 w-4 text-muted-foreground" /> {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 rounded-lg bg-muted/30 border border-border/30 px-4 py-3">
            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-[12px] text-muted-foreground leading-relaxed">
              <p className="font-medium text-foreground/60">External execution telemetry not yet available on this branch</p>
              <p className="mt-1 text-[11px]">
                When runs are executed via Native or Ruflo engines, execution metadata
                (engine, provider, model, trace refs, token usage) will appear here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isRuflo = trace.executionEngine === "ruflo";
  const EngineIcon = isRuflo ? Zap : Cpu;

  return (
    <Card className={cn("border-none shadow-sm", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <EngineIcon className="h-4 w-4" /> {title}
          {isRuflo && (
            <Badge variant="outline" className="text-[9px] px-1.5 border-status-amber/40 text-status-amber ml-auto">
              external engine
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg bg-muted/30 border border-border/30 divide-y divide-border/20">
          <Row
            icon={EngineIcon}
            label="Engine"
            value={isRuflo ? "Ruflo" : "Native"}
            tag={isRuflo ? "experimental" : undefined}
          />
          <Row
            icon={Bot}
            label="Provider"
            value={PROVIDER_LABEL[trace.providerFamily] ?? trace.providerFamily}
          />
          <Row icon={Bot} label="Model" value={trace.modelName} mono />
          <Row
            icon={Sparkles}
            label="Mode"
            value={trace.orchestrationMode === "swarm" ? "Swarm" : "Single"}
            tag={trace.orchestrationMode === "swarm" ? "experimental" : undefined}
          />
          {trace.externalTraceRef && (
            <Row icon={Hash} label="Trace Ref" value={trace.externalTraceRef} mono />
          )}
          {trace.externalSessionId && (
            <Row icon={Hash} label="Session ID" value={trace.externalSessionId} mono />
          )}
          {trace.tokenUsage != null && (
            <Row icon={Clock} label="Tokens" value={trace.tokenUsage.toLocaleString()} />
          )}
          {trace.estimatedCostUsd != null && (
            <Row icon={Coins} label="Est. Cost" value={`$${trace.estimatedCostUsd.toFixed(4)}`} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ icon: Icon, label, value, mono, tag }: {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
  tag?: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <div className="flex items-center gap-2">
        {tag && (
          <Badge variant="outline" className="text-[9px] px-1.5 border-status-amber/40 text-status-amber">
            {tag}
          </Badge>
        )}
        <span className={cn("text-[12px] font-medium text-foreground", mono && "font-mono text-[11px]")}>
          {value}
        </span>
      </div>
    </div>
  );
}
