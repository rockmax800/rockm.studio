// Anthropic provider adapter
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/config/env";
import { logInfo, logError } from "@/lib/logger";

const COST_PER_TOKEN = 0.000003;

interface AnthropicCallParams {
  modelCode: string;
  systemPrompt: string;
  userPrompt: string;
  timeoutMs?: number;
}

interface ProviderCallResult {
  outputText: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
}

export async function callAnthropic({
  modelCode,
  systemPrompt,
  userPrompt,
  timeoutMs = 30_000,
}: AnthropicCallParams): Promise<ProviderCallResult> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const start = Date.now();

  logInfo("provider_call_start", { provider: "anthropic", model: modelCode });

  const messagePromise = client.messages.create({
    model: modelCode,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user" as const, content: userPrompt }],
  });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Anthropic call timed out after ${timeoutMs}ms`)), timeoutMs),
  );

  const message = await Promise.race([messagePromise, timeoutPromise]);
  const latencyMs = Date.now() - start;

  const textBlocks = message.content.filter((b: any) => b.type === "text");
  const outputText = textBlocks.map((b: any) => b.text).join("\n");
  const inputTokens = message.usage?.input_tokens ?? 0;
  const outputTokens = message.usage?.output_tokens ?? 0;
  const totalTokens = inputTokens + outputTokens;
  const estimatedCostUsd = totalTokens * COST_PER_TOKEN;

  logInfo("provider_call_complete", {
    provider: "anthropic",
    model: modelCode,
    latencyMs,
    totalTokens,
    estimatedCostUsd,
  });

  return { outputText, inputTokens, outputTokens, totalTokens, estimatedCostUsd, latencyMs };
}

export async function healthCheckAnthropic(timeoutMs = 5_000): Promise<{ healthy: boolean; error?: string }> {
  if (!env.ANTHROPIC_API_KEY) {
    return { healthy: false, error: "ANTHROPIC_API_KEY not configured" };
  }

  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const promise = client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    });
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Health check timed out")), timeoutMs),
    );
    await Promise.race([promise, timeout]);
    return { healthy: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logError("provider_health_check_failed", { provider: "anthropic", error: msg });
    return { healthy: false, error: msg };
  }
}
