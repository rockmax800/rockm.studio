/* ═══════════════════════════════════════════════════════════
   Execution Engine Registry — supported engine + provider
   presets.

   These are static declarations. Runtime selection is done
   via the useExecutionPolicy hook.
   ═══════════════════════════════════════════════════════════ */

import type { ExecutionPolicy } from "@/types/execution";

export interface EnginePreset {
  id: string;
  label: string;
  description: string;
  policy: ExecutionPolicy;
  /** Whether this is currently implemented and usable */
  implemented: boolean;
}

/** Safe production default — native engine, Anthropic Claude */
export const DEFAULT_POLICY: ExecutionPolicy = {
  executionEngine: "native",
  providerFamily: "anthropic",
  modelName: "claude-sonnet-4-20250514",
  orchestrationMode: "single",
  fallbackProviderFamily: "openai",
  fallbackModelName: "gpt-4o",
  experimental: false,
};

export const ENGINE_PRESETS: EnginePreset[] = [
  {
    id: "native-claude",
    label: "Native — Claude Sonnet",
    description: "Default production preset. Single-agent, Anthropic Claude.",
    implemented: true,
    policy: {
      executionEngine: "native",
      providerFamily: "anthropic",
      modelName: "claude-sonnet-4-20250514",
      orchestrationMode: "single",
      fallbackProviderFamily: "openai",
      fallbackModelName: "gpt-4o",
      experimental: false,
    },
  },
  {
    id: "native-gpt",
    label: "Native — GPT-4o",
    description: "Native engine with OpenAI GPT-4o.",
    implemented: true,
    policy: {
      executionEngine: "native",
      providerFamily: "openai",
      modelName: "gpt-4o",
      orchestrationMode: "single",
      fallbackProviderFamily: "anthropic",
      fallbackModelName: "claude-sonnet-4-20250514",
      experimental: false,
    },
  },
  {
    id: "ruflo-claude",
    label: "Ruflo — Claude",
    description: "Experimental. External Ruflo engine with Anthropic Claude.",
    implemented: false,
    policy: {
      executionEngine: "ruflo",
      providerFamily: "anthropic",
      modelName: "claude-sonnet-4-20250514",
      orchestrationMode: "single",
      fallbackProviderFamily: null,
      fallbackModelName: null,
      experimental: true,
    },
  },
  {
    id: "ruflo-gpt",
    label: "Ruflo — GPT-4o",
    description: "Experimental. External Ruflo engine with OpenAI GPT-4o.",
    implemented: false,
    policy: {
      executionEngine: "ruflo",
      providerFamily: "openai",
      modelName: "gpt-4o",
      orchestrationMode: "single",
      fallbackProviderFamily: null,
      fallbackModelName: null,
      experimental: true,
    },
  },
];

/** Lookup a preset by id, falling back to default */
export function getPreset(id: string): EnginePreset {
  return ENGINE_PRESETS.find((p) => p.id === id) ?? ENGINE_PRESETS[0];
}
