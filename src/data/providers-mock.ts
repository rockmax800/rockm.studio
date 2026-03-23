// Mock data for Provider Control screen — doc 18 aligned
// Will be replaced by real DB tables later

export type ProviderStatus = "healthy" | "degraded" | "unavailable" | "misconfigured";
export type CredentialStatus = "valid" | "expired" | "missing" | "error";
export type ModelStatus = "active" | "deprecated" | "disabled";
export type RoutingPolicyStatus = "active" | "disabled";

export interface Provider {
  id: string;
  name: string;
  code: string;
  status: ProviderStatus;
  baseUrl?: string;
  supportsText: boolean;
  supportsStreaming: boolean;
  supportsTools: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderModel {
  id: string;
  providerId: string;
  modelCode: string;
  displayName: string;
  status: ModelStatus;
  intendedUse: string;
  maxContext?: number;
  supportsJson: boolean;
  supportsStreaming: boolean;
  supportsToolUse: boolean;
  costProfileHint: "low" | "medium" | "high";
  latencyProfileHint: "fast" | "medium" | "slow";
  qualityProfileHint: "standard" | "high" | "frontier";
}

export interface ProviderCredential {
  id: string;
  providerId: string;
  credentialLabel: string;
  status: CredentialStatus;
  lastValidatedAt: string | null;
  lastError: string | null;
}

export interface ProviderHealthCheck {
  providerId: string;
  reachable: boolean;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  recentErrorRate: number;
  rateLimitWarning: boolean;
}

export interface RoutingPolicy {
  id: string;
  policyName: string;
  taskDomain: string;
  roleCode: string;
  preferredProviderId: string;
  preferredModelId: string;
  fallbackProviderId: string | null;
  fallbackModelId: string | null;
  allowFallback: boolean;
  allowCrossProviderRetry: boolean;
  notes: string;
  status: RoutingPolicyStatus;
}

export interface UsageSnapshot {
  providerId: string;
  period: string;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

// ── Mock Providers ──

export const mockProviders: Provider[] = [
  {
    id: "prov-openai",
    name: "OpenAI",
    code: "openai",
    status: "healthy",
    baseUrl: "https://api.openai.com/v1",
    supportsText: true,
    supportsStreaming: true,
    supportsTools: true,
    createdAt: "2025-01-15T00:00:00Z",
    updatedAt: "2026-03-22T14:00:00Z",
  },
  {
    id: "prov-anthropic",
    name: "Anthropic",
    code: "anthropic",
    status: "healthy",
    baseUrl: "https://api.anthropic.com/v1",
    supportsText: true,
    supportsStreaming: true,
    supportsTools: true,
    createdAt: "2025-01-15T00:00:00Z",
    updatedAt: "2026-03-22T14:00:00Z",
  },
];

// ── Mock Models ──

export const mockModels: ProviderModel[] = [
  {
    id: "mod-gpt4o",
    providerId: "prov-openai",
    modelCode: "gpt-4o",
    displayName: "GPT-4o",
    status: "active",
    intendedUse: "General agent execution, drafting, coordination",
    maxContext: 128000,
    supportsJson: true,
    supportsStreaming: true,
    supportsToolUse: true,
    costProfileHint: "medium",
    latencyProfileHint: "medium",
    qualityProfileHint: "high",
  },
  {
    id: "mod-gpt4o-mini",
    providerId: "prov-openai",
    modelCode: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    status: "active",
    intendedUse: "Lightweight tasks, summaries, classification",
    maxContext: 128000,
    supportsJson: true,
    supportsStreaming: true,
    supportsToolUse: true,
    costProfileHint: "low",
    latencyProfileHint: "fast",
    qualityProfileHint: "standard",
  },
  {
    id: "mod-o1",
    providerId: "prov-openai",
    modelCode: "o1",
    displayName: "o1",
    status: "active",
    intendedUse: "Complex reasoning, architecture analysis",
    maxContext: 200000,
    supportsJson: true,
    supportsStreaming: false,
    supportsToolUse: false,
    costProfileHint: "high",
    latencyProfileHint: "slow",
    qualityProfileHint: "frontier",
  },
  {
    id: "mod-claude-sonnet",
    providerId: "prov-anthropic",
    modelCode: "claude-sonnet-4-20250514",
    displayName: "Claude Sonnet 4",
    status: "active",
    intendedUse: "Coding, implementation, review tasks",
    maxContext: 200000,
    supportsJson: true,
    supportsStreaming: true,
    supportsToolUse: true,
    costProfileHint: "medium",
    latencyProfileHint: "medium",
    qualityProfileHint: "high",
  },
  {
    id: "mod-claude-opus",
    providerId: "prov-anthropic",
    modelCode: "claude-opus-4-20250514",
    displayName: "Claude Opus 4",
    status: "active",
    intendedUse: "Deep reasoning, architecture, long-form analysis",
    maxContext: 200000,
    supportsJson: true,
    supportsStreaming: true,
    supportsToolUse: true,
    costProfileHint: "high",
    latencyProfileHint: "slow",
    qualityProfileHint: "frontier",
  },
  {
    id: "mod-claude-haiku",
    providerId: "prov-anthropic",
    modelCode: "claude-3-5-haiku-20241022",
    displayName: "Claude 3.5 Haiku",
    status: "active",
    intendedUse: "Fast classification, summaries, lightweight tasks",
    maxContext: 200000,
    supportsJson: true,
    supportsStreaming: true,
    supportsToolUse: true,
    costProfileHint: "low",
    latencyProfileHint: "fast",
    qualityProfileHint: "standard",
  },
];

// ── Mock Credentials ──

export const mockCredentials: ProviderCredential[] = [
  {
    id: "cred-openai-1",
    providerId: "prov-openai",
    credentialLabel: "Production API Key",
    status: "valid",
    lastValidatedAt: "2026-03-22T14:00:00Z",
    lastError: null,
  },
  {
    id: "cred-anthropic-1",
    providerId: "prov-anthropic",
    credentialLabel: "Production API Key",
    status: "valid",
    lastValidatedAt: "2026-03-22T13:45:00Z",
    lastError: null,
  },
];

// ── Mock Health ──

export const mockHealthChecks: ProviderHealthCheck[] = [
  {
    providerId: "prov-openai",
    reachable: true,
    lastSuccessAt: "2026-03-23T09:12:00Z",
    lastFailureAt: "2026-03-20T03:44:00Z",
    recentErrorRate: 0.2,
    rateLimitWarning: false,
  },
  {
    providerId: "prov-anthropic",
    reachable: true,
    lastSuccessAt: "2026-03-23T09:10:00Z",
    lastFailureAt: null,
    recentErrorRate: 0,
    rateLimitWarning: false,
  },
];

// ── Mock Routing Policies ──

export const mockRoutingPolicies: RoutingPolicy[] = [
  {
    id: "rp-1",
    policyName: "Founder Discussion",
    taskDomain: "founder_control",
    roleCode: "product_strategist",
    preferredProviderId: "prov-openai",
    preferredModelId: "mod-gpt4o",
    fallbackProviderId: "prov-anthropic",
    fallbackModelId: "mod-claude-sonnet",
    allowFallback: true,
    allowCrossProviderRetry: true,
    notes: "Non-critical discussion, fallback safe",
    status: "active",
  },
  {
    id: "rp-2",
    policyName: "Backend Implementation",
    taskDomain: "backend",
    roleCode: "backend_implementer",
    preferredProviderId: "prov-anthropic",
    preferredModelId: "mod-claude-sonnet",
    fallbackProviderId: null,
    fallbackModelId: null,
    allowFallback: false,
    allowCrossProviderRetry: false,
    notes: "Critical code work — no fallback without approval",
    status: "active",
  },
  {
    id: "rp-3",
    policyName: "Code Review",
    taskDomain: "review",
    roleCode: "reviewer",
    preferredProviderId: "prov-anthropic",
    preferredModelId: "mod-claude-opus",
    fallbackProviderId: null,
    fallbackModelId: null,
    allowFallback: false,
    allowCrossProviderRetry: false,
    notes: "Review quality depends on model — no silent switch",
    status: "active",
  },
  {
    id: "rp-4",
    policyName: "Product Drafting",
    taskDomain: "docs",
    roleCode: "product_strategist",
    preferredProviderId: "prov-openai",
    preferredModelId: "mod-gpt4o",
    fallbackProviderId: "prov-anthropic",
    fallbackModelId: "mod-claude-sonnet",
    allowFallback: true,
    allowCrossProviderRetry: true,
    notes: "Drafting is safe for fallback",
    status: "active",
  },
  {
    id: "rp-5",
    policyName: "Architecture Analysis",
    taskDomain: "backend",
    roleCode: "solution_architect",
    preferredProviderId: "prov-anthropic",
    preferredModelId: "mod-claude-opus",
    fallbackProviderId: "prov-openai",
    fallbackModelId: "mod-o1",
    allowFallback: true,
    allowCrossProviderRetry: false,
    notes: "Fallback to o1 acceptable for reasoning tasks",
    status: "active",
  },
  {
    id: "rp-6",
    policyName: "Release Summary",
    taskDomain: "release",
    roleCode: "release_coordinator",
    preferredProviderId: "prov-openai",
    preferredModelId: "mod-gpt4o-mini",
    fallbackProviderId: null,
    fallbackModelId: null,
    allowFallback: false,
    allowCrossProviderRetry: false,
    notes: "Low-cost summarization",
    status: "active",
  },
];

// ── Mock Usage ──

export const mockUsageSnapshots: UsageSnapshot[] = [
  {
    providerId: "prov-openai",
    period: "2026-03",
    requestCount: 1247,
    inputTokens: 3_420_000,
    outputTokens: 890_000,
    estimatedCostUsd: 34.50,
  },
  {
    providerId: "prov-anthropic",
    period: "2026-03",
    requestCount: 862,
    inputTokens: 5_100_000,
    outputTokens: 1_230_000,
    estimatedCostUsd: 48.20,
  },
];

// ── Helpers ──

export function getProviderModels(providerId: string) {
  return mockModels.filter((m) => m.providerId === providerId);
}

export function getProviderCredential(providerId: string) {
  return mockCredentials.find((c) => c.providerId === providerId);
}

export function getProviderHealth(providerId: string) {
  return mockHealthChecks.find((h) => h.providerId === providerId);
}

export function getProviderUsage(providerId: string) {
  return mockUsageSnapshots.find((u) => u.providerId === providerId);
}

export function getProviderPolicies(providerId: string) {
  return mockRoutingPolicies.filter((p) => p.preferredProviderId === providerId);
}
