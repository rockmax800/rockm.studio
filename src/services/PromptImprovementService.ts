// PromptImprovementService — PART 5
// Analyzes role performance, generates improvement suggestions via AI.
// Never auto-deploys. Stores suggestions for founder approval.

import { logInfo, logError } from "@/lib/logger";
import { OfficeEventEmitter } from "@/services/OfficeEventEmitter";

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

const DEFAULT_SUCCESS_THRESHOLD = 0.7;
const DEFAULT_HIGH_RISK_THRESHOLD = 0.3;

export class PromptImprovementService {
  private prisma: PrismaLike;
  private officeEmitter: OfficeEventEmitter;

  constructor(prisma: PrismaLike, officeEmitter: OfficeEventEmitter) {
    this.prisma = prisma;
    this.officeEmitter = officeEmitter;
  }

  /**
   * Analyze a role's performance and generate improvement suggestion if needed.
   */
  async analyzeRolePerformance({
    roleId,
    providerService,
    providerCode,
    modelCode,
    projectId,
    successThreshold = DEFAULT_SUCCESS_THRESHOLD,
  }: {
    roleId: string;
    providerService: ProviderServiceLike;
    providerCode: string;
    modelCode: string;
    projectId?: string;
    successThreshold?: number;
  }): Promise<{ suggestionId: string | null; reason: string }> {
    try {
      const role = await this.prisma.agent_roles.findUniqueOrThrow({ where: { id: roleId } });

      // Check if improvement is needed
      if (role.total_runs < 5) {
        return { suggestionId: null, reason: "Insufficient runs for analysis" };
      }

      // Gather recent evaluations
      const evaluations = await this.prisma.run_evaluations.findMany({
        where: { role_id: roleId },
        orderBy: { created_at: "desc" },
        take: 20,
      });

      if (evaluations.length < 3) {
        return { suggestionId: null, reason: "Insufficient evaluations" };
      }

      const successRate = evaluations.filter((e: any) => e.quality_score >= 0.7).length / evaluations.length;
      const highRiskRate = evaluations.filter((e: any) => e.validation_risk_level === "high").length / evaluations.length;

      const needsImprovement = successRate < successThreshold || highRiskRate > DEFAULT_HIGH_RISK_THRESHOLD;
      if (!needsImprovement) {
        return { suggestionId: null, reason: `Performance acceptable (success_rate: ${successRate}, high_risk_rate: ${highRiskRate})` };
      }

      // Get active prompt version
      const activeVersion = await this.prisma.prompt_versions.findFirst({
        where: { role_id: roleId, is_active: true },
      }).catch(() => null);

      const currentPrompt = activeVersion?.full_prompt ?? role.prompt_template ?? "";

      // Gather failure patterns
      const failedEvals = evaluations.filter((e: any) => e.quality_score < 0.7);
      const failurePatterns = failedEvals
        .map((e: any) => `- outcome: ${e.review_outcome}, risk: ${e.validation_risk_level ?? "unknown"}, quality: ${e.quality_score}`)
        .join("\n");

      const prompt = `Improve this prompt for better reliability and quality:\n\n--- CURRENT PROMPT ---\n${currentPrompt.slice(0, 3000)}\n--- END ---\n\nCommon failure patterns:\n${failurePatterns}\n\nSuccess rate: ${(successRate * 100).toFixed(1)}%\nHigh risk rate: ${(highRiskRate * 100).toFixed(1)}%\n\nProvide ONLY the improved prompt text, nothing else.`;

      logInfo("prompt_improvement_analysis", { roleId, successRate, highRiskRate });

      const result = await providerService.callProviderDirect(
        providerCode,
        modelCode,
        "You are a prompt engineering expert. Improve the given prompt to reduce failures and increase quality. Return only the improved prompt.",
        prompt,
      );

      const reason = `Success rate ${(successRate * 100).toFixed(1)}% below threshold ${(successThreshold * 100).toFixed(1)}%${highRiskRate > DEFAULT_HIGH_RISK_THRESHOLD ? `, high risk rate ${(highRiskRate * 100).toFixed(1)}%` : ""}`;

      // Store suggestion — NOT auto-approved
      const suggestion = await this.prisma.prompt_improvement_suggestions.create({
        data: {
          role_id: roleId,
          current_version_id: activeVersion?.id ?? null,
          suggested_prompt: result.outputText.slice(0, 10000),
          reason,
          approved: false,
          created_at: new Date().toISOString(),
        },
      });

      logInfo("prompt_suggestion_generated", { roleId, suggestionId: suggestion.id });

      // Office event
      if (projectId) {
        try {
          await this.officeEmitter.emitOfficeEvent({
            projectId,
            entityType: "agent_role",
            entityId: roleId,
            eventType: "prompt_suggestion_generated",
          });
        } catch { /* best-effort */ }
      }

      return { suggestionId: suggestion.id, reason };
    } catch (error) {
      logError("prompt_improvement_error", { roleId, error: error instanceof Error ? error.message : "unknown" });
      return { suggestionId: null, reason: `Error: ${error instanceof Error ? error.message : "unknown"}` };
    }
  }
}
