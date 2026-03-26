import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MarketBenchmarkResult, RoleBenchmarkLine } from "@/types/market-benchmark";

export interface BenchmarkSnapshot {
  id: string;
  source_type: string;
  source_id: string;
  assumptions_version: string;
  country_code: string;
  ai_internal_cost_usd: number;
  studio_offer_price_usd: number;
  human_equivalent_cost_usd: number;
  advantage_ratio: number | null;
  value_capture: number | null;
  gross_ai_margin_usd: number;
  ai_efficiency_spread: number | null;
  created_at: string;
  role_lines?: RoleBenchmarkLine[];
}

export function useMarketBenchmark(sourceType: string, sourceId: string | undefined) {
  const [snapshots, setSnapshots] = useState<BenchmarkSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSnapshots = useCallback(async () => {
    if (!sourceId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("market_benchmark_snapshots")
        .select("*")
        .eq("source_type", sourceType)
        .eq("source_id", sourceId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setSnapshots((data as BenchmarkSnapshot[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [sourceType, sourceId]);

  const saveSnapshot = useCallback(
    async (
      result: MarketBenchmarkResult,
      roleLines: RoleBenchmarkLine[],
      params: {
        assumptionsVersion: string;
        countryCode: string;
        aicUsd: number;
        sopUsd: number;
      }
    ) => {
      if (!sourceId) return null;
      setSaving(true);
      try {
        const { data: snap, error: snapErr } = await supabase
          .from("market_benchmark_snapshots")
          .insert({
            source_type: sourceType,
            source_id: sourceId,
            assumptions_version: params.assumptionsVersion,
            country_code: params.countryCode,
            ai_internal_cost_usd: params.aicUsd,
            studio_offer_price_usd: params.sopUsd,
            human_equivalent_cost_usd: result.hecUsd,
            advantage_ratio: result.advantageRatio,
            value_capture: result.valueCapture,
            gross_ai_margin_usd: result.grossAiMarginUsd,
            ai_efficiency_spread: result.aiEfficiencySpread,
            payload_json: { breakEvenStudioPriceUsd: result.breakEvenStudioPriceUsd },
          })
          .select("id")
          .single();

        if (snapErr) throw snapErr;

        if (roleLines.length > 0 && snap) {
          const rows = roleLines.map((l) => ({
            snapshot_id: snap.id,
            role_code: l.roleCode,
            role_label: l.roleLabel,
            country_code: l.countryCode,
            monthly_salary_usd: l.monthlySalaryUsd,
            effort_months: l.effortMonths,
            allocation_pct: l.allocationPct,
            overhead_multiplier: l.overheadMultiplier,
            velocity_index: l.velocityIndex,
            human_equivalent_cost_usd: l.humanEquivalentCostUsd,
          }));
          const { error: lineErr } = await supabase
            .from("market_benchmark_role_lines")
            .insert(rows);
          if (lineErr) throw lineErr;
        }

        await loadSnapshots();
        return snap?.id ?? null;
      } finally {
        setSaving(false);
      }
    },
    [sourceType, sourceId, loadSnapshots]
  );

  return { snapshots, loading, saving, loadSnapshots, saveSnapshot };
}
