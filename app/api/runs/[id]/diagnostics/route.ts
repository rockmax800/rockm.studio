// GET /api/runs/[id]/diagnostics — Run Diagnostics View (Section 1)
// Read-only operational diagnostics. No business logic.

import { createServices, errorResponse } from "@/api/serviceFactory";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return Response.json({ error: "Run ID required" }, { status: 400 });

    const { prisma } = createServices();

    const result = await prisma.$transaction(async (tx: any) => {
      const run = await tx.runs.findUniqueOrThrow({ where: { id } });

      // Resolve sandbox policy if set
      let sandboxPolicy = null;
      if (run.sandbox_policy_id) {
        try {
          sandboxPolicy = await tx.sandbox_policies.findUnique({
            where: { id: run.sandbox_policy_id },
          });
        } catch { /* best-effort */ }
      }

      // Provider info
      let provider = null;
      let model = null;
      if (run.provider_id) {
        try { provider = await tx.providers.findUnique({ where: { id: run.provider_id } }); } catch { /* */ }
      }
      if (run.provider_model_id) {
        try { model = await tx.provider_models.findUnique({ where: { id: run.provider_model_id } }); } catch { /* */ }
      }

      // Lease diagnostics
      const leaseExpired = run.lease_expires_at
        ? new Date(run.lease_expires_at).getTime() < Date.now()
        : null;

      const heartbeatStale = run.heartbeat_at
        ? (Date.now() - new Date(run.heartbeat_at).getTime()) > 2 * 60 * 1000
        : null;

      return {
        runId: run.id,
        lifecycle_state: run.state,
        run_number: run.run_number,
        correlation_id: run.correlation_id,
        // Provider
        provider: provider ? { id: provider.id, name: provider.name, code: provider.code } : null,
        model: model ? { id: model.id, display_name: model.display_name, model_code: model.model_code } : null,
        // Sandbox
        sandbox_policy: sandboxPolicy ? {
          id: sandboxPolicy.id,
          name: sandboxPolicy.name,
          cpu_limit: sandboxPolicy.cpu_limit,
          memory_limit_mb: sandboxPolicy.memory_limit_mb,
          timeout_seconds: sandboxPolicy.timeout_seconds,
          allowed_network: sandboxPolicy.allowed_network,
        } : null,
        // Lease & Heartbeat
        lease_owner: run.lease_owner ?? null,
        lease_acquired_at: run.lease_acquired_at ?? null,
        lease_expires_at: run.lease_expires_at ?? null,
        lease_expired: leaseExpired,
        heartbeat_at: run.heartbeat_at ?? null,
        heartbeat_stale: heartbeatStale,
        // Error classification
        error_class: run.error_class ?? null,
        exit_code: run.exit_code ?? null,
        failure_reason: run.failure_reason ?? null,
        // Logs
        logs_ref: run.logs_ref ?? null,
        // Tokens & Cost
        input_tokens: run.input_tokens ?? null,
        output_tokens: run.output_tokens ?? null,
        estimated_cost: run.estimated_cost ?? null,
        // Timing
        started_at: run.started_at ?? null,
        ended_at: run.ended_at ?? null,
        duration_ms: run.duration_ms ?? null,
        // Retry
        retry_count: run.retry_count ?? 0,
        superseded_by_id: run.superseded_by_id ?? null,
      };
    });

    return Response.json(result);
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
