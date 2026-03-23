// Auto-Retry Policy Engine (PART 6)
// Bounded auto-retry for specific failure modes only.
// All retries go through RunService.retryRun — no lifecycle bypass.

import { logInfo, logError } from "@/lib/logger";

interface PrismaLike {
  $transaction: <T>(fn: (tx: any) => Promise<T>, options?: any) => Promise<T>;
  [key: string]: any;
}

interface RunServiceLike {
  retryRun: (runId: string) => Promise<any>;
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

const MAX_AUTO_RETRIES = 2;
const RETRYABLE_REASONS = ["provider_timeout", "timed out", "timeout", "rate limit", "429"];
const NON_RETRYABLE_REASONS = ["validation_high_risk", "guard_error", "concurrency"];

function isRetryable(failureReason: string | null): boolean {
  if (!failureReason) return false;
  const lower = failureReason.toLowerCase();
  if (NON_RETRYABLE_REASONS.some((r) => lower.includes(r))) return false;
  return RETRYABLE_REASONS.some((r) => lower.includes(r));
}

export class RetryPolicyService {
  private prisma: PrismaLike;
  private runService: RunServiceLike;
  private officeEmitter: OfficeEventEmitter | null;

  constructor(prisma: PrismaLike, runService: RunServiceLike, officeEmitter?: OfficeEventEmitter) {
    this.prisma = prisma;
    this.runService = runService;
    this.officeEmitter = officeEmitter ?? null;
  }

  async evaluateAndRetry(runId: string): Promise<{ retried: boolean; newRunId?: string; reason?: string }> {
    const run = await this.prisma.runs.findUniqueOrThrow({ where: { id: runId } });

    if (run.state !== "failed" && run.state !== "timed_out") {
      return { retried: false, reason: `Run state "${run.state}" is not retryable` };
    }

    if (!isRetryable(run.failure_reason)) {
      logInfo("auto_retry_skipped_non_retryable", { runId, failure_reason: run.failure_reason });
      return { retried: false, reason: `Failure reason not auto-retryable: "${run.failure_reason}"` };
    }

    // Count existing retries in chain
    let retryCount = 0;
    let currentId: string | null = run.retry_of_run_id;
    while (currentId && retryCount < MAX_AUTO_RETRIES + 1) {
      retryCount++;
      const parent = await this.prisma.runs.findUnique({ where: { id: currentId } });
      currentId = parent?.retry_of_run_id ?? null;
    }

    if (retryCount >= MAX_AUTO_RETRIES) {
      logInfo("auto_retry_max_reached", { runId, retryCount });
      return { retried: false, reason: `Max auto-retries (${MAX_AUTO_RETRIES}) reached` };
    }

    // Execute retry through RunService
    try {
      logInfo("auto_retry_triggered", { runId, retryCount: retryCount + 1, failure_reason: run.failure_reason });
      const newRun = await this.runService.retryRun(runId);

      // Emit office event
      if (this.officeEmitter) {
        try {
          await this.officeEmitter.emitOfficeEvent({
            projectId: run.project_id,
            entityType: "run",
            entityId: newRun.id,
            eventType: "auto_retry",
            actorRoleId: run.agent_role_id,
          });
        } catch { /* best-effort */ }
      }

      return { retried: true, newRunId: newRun.id };
    } catch (error) {
      logError("auto_retry_failed", { runId, error: error instanceof Error ? error.message : "unknown" });
      return { retried: false, reason: `Retry failed: ${error instanceof Error ? error.message : "unknown"}` };
    }
  }
}
