// Context Compression Memory (PART 4)
// After task completion: generate compressed summary → store as ContextSnapshot.
// When building new ContextPack: include snapshot instead of full artifact history.

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

export class ContextCompressionService {
  private prisma: PrismaLike;

  constructor(prisma: PrismaLike) {
    this.prisma = prisma;
  }

  /**
   * Generate and store a compressed summary after task completion.
   */
  async compressTaskContext({
    taskId,
    projectId,
    providerService,
    providerCode,
    modelCode,
  }: {
    taskId: string;
    projectId: string;
    providerService: ProviderServiceLike;
    providerCode: string;
    modelCode: string;
  }): Promise<{ snapshotId: string | null }> {
    try {
      const task = await this.prisma.tasks.findUniqueOrThrow({ where: { id: taskId } });

      // Gather artifacts for this task
      const artifacts = await this.prisma.artifacts.findMany({
        where: { task_id: taskId },
        orderBy: { created_at: "desc" },
      });

      if (artifacts.length === 0) {
        return { snapshotId: null };
      }

      const artifactSummaries = artifacts
        .map((a: any) => `- ${a.title} (${a.state}): ${(a.summary ?? a.content_text ?? "").slice(0, 300)}`)
        .join("\n");

      const prompt = `Summarize this task outcome and key decisions in 5 bullet points:\n\nTask: ${task.title}\nPurpose: ${task.purpose}\nOutcome: ${task.state}\n\nArtifacts:\n${artifactSummaries}`;

      logInfo("context_compression_start", { taskId });

      const result = await providerService.callProviderDirect(
        providerCode,
        modelCode,
        "You are a concise summarizer. Produce exactly 5 bullet points capturing key outcomes and decisions.",
        prompt,
      );

      const snapshot = await this.prisma.context_snapshots.create({
        data: {
          task_id: taskId,
          project_id: projectId,
          summary: result.outputText.slice(0, 2000),
          created_at: new Date().toISOString(),
        },
      });

      logInfo("context_compression_complete", { taskId, snapshotId: snapshot.id });
      return { snapshotId: snapshot.id };
    } catch (error) {
      logError("context_compression_error", { taskId, error: error instanceof Error ? error.message : "unknown" });
      return { snapshotId: null };
    }
  }

  /**
   * Enrich a context pack summary with previous task snapshots from the same project.
   */
  async enrichContextPack({
    projectId,
    existingSummary,
  }: {
    projectId: string;
    existingSummary: string;
  }): Promise<string> {
    try {
      const snapshots = await this.prisma.context_snapshots.findMany({
        where: { project_id: projectId },
        orderBy: { created_at: "desc" },
      });

      if (snapshots.length === 0) return existingSummary;

      const snapshotText = snapshots
        .slice(0, 10)
        .map((s: any) => s.summary)
        .join("\n\n");

      return `${existingSummary}\n\n--- PRIOR CONTEXT (compressed) ---\n${snapshotText}`;
    } catch {
      return existingSummary;
    }
  }
}
