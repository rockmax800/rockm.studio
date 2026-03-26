import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ChevronDown, ChevronRight, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";
import {
  suggestRoleMixFromBlueprint,
  buildRoleBenchmarkLines,
  calculateMarketBenchmark,
  type BriefSignals,
} from "@/lib/business/market-benchmarking";
import { DEFAULT_ASSUMPTIONS_VERSION } from "@/config/market-benchmark-defaults";

interface Props {
  signals: BriefSignals;
  /** Pre-filled AIC from token estimate if available */
  estimatedAicUsd?: number;
  className?: string;
}

function fmt(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;
}

export function MarketBenchmarkPanel({ signals, estimatedAicUsd, className = "" }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [aicInput, setAicInput] = useState<string>(estimatedAicUsd?.toFixed(0) ?? "");
  const [sopInput, setSopInput] = useState<string>("");
  const [countryCode, setCountryCode] = useState("US");

  const suggestion = useMemo(() => suggestRoleMixFromBlueprint(signals), [signals]);

  const result = useMemo(() => {
    const aic = Number(aicInput) || 0;
    const sop = Number(sopInput) || 0;
    if (suggestion.length === 0) return null;

    const lines = buildRoleBenchmarkLines({
      roleCodes: suggestion.map((s) => s.roleCode),
      countryCode,
      effortMonths: suggestion[0]?.suggestedEffortMonths ?? 2,
      allocationOverrides: Object.fromEntries(suggestion.map((s) => [s.roleCode, s.suggestedAllocationPct])),
    });

    return calculateMarketBenchmark({
      roleLines: lines,
      aiInternalCostUsd: aic,
      studioOfferPriceUsd: sop,
      assumptionsVersion: DEFAULT_ASSUMPTIONS_VERSION,
    });
  }, [suggestion, aicInput, sopInput, countryCode]);

  const hasInputs = Number(aicInput) > 0 && Number(sopInput) > 0;

  return (
    <div className={`rounded-xl border border-status-amber/20 bg-status-amber/[0.02] overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-status-amber/[0.04] transition-colors"
      >
        <ShieldAlert className="h-4 w-4 text-status-amber/70 shrink-0" />
        <span className="text-[12px] font-bold text-foreground">Market Benchmark</span>
        <Badge variant="outline" className="text-[8px] h-auto py-0 px-1.5 border-status-amber/30 text-status-amber uppercase tracking-widest font-bold">
          Founder only
        </Badge>
        <span className="ml-auto">
          {expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground/40" /> : <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Warning */}
          <div className="flex items-start gap-2 rounded-lg bg-status-amber/[0.06] border border-status-amber/15 px-3 py-2">
            <AlertTriangle className="h-3 w-3 text-status-amber/60 mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
              <span className="font-bold text-status-amber/80">Internal strategic analysis</span> — not shown to client.
              Compare AI delivery cost against human-equivalent market cost to inform pricing.
            </p>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 block mb-1">
                AI Internal Cost (AIC)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/30" />
                <input
                  type="number"
                  value={aicInput}
                  onChange={(e) => setAicInput(e.target.value)}
                  placeholder="0"
                  className="w-full h-8 pl-6 pr-2 text-[12px] font-mono bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <p className="text-[8px] text-muted-foreground/30 mt-0.5">
                {estimatedAicUsd ? "Pre-filled from token estimate" : "Manual input — token tracking not wired"}
              </p>
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 block mb-1">
                Studio Offer Price (SOP)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/30" />
                <input
                  type="number"
                  value={sopInput}
                  onChange={(e) => setSopInput(e.target.value)}
                  placeholder="0"
                  className="w-full h-8 pl-6 pr-2 text-[12px] font-mono bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <p className="text-[8px] text-muted-foreground/30 mt-0.5">What you plan to charge the client</p>
            </div>
          </div>

          {/* Country selector */}
          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 block mb-1">
              Human team benchmark country
            </label>
            <div className="flex gap-1.5">
              {["US", "PL", "UA", "IN"].map((cc) => (
                <button
                  key={cc}
                  onClick={() => setCountryCode(cc)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-colors border ${
                    countryCode === cc
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted/30 border-border/30 text-muted-foreground/50 hover:text-foreground"
                  }`}
                >
                  {cc}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-2">
              {/* HEC */}
              <div className="rounded-lg bg-muted/30 border border-border/20 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground">Human Equivalent Cost (HEC)</span>
                  <span className="text-[14px] font-bold font-mono text-foreground">{fmt(result.hecUsd)}</span>
                </div>
                <p className="text-[9px] text-muted-foreground/40 mt-0.5">
                  What a {countryCode} human team would cost for this scope
                </p>
              </div>

              {/* Derived metrics */}
              {hasInputs && (
                <div className="grid grid-cols-2 gap-2">
                  <MetricCard
                    label="Advantage Ratio"
                    value={result.advantageRatio ? `${result.advantageRatio}×` : "—"}
                    sub="HEC ÷ AIC"
                    positive={result.advantageRatio !== null && result.advantageRatio > 1}
                  />
                  <MetricCard
                    label="Value Capture"
                    value={result.valueCapture ? `${(result.valueCapture * 100).toFixed(0)}%` : "—"}
                    sub="SOP ÷ HEC"
                    positive={result.valueCapture !== null && result.valueCapture < 1}
                  />
                  <MetricCard
                    label="Gross AI Margin"
                    value={fmt(result.grossAiMarginUsd)}
                    sub="SOP − AIC"
                    positive={result.grossAiMarginUsd > 0}
                    negative={result.grossAiMarginUsd < 0}
                  />
                  <MetricCard
                    label="AI Efficiency Spread"
                    value={result.aiEfficiencySpread !== null ? `${(result.aiEfficiencySpread * 100).toFixed(1)}%` : "—"}
                    sub="(HEC − AIC) ÷ HEC"
                    positive={result.aiEfficiencySpread !== null && result.aiEfficiencySpread > 0}
                  />
                </div>
              )}

              {/* Warnings */}
              {hasInputs && result.grossAiMarginUsd < 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/[0.06] border border-destructive/20 px-3 py-2">
                  <AlertTriangle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                  <p className="text-[10px] text-destructive leading-relaxed">
                    Negative margin — studio offer price is below AI internal cost. This project would lose money.
                  </p>
                </div>
              )}
              {hasInputs && result.valueCapture !== null && result.valueCapture > 0.9 && result.grossAiMarginUsd > 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-status-amber/[0.06] border border-status-amber/15 px-3 py-2">
                  <TrendingUp className="h-3 w-3 text-status-amber mt-0.5 shrink-0" />
                  <p className="text-[10px] text-status-amber/80 leading-relaxed">
                    Offer price approaches human-equivalent ceiling. Room for competitive advantage is narrow.
                  </p>
                </div>
              )}

              {/* Break-even */}
              {result.breakEvenStudioPriceUsd && (
                <p className="text-[9px] text-muted-foreground/30 font-mono text-center">
                  Break-even price: {fmt(result.breakEvenStudioPriceUsd)} · Assumptions: {DEFAULT_ASSUMPTIONS_VERSION}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub, positive, negative }: {
  label: string; value: string; sub: string; positive?: boolean; negative?: boolean;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${
      negative ? "border-destructive/20 bg-destructive/[0.03]"
        : positive ? "border-status-green/20 bg-status-green/[0.03]"
        : "border-border/20 bg-muted/20"
    }`}>
      <span className={`text-[14px] font-bold font-mono block ${
        negative ? "text-destructive" : positive ? "text-status-green" : "text-foreground"
      }`}>{value}</span>
      <span className="text-[9px] font-semibold text-muted-foreground block">{label}</span>
      <span className="text-[8px] text-muted-foreground/30 font-mono">{sub}</span>
    </div>
  );
}
