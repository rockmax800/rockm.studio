// OpenAI provider adapter
import OpenAI from "openai";
import { env } from "@/config/env";
import { logInfo, logError } from "@/lib/logger";

const COST_PER_TOKEN = 0.000002;

interface OpenAICallParams {
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

export async function callOpenAI({
  modelCode,
  systemPrompt,
  userPrompt,
  timeoutMs = 30_000,
}: OpenAICallParams): Promise<ProviderCallResult> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const start = Date.now();

  logInfo("provider_call_start", { provider: "openai", model: modelCode });

  const completionPromise = client.chat.completions.create({
    model: modelCode,
    messages: [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ],
  });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`OpenAI call timed out after ${timeoutMs}ms`)), timeoutMs),
  );

  const completion = await Promise.race([completionPromise, timeoutPromise]);
  const latencyMs = Date.now() - start;

  const outputText = completion.choices?.[0]?.message?.content ?? "";
  const inputTokens = completion.usage?.prompt_tokens ?? 0;
  const outputTokens = completion.usage?.completion_tokens ?? 0;
  const totalTokens = completion.usage?.total_tokens ?? inputTokens + outputTokens;
  const estimatedCostUsd = totalTokens * COST_PER_TOKEN;

  logInfo("provider_call_complete", {
    provider: "openai",
    model: modelCode,
    latencyMs,
    totalTokens,
    estimatedCostUsd,
  });

  return { outputText, inputTokens, outputTokens, totalTokens, estimatedCostUsd, latencyMs };
}

export async function healthCheckOpenAI(timeoutMs = 5_000): Promise<{ healthy: boolean; error?: string }> {
  if (!env.OPENAI_API_KEY) {
    return { healthy: false, error: "OPENAI_API_KEY not configured" };
  }

  try {
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const promise = client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
    });
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Health check timed out")), timeoutMs),
    );
    await Promise.race([promise, timeout]);
    return { healthy: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logError("provider_health_check_failed", { provider: "openai", error: msg });
    return { healthy: false, error: msg };
  }
}
