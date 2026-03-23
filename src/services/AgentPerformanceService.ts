// AgentPerformanceService — Updates agent role performance metrics
// Called after review resolution to track quality data.
// PART 5: Enhanced quality scoring with risk_level and rolling average of last 20 runs.

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
    validationRiskLevel,
  }: {
    runId: string;
    roleId: string | null;
    qualityScore: number;
    reviewOutcome: string;
    validationRiskLevel?: string;
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

      // PART 5 — Compute quality_score with risk_level penalty
      let adjustedQuality = qualityScore;
      if (validationRiskLevel === "high") {
        adjustedQuality -= 0.3;
      }
      // Normalize cost impact (cap at 1.0 USD for normalization)
      const normalizedCost = Math.min(costScore, 1.0);
      adjustedQuality -= normalizedCost * 0.1;
      adjustedQuality = Math.max(0, Math.min(1, adjustedQuality));

      // Create RunEvaluation
      await tx.run_evaluations.create({
        data: {
          run_id: runId,
          role_id: roleId,
          quality_score: Math.round(adjustedQuality * 10000) / 10000,
          cost_score: costScore,
          latency_ms: latencyMs,
          review_outcome: reviewOutcome,
          validation_risk_level: validationRiskLevel ?? null,
        },
      });

      // Update agent role performance metrics — rolling average of last 20 runs
      if (roleId) {
        const role = await tx.agent_roles.findUniqueOrThrow({ where: { id: roleId } });
        const newTotalRuns = (role.total_runs ?? 0) + 1;

        // Get last 20 evaluations for rolling average
        const recentEvals = await tx.run_evaluations.findMany({
          where: { role_id: roleId },
          orderBy: { created_at: "desc" },
          take: 20,
        });

        const avgQuality = recentEvals.length > 0
          ? recentEvals.reduce((sum: number, e: any) => sum + (e.quality_score ?? 0), 0) / recentEvals.length
          : 0;

        // Success rate from recent evals
        const successCount = recentEvals.filter((e: any) => e.quality_score >= 0.7).length;
        const newSuccessRate = recentEvals.length > 0 ? successCount / recentEvals.length : 0;

        await tx.agent_roles.update({
          where: { id: roleId },
          data: {
            total_runs: newTotalRuns,
            success_rate: Math.round(newSuccessRate * 10000) / 10000,
            performance_score: Math.round(avgQuality * 10000) / 10000,
            updated_at: new Date().toISOString(),
          },
        });
      }
    });
  }
}
