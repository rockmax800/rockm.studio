// SystemModeService — Global mode check (PART 2 + PART 7)
// Reads system_settings from DB. Caches result for 30s.

import { supabase } from "@/integrations/supabase/client";

export interface ExperimentalFeatures {
  enable_autonomy: boolean;
  enable_dual_verification: boolean;
  enable_self_review: boolean;
  enable_context_compression: boolean;
  enable_model_competition: boolean;
  enable_prompt_experiments: boolean;
  enable_blog: boolean;
}

export type SystemMode = "production" | "experimental";

interface SystemSettingsRow {
  id: string;
  mode: string;
  experimental_features: ExperimentalFeatures;
  updated_at: string;
}

let cachedSettings: SystemSettingsRow | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000;

async function loadSettings(): Promise<SystemSettingsRow> {
  const now = Date.now();
  if (cachedSettings && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSettings;
  }

  const { data, error } = await supabase
    .from("system_settings")
    .select("*")
    .limit(1)
    .single();

  if (error || !data) {
    // Default to production if DB unreachable
    return {
      id: "",
      mode: "production",
      experimental_features: {
        enable_autonomy: false,
        enable_dual_verification: false,
        enable_self_review: false,
        enable_context_compression: false,
        enable_model_competition: false,
        enable_prompt_experiments: false,
        enable_blog: false,
      },
      updated_at: new Date().toISOString(),
    };
  }

  cachedSettings = data as unknown as SystemSettingsRow;
  cacheTimestamp = now;
  return cachedSettings;
}

/** Clear cache (e.g. after mode switch) */
export function invalidateSystemModeCache(): void {
  cachedSettings = null;
  cacheTimestamp = 0;
}

export async function getSystemMode(): Promise<SystemMode> {
  const settings = await loadSettings();
  return settings.mode as SystemMode;
}

export async function isProduction(): Promise<boolean> {
  return (await getSystemMode()) === "production";
}

export async function isExperimental(): Promise<boolean> {
  return (await getSystemMode()) === "experimental";
}

export async function getExperimentalFeatures(): Promise<ExperimentalFeatures> {
  const settings = await loadSettings();
  if (settings.mode === "production") {
    // In production, ALL experimental features are off regardless of stored flags
    return {
      enable_autonomy: false,
      enable_dual_verification: false,
      enable_self_review: false,
      enable_context_compression: false,
      enable_model_competition: false,
      enable_prompt_experiments: false,
      enable_blog: false,
    };
  }
  return settings.experimental_features;
}

export async function isFeatureEnabled(feature: keyof ExperimentalFeatures): Promise<boolean> {
  const features = await getExperimentalFeatures();
  return features[feature] === true;
}
