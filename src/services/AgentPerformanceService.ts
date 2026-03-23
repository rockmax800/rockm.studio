// AgentPerformanceService — Updates agent role performance metrics
// Called after review resolution to track quality data.

interface PrismaLike {
  $transaction: <T>(fn: (tx: any) => Promise<T>, options?: any) => Promise<T>;
  [key: string]: any;
}

export class AgentPerformanceService {
  private prisma: PrismaLike;

  constructor(prisma: PrismaLike) {
    this.prisma = prisma;
  }

  async recordRunEvaluation({
    runId,
    roleId,
    qualityScore,
    reviewOutcome,
  }: {
    runId: string;
    roleId: string | null;
    qualityScore: number;
    reviewOutcome: string;
  }) {
    await this.prisma.$transaction(async (tx: any) => {
      // Load run for latency
      const run = await tx.runs.findUniqueOrThrow({ where: { id: runId } });
      const latencyMs = run.duration_ms ?? null;

      // Cost score from usage log
      let costScore = 0;
      try {
        const usageLog = await tx.provider_usage_logs.findFirst({
          where: { run_id: runId },
          orderBy: { created_at: "desc" },
        });
        costScore = usageLog?.estimated_cost_usd ? Number(usageLog.estimated_cost_usd) : 0;
      } catch {
        // best-effort
      }

      // Create RunEvaluation
      await tx.run_evaluations.create({
        data: {
          run_id: runId,
          role_id: roleId,
          quality_score: qualityScore,
          cost_score: costScore,
          latency_ms: latencyMs,
          review_outcome: reviewOutcome,
        },
      });

      // Update agent role performance metrics
      if (roleId) {
        const role = await tx.agent_roles.findUniqueOrThrow({ where: { id: roleId } });
        const newTotalRuns = (role.total_runs ?? 0) + 1;

        // Count successes from run_evaluations
        const successCount = await tx.run_evaluations.count({
          where: { role_id: roleId, quality_score: { gte: 1 } },
        });
        // +1 if this one is a success (already inserted above)
        const newSuccessRate = newTotalRuns > 0 ? successCount / newTotalRuns : 0;

        // Simple performance score: weighted average
        const newPerfScore = (newSuccessRate * 0.7) + (Math.max(0, 1 - costScore) * 0.3);

        await tx.agent_roles.update({
          where: { id: roleId },
          data: {
            total_runs: newTotalRuns,
            success_rate: Math.round(newSuccessRate * 10000) / 10000,
            performance_score: Math.round(newPerfScore * 10000) / 10000,
            updated_at: new Date().toISOString(),
          },
        });
      }
    });
  }
}
