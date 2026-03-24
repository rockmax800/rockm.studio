/* ═══════════════════════════════════════════════════════════
   Founder-friendly descriptions for execution policy options.
   Shared across all execution UI surfaces.
   ═══════════════════════════════════════════════════════════ */

export const ENGINE_EXPLAINER: Record<string, { short: string; detail: string }> = {
  native: {
    short: "Built-in deterministic path",
    detail: "Runs are processed by the studio's internal services. Predictable, fully traceable.",
  },
  ruflo: {
    short: "External multi-agent orchestration",
    detail: "Work is delegated to an external engine. Experimental — project state still remains controlled by this studio.",
  },
};

export const PROVIDER_EXPLAINER: Record<string, { short: string; detail: string }> = {
  anthropic: {
    short: "Stronger reasoning & review",
    detail: "Claude models — best for code review, complex reasoning, and structured analysis.",
  },
  openai: {
    short: "Broad compatibility",
    detail: "GPT models — strong general-purpose capability, wide ecosystem support.",
  },
  google: {
    short: "Multimodal & context",
    detail: "Gemini models — large context windows, multimodal input support.",
  },
  local: {
    short: "Self-hosted inference",
    detail: "Local models — no external API calls, full data privacy, lower capability ceiling.",
  },
};

export const MODE_EXPLAINER: Record<string, { short: string; detail: string }> = {
  single: {
    short: "One agent per run",
    detail: "Each run is handled by a single specialist agent. Simpler, easier to trace.",
  },
  swarm: {
    short: "Multi-agent collaboration",
    detail: "Multiple agents coordinate on a run. Experimental — higher capability, more complex traces.",
  },
};

export const POLICY_SUMMARY = "Choose how the team executes work; project state still remains controlled by this studio.";
