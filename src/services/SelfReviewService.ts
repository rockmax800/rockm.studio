// Self-Review Layer (PART 2)
// Before human review, agent self-reviews against acceptance criteria.
// Does NOT modify state. Only stores notes on artifact metadata.

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

export class SelfReviewService {
  private prisma: PrismaLike;

  constructor(prisma: PrismaLike) {
    this.prisma = prisma;
  }

  async selfReview({
    artifactId,
    providerService,
    providerCode,
    modelCode,
  }: {
    artifactId: string;
    providerService: ProviderServiceLike;
    providerCode: string;
    modelCode: string;
  }): Promise<{ notes: string; performed: boolean }> {
    try {
      const artifact = await this.prisma.artifacts.findUniqueOrThrow({ where: { id: artifactId } });
      if (!artifact.task_id) return { notes: "", performed: false };

      const task = await this.prisma.tasks.findUniqueOrThrow({ where: { id: artifact.task_id } });

      // Check if agent role has self-review enabled
      if (task.owner_role_id) {
        const role = await this.prisma.agent_roles.findUniqueOrThrow({ where: { id: task.owner_role_id } });
        const skillProfile = role.skill_profile as Record<string, any> | null;
        if (!skillProfile?.enable_self_review) {
          return { notes: "", performed: false };
        }
      } else {
        return { notes: "", performed: false };
      }

      const contentPreview = (artifact.content_text ?? "").slice(0, 4000);
      const criteria = JSON.stringify(task.acceptance_criteria ?? []);

      const prompt = `Self-review this output against acceptance criteria:\n\nAcceptance Criteria:\n${criteria}\n\nOutput:\n${contentPreview}\n\nProvide a brief self-review with: strengths, weaknesses, and whether acceptance criteria are met.`;

      logInfo("self_review_start", { artifactId, provider: providerCode });

      const result = await providerService.callProviderDirect(
        providerCode,
        modelCode,
        "You are a quality self-review agent. Evaluate the output against criteria honestly.",
        prompt,
      );

      // Store as summary metadata — do NOT change artifact state
      try {
        await this.prisma.artifacts.update({
          where: { id: artifactId },
          data: {
            summary: artifact.summary
              ? `${artifact.summary}\n\n--- SELF-REVIEW ---\n${result.outputText.slice(0, 1000)}`
              : `--- SELF-REVIEW ---\n${result.outputText.slice(0, 1000)}`,
            updated_at: new Date().toISOString(),
          },
        });
      } catch { /* best-effort */ }

      logInfo("self_review_complete", { artifactId });
      return { notes: result.outputText, performed: true };
    } catch (error) {
      logError("self_review_error", { artifactId, error: error instanceof Error ? error.message : "unknown" });
      return { notes: "", performed: false };
    }
  }
}
