---
layer: cross-cutting
criticality: critical
enabled_in_production: yes (flag system itself is always active)
---

# 08 — Feature Flags

> Cross-cutting — applies to all layers

## 1 — Purpose

Defines all experimental feature flags. Flags are stored in `system_settings.experimental_features` (jsonb).

**Rule:** In production mode, ALL flags are forced `false`. Flags only take effect in experimental mode.

---

## 2 — Flag Definitions

| Flag | Controls | Layer | Token Impact | Disabled in Production |
|------|----------|-------|-------------|----------------------|
| `enable_autonomy` | AutonomyPipelineService | 3 | Very High | ✅ Yes |
| `enable_dual_verification` | DualVerificationService | 3 | High (2× per run) | ✅ Yes |
| `enable_self_review` | SelfReviewService | 3 | Medium (1.5× per run) | ✅ Yes |
| `enable_context_compression` | ContextCompressionService | 3 | Low–Medium | ✅ Yes |
| `enable_model_competition` | ModelCompetitionService | 3 | Medium | ✅ Yes |
| `enable_prompt_experiments` | PromptImprovementService | 3 | Medium | ✅ Yes |
| `enable_blog` | CompanyMediaService | 2 | Medium | ✅ Yes |

---

## 3 — Guard Pattern

Every guarded service checks at entry point:

```typescript
const { isFeatureEnabled } = await import("@/services/SystemModeService");
if (!(await isFeatureEnabled("enable_<feature>"))) {
  return <no-op result>;
}
```

---

## 4 — Services with Mode Guards

| Service | Guard | No-op Return |
|---------|-------|-------------|
| AutonomyPipelineService.ingestIdea() | `enable_autonomy` | `null` |
| DualVerificationService.verify() | `enable_dual_verification` | `{ valid: true, risk_level: "low" }` |
| SelfReviewService.selfReview() | `enable_self_review` | `{ performed: false }` |
| ContextCompressionService.compressTaskContext() | `enable_context_compression` | `{ snapshotId: null }` |
| PromptImprovementService.analyzeRolePerformance() | `enable_prompt_experiments` | `{ suggestionId: null }` |
| BottleneckPredictionService.runPredictionCycle() | `isProduction()` | `{ predictions: [] }` |
| CompanyMediaService.detectSignificantEvents() | `enable_blog` | `[]` |
| RunExecutor: self-review step | `enable_self_review` | skip |
| RunExecutor: auto-retry step | `isProduction()` | skip |

---

## 5 — Safety

1. Production mode = all flags forced false (server-side enforcement)
2. Switching to production via API resets all flags to false in DB
3. Flags cannot be set individually in production mode
4. Cache invalidation happens on mode switch
