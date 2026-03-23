// Dual Model Verification Service (PART 1)
// After primary provider output, calls secondary provider to validate.
// Does NOT auto-fail. Flags high-risk for mandatory review.

import { logInfo, logError } from "@/lib/logger";

interface PrismaLike {
  $transaction: <T>(fn: (tx: any) => Promise<T>, options?: any) => Promise<T>;
  [key: string]: any;
}

interface ProviderServiceLike {
  callProviderDirect: (providerCode: string, modelCode: string, systemPrompt: string, userPrompt: string) => Promise<{
    outputText: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    latencyMs: number;
  }>;
}

interface OfficeEventEmitter {
  emitOfficeEvent: (params: {
    projectId: string;
    entityType: string;
    entityId: string;
    eventType: string;
    actorRoleId?: string | null;
  }) => Promise<void>;
}

export interface DualVerificationResult {
  valid: boolean;
  risk_level: "low" | "medium" | "high";
  notes: string;
}

export class DualVerificationService {
  private prisma: PrismaLike;
  private officeEmitter: OfficeEventEmitter | null;

  constructor(prisma: PrismaLike, officeEmitter?: OfficeEventEmitter) {
    this.prisma = prisma;
    this.officeEmitter = officeEmitter ?? null;
  }

  async verify({
    runId,
    projectId,
    generatedText,
    providerService,
    fallbackProviderCode,
    fallbackModelCode,
    agentRoleId,
  }: {
    runId: string;
    projectId: string;
    generatedText: string;
    providerService: ProviderServiceLike;
    fallbackProviderCode: string;
    fallbackModelCode: string;
    agentRoleId?: string | null;
  }): Promise<DualVerificationResult> {
    const validationPrompt = `Validate the following output for correctness, consistency, and risks:\n\n--- OUTPUT ---\n${generatedText.slice(0, 4000)}\n--- END ---\n\nRespond with exactly one JSON object:\n{"valid": true/false, "risk_level": "low"|"medium"|"high", "notes": "your assessment"}`;

    try {
      logInfo("dual_verification_start", { runId, verifier: `${fallbackProviderCode}/${fallbackModelCode}` });

      const result = await providerService.callProviderDirect(
        fallbackProviderCode,
        fallbackModelCode,
        "You are a quality verification agent. Evaluate output for correctness and risks. Return only JSON.",
        validationPrompt,
      );

      // Parse structured response
      let parsed: DualVerificationResult;
      try {
        const jsonMatch = result.outputText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in response");
        const raw = JSON.parse(jsonMatch[0]);
        parsed = {
          valid: Boolean(raw.valid),
          risk_level: ["low", "medium", "high"].includes(raw.risk_level) ? raw.risk_level : "medium",
          notes: String(raw.notes ?? ""),
        };
      } catch {
        parsed = { valid: true, risk_level: "medium", notes: "Could not parse verification response" };
      }

      // Store in run_evaluations
      try {
        await this.prisma.run_evaluations.create({
          data: {
            run_id: runId,
            role_id: agentRoleId ?? null,
            quality_score: parsed.valid ? 1 : 0,
            validation_passed: parsed.valid,
            validation_risk_level: parsed.risk_level,
            review_outcome: `dual_verification_${parsed.risk_level}`,
          },
        });
      } catch { /* best-effort */ }

      logInfo("dual_verification_complete", { runId, valid: parsed.valid, risk_level: parsed.risk_level });

      // Emit office event if failed
      if (!parsed.valid || parsed.risk_level === "high") {
        if (this.officeEmitter) {
          try {
            await this.officeEmitter.emitOfficeEvent({
              projectId,
              entityType: "run",
              entityId: runId,
              eventType: "dual_validation_failed",
              actorRoleId: agentRoleId,
            });
          } catch { /* best-effort */ }
        }
      }

      return parsed;
    } catch (error) {
      logError("dual_verification_error", { runId, error: error instanceof Error ? error.message : "unknown" });
      // On verification failure, default to medium risk — do NOT block
      return { valid: true, risk_level: "medium", notes: "Verification service unavailable" };
    }
  }
}
