import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ChevronDown, ChevronRight, TrendingUp, AlertTriangle, DollarSign, Save, History, Clock } from "lucide-react";
import {
  suggestRoleMixFromBlueprint,
  buildRoleBenchmarkLines,
  calculateMarketBenchmark,
  type BriefSignals,
} from "@/lib/business/market-benchmarking";
import { DEFAULT_ASSUMPTIONS_VERSION } from "@/config/market-benchmark-defaults";
import { useMarketBenchmark, type BenchmarkSnapshot } from "@/hooks/use-market-benchmark";
import type { RoleBenchmarkLine } from "@/types/market-benchmark";

interface Props {
  signals: BriefSignals;
  /** Pre-filled AIC from token estimate if available */
  estimatedAicUsd?: number;
  /** Source context for persistence */
  sourceType?: "company_lead" | "intake" | "project";
  sourceId?: string;
  className?: string;
}

function fmt(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;
}

export function MarketBenchmarkPanel({ signals, estimatedAicUsd, sourceType, sourceId, className = "" }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [aicInput, setAicInput] = useState<string>(estimatedAicUsd?.toFixed(0) ?? "");
  const [sopInput, setSopInput] = useState<string>("");
  const [countryCode, setCountryCode] = useState("US");
  const [showHistory, setShowHistory] = useState(false);

  const { snapshots, loading, saving, loadSnapshots, saveSnapshot } = useMarketBenchmark(
    sourceType ?? "intake",
    sourceId
  );

  const suggestion = useMemo(() => suggestRoleMixFromBlueprint(signals), [signals]);

  const currentLines = useMemo<RoleBenchmarkLine[]>(() => {
    if (suggestion.length === 0) return [];
    return buildRoleBenchmarkLines({
      roleCodes: suggestion.map((s) => s.roleCode),
      countryCode,
      effortMonths: suggestion[0]?.suggestedEffortMonths ?? 2,
      allocationOverrides: Object.fromEntries(suggestion.map((s) => [s.roleCode, s.suggestedAllocationPct])),
    });
  }, [suggestion, countryCode]);

  const result = useMemo(() => {
    const aic = Number(aicInput) || 0;
    const sop = Number(sopInput) || 0;
    if (currentLines.length === 0) return null;

    return calculateMarketBenchmark({
      roleLines: currentLines,
      aiInternalCostUsd: aic,
      studioOfferPriceUsd: sop,
      assumptionsVersion: DEFAULT_ASSUMPTIONS_VERSION,
    });
  }, [currentLines, aicInput, sopInput]);

  const hasInputs = Number(aicInput) > 0 && Number(sopInput) > 0;
  const canSave = result && hasInputs && sourceId;

  // Load history when toggled
  useEffect(() => {
    if (showHistory && sourceId) {
      loadSnapshots();
    }
  }, [showHistory, sourceId, loadSnapshots]);

  const handleSave = async () => {
    if (!result || !canSave) return;
    await saveSnapshot(result, currentLines, {
      assumptionsVersion: DEFAULT_ASSUMPTIONS_VERSION,
      countryCode,
      aicUsd: Number(aicInput) || 0,
      sopUsd: Number(sopInput) || 0,
    });
  };

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
        {snapshots.length > 0 && (
          <span className="text-[9px] text-muted-foreground/40 font-mono">{snapshots.length} saved</span>
        )}
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
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <MetricCard
                      label="Advantage Ratio"
                      value={result.advantageRatio ? `${result.advantageRatio}×` : "—"}
                      sub="HEC ÷ AIC"
                      hint={
                        result.advantageRatio === null ? undefined
                          : result.advantageRatio >= 5 ? "AI delivery is dramatically cheaper than a human team — strong structural advantage."
                          : result.advantageRatio >= 2 ? "A human team would cost roughly " + result.advantageRatio + "× more for this scope."
                          : result.advantageRatio >= 1 ? "Modest cost advantage over human teams. Efficiency gains are limited."
                          : "AI delivery costs more than a human team — review scope or model costs."
                      }
                      positive={result.advantageRatio !== null && result.advantageRatio > 1}
                      negative={result.advantageRatio !== null && result.advantageRatio < 1}
                    />
                    <MetricCard
                      label="Value Capture"
                      value={result.valueCapture ? `${(result.valueCapture * 100).toFixed(0)}%` : "—"}
                      sub="SOP ÷ HEC"
                      hint={
                        result.valueCapture === null ? undefined
                          : result.valueCapture < 0.3 ? "Capturing under 30% of the human-market value — potential underpricing."
                          : result.valueCapture > 0.9 ? "Capturing 90%+ of market value — approaching the human-team price ceiling."
                          : result.valueCapture > 0.7 ? "Capturing a healthy share of human-equivalent market value."
                          : "Moderate value capture — room to raise the offer price if justified."
                      }
                      positive={result.valueCapture !== null && result.valueCapture >= 0.3 && result.valueCapture <= 0.9}
                      negative={result.valueCapture !== null && result.valueCapture > 0.9}
                    />
                    <MetricCard
                      label="Gross AI Margin"
                      value={fmt(result.grossAiMarginUsd)}
                      sub="SOP − AIC"
                      hint={
                        result.grossAiMarginUsd < 0 ? "Negative margin — you would lose money on this project."
                          : result.grossAiMarginUsd < 200 ? "Thin margin — barely covers operational overhead and risk."
                          : "Absolute profit from this project after AI delivery costs."
                      }
                      positive={result.grossAiMarginUsd >= 200}
                      negative={result.grossAiMarginUsd < 0}
                    />
                    <MetricCard
                      label="AI Efficiency Spread"
                      value={result.aiEfficiencySpread !== null ? `${(result.aiEfficiencySpread * 100).toFixed(1)}%` : "—"}
                      sub="(HEC − AIC) ÷ HEC"
                      hint={
                        result.aiEfficiencySpread === null ? undefined
                          : result.aiEfficiencySpread > 0.7 ? "Over 70% cost efficiency vs human teams — high structural advantage."
                          : result.aiEfficiencySpread > 0.3 ? "Solid efficiency advantage. AI delivery is meaningfully cheaper."
                          : result.aiEfficiencySpread > 0 ? "Slight efficiency edge — advantage is narrow."
                          : "No efficiency advantage — AI costs match or exceed human delivery."
                      }
                      positive={result.aiEfficiencySpread !== null && result.aiEfficiencySpread > 0.3}
                      negative={result.aiEfficiencySpread !== null && result.aiEfficiencySpread <= 0}
                    />
                  </div>

                  {/* Founder guidance blocks */}
                  <FounderGuidance result={result} />
                </>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                {canSave && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15 transition-colors disabled:opacity-50"
                  >
                    <Save className="h-3 w-3" />
                    {saving ? "Saving…" : "Save founder snapshot"}
                  </button>
                )}
                {sourceId && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-muted/40 border border-border/30 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <History className="h-3 w-3" />
                    {showHistory ? "Hide history" : "View snapshots"}
                  </button>
                )}
              </div>

              {/* Break-even */}
              {result.breakEvenStudioPriceUsd && (
                <p className="text-[9px] text-muted-foreground/30 font-mono text-center">
                  Break-even price: {fmt(result.breakEvenStudioPriceUsd)} · Assumptions: {DEFAULT_ASSUMPTIONS_VERSION}
                </p>
              )}
            </div>
          )}

          {/* Snapshot History */}
          {showHistory && (
            <div className="space-y-2 pt-1 border-t border-border/10">
              <h4 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                Previous snapshots
              </h4>
              {loading ? (
                <p className="text-[10px] text-muted-foreground/40">Loading…</p>
              ) : snapshots.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/30 italic">No snapshots saved yet for this context.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {snapshots.map((s) => (
                    <SnapshotRow key={s.id} snapshot={s} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SnapshotRow({ snapshot }: { snapshot: BenchmarkSnapshot }) {
  const d = new Date(snapshot.created_at);
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/20 border border-border/10 px-3 py-2">
      <Clock className="h-3 w-3 text-muted-foreground/30 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-foreground">
            HEC {fmt(snapshot.human_equivalent_cost_usd)}
          </span>
          <span className="text-[9px] text-muted-foreground/40">→</span>
          <span className="text-[10px] font-mono text-foreground">
            SOP {fmt(snapshot.studio_offer_price_usd)}
          </span>
          {snapshot.advantage_ratio && (
            <Badge variant="outline" className="text-[8px] h-auto py-0 px-1 border-primary/20 text-primary font-mono">
              {Number(snapshot.advantage_ratio).toFixed(1)}×
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[8px] text-muted-foreground/30">
            {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="text-[8px] text-muted-foreground/20">·</span>
          <span className="text-[8px] text-muted-foreground/30">{snapshot.country_code}</span>
          <span className="text-[8px] text-muted-foreground/20">·</span>
          <span className="text-[8px] text-muted-foreground/30">v{snapshot.assumptions_version}</span>
        </div>
      </div>
      <span className={`text-[10px] font-bold font-mono ${
        snapshot.gross_ai_margin_usd > 0 ? "text-status-green" : "text-destructive"
      }`}>
        {fmt(snapshot.gross_ai_margin_usd)}
      </span>
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
