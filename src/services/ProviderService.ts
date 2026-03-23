// ProviderService — Provider execution with real OpenAI/Anthropic integration
// UC-13 Execute Agent Run (Provider Call)
// Supports: openai, anthropic, mock fallback (dev only)

import { env } from "@/config/env";
import { logInfo, logError } from "@/lib/logger";
import { callOpenAI, healthCheckOpenAI } from "@/services/providers/openaiAdapter";
import { callAnthropic, healthCheckAnthropic } from "@/services/providers/anthropicAdapter";

interface PrismaTransactionClient {
  [key: string]: {
    findUniqueOrThrow: (args: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    count: (args: any) => Promise<number>;
  };
}

interface PrismaLike {
  $transaction: <T>(fn: (tx: PrismaTransactionClient) => Promise<T>, options?: any) => Promise<T>;
  [key: string]: any;
}

interface ProviderExecuteParams {
  run: any;
  task: any;
  contextPack: any;
}

interface ProviderResult {
  success: true;
  outputText: string;
  providerId: string;
  modelId: string;
}

type ProviderHealthStatus = "healthy" | "degraded" | "unavailable";

function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("rate limit") || msg.includes("429") || msg.includes("too many requests")) return true;
  }
  if (typeof error === "object" && error !== null && "status" in error) {
    return (error as any).status === 429;
  }
  return false;
}

function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.toLowerCase().includes("timed out");
  }
  return false;
}

export class ProviderService {
  private prisma: PrismaLike;

  constructor(prisma: PrismaLike) {
    this.prisma = prisma;
  }

  async execute({ run, task, contextPack }: ProviderExecuteParams): Promise<ProviderResult> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve routing policy
      const routingPolicy = await tx.routing_policies.findFirst({
        where: {
          task_domain: task.domain,
          role_code: task.owner_role_id ? undefined : undefined,
          status: "active",
        },
      }).catch(() => null);

      let providerId: string | null = null;
      let modelId: string | null = null;
      let providerCode = "mock";
      let modelCode = "mock-model";
      let providerName = "mock-provider";
      let fallbackProviderId: string | null = null;
      let fallbackModelId: string | null = null;
      let allowFallback = false;

      if (routingPolicy) {
        const providerModel = await tx.provider_models.findUniqueOrThrow({
          where: { id: routingPolicy.preferred_model_id },
        });
        const provider = await tx.providers.findUniqueOrThrow({
          where: { id: routingPolicy.preferred_provider_id },
        });

        if (provider.status !== "active") {
          throw new Error(`Provider "${provider.name}" is not active (status: "${provider.status}")`);
        }

        const credential = await tx.provider_credentials.findFirst({
          where: { provider_id: provider.id, status: "valid" },
        });
        if (!credential) {
          throw new Error(`No valid credential found for provider "${provider.name}"`);
        }

        providerId = provider.id;
        modelId = providerModel.id;
        providerCode = provider.code;
        modelCode = providerModel.model_code;
        providerName = provider.name;
        fallbackProviderId = routingPolicy.fallback_provider_id;
        fallbackModelId = routingPolicy.fallback_model_id;
        allowFallback = routingPolicy.allow_fallback;
      }

      const systemPrompt = contextPack?.summary ?? "";
      const userPrompt = task.purpose;

      // 2. Execute provider call with rate-limit fallback
      let result: { outputText: string; inputTokens: number; outputTokens: number; totalTokens: number; estimatedCostUsd: number; latencyMs: number };

      try {
        result = await this.callProvider(providerCode, modelCode, systemPrompt, userPrompt);
      } catch (error) {
        // Rate limit handling with fallback
        if (isRateLimitError(error) && allowFallback && fallbackProviderId && fallbackModelId) {
          logError("provider_rate_limited", { provider: providerCode, model: modelCode });

          // Mark primary provider as degraded
          await this.updateProviderStatus(tx, providerId, "degraded");

          // Try fallback
          const fallbackModel = await tx.provider_models.findUniqueOrThrow({ where: { id: fallbackModelId } });
          const fallbackProvider = await tx.providers.findUniqueOrThrow({ where: { id: fallbackProviderId } });

          logInfo("provider_fallback_attempt", { from: providerCode, to: fallbackProvider.code, model: fallbackModel.model_code });

          result = await this.callProvider(fallbackProvider.code, fallbackModel.model_code, systemPrompt, userPrompt);
          providerId = fallbackProvider.id;
          modelId = fallbackModel.id;
          providerCode = fallbackProvider.code;
          providerName = fallbackProvider.name;
          modelCode = fallbackModel.model_code;
        } else if (isRateLimitError(error)) {
          // No fallback — mark degraded and rethrow
          if (providerId) await this.updateProviderStatus(tx, providerId, "degraded");
          throw error;
        } else {
          throw error;
        }
      }

      // 3. Log usage
      try {
        await tx.provider_usage_logs.create({
          data: {
            provider_id: providerId,
            model_id: modelId,
            run_id: run.id,
            project_id: run.project_id,
            input_tokens: result.inputTokens,
            output_tokens: result.outputTokens,
            total_tokens: result.totalTokens,
            estimated_cost_usd: result.estimatedCostUsd,
            latency_ms: result.latencyMs,
            success: true,
            created_at: new Date().toISOString(),
          },
        });
      } catch {
        // Usage logging is best-effort
      }

      return {
        success: true as const,
        outputText: result.outputText,
        providerId: providerId ?? "mock",
        modelId: modelId ?? "mock",
      };
    }, { isolationLevel: "Serializable" });
  }

  private async callProvider(
    providerCode: string,
    modelCode: string,
    systemPrompt: string,
    userPrompt: string,
  ) {
    switch (providerCode) {
      case "openai":
        return callOpenAI({ modelCode, systemPrompt, userPrompt, timeoutMs: 30_000 });

      case "anthropic":
        return callAnthropic({ modelCode, systemPrompt, userPrompt, timeoutMs: 30_000 });

      default:
        // Mock fallback — only allowed in non-production
        if (env.isProduction) {
          throw new Error(`Unknown provider "${providerCode}" — mock fallback disabled in production`);
        }
        logInfo("provider_mock_execution", { provider: providerCode, model: modelCode });
        return {
          outputText: `[MOCK] Generated output for "${userPrompt}" using ${providerCode}/${modelCode}. Context: ${systemPrompt || "none"}`,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          estimatedCostUsd: 0,
          latencyMs: 0,
        };
    }
  }

  async healthCheck(providerId: string): Promise<{ status: ProviderHealthStatus; error?: string }> {
    return this.prisma.$transaction(async (tx) => {
      const provider = await tx.providers.findUniqueOrThrow({ where: { id: providerId } });

      let result: { healthy: boolean; error?: string };

      switch (provider.code) {
        case "openai":
          result = await healthCheckOpenAI(5_000);
          break;
        case "anthropic":
          result = await healthCheckAnthropic(5_000);
          break;
        default:
          result = { healthy: false, error: `Unknown provider code: "${provider.code}"` };
      }

      const newStatus: ProviderHealthStatus = result.healthy ? "healthy" : "unavailable";

      await tx.providers.update({
        where: { id: providerId },
        data: { status: newStatus, updated_at: new Date().toISOString() },
      });

      logInfo("provider_health_check", { provider: provider.code, status: newStatus, error: result.error });

      return { status: newStatus, error: result.error };
    });
  }

  private async updateProviderStatus(
    tx: PrismaTransactionClient,
    providerId: string | null,
    status: ProviderHealthStatus,
  ) {
    if (!providerId) return;
    try {
      await tx.providers.update({
        where: { id: providerId },
        data: { status, updated_at: new Date().toISOString() },
      });
    } catch {
      // Best-effort status update
    }
  }
}
