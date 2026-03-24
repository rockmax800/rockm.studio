// GET /api/pull-requests/[id]/ci — CI Diagnostics (Section 2)
// Read-only. Returns CheckSuite data for a pull request.

import { createServices, errorResponse } from "@/api/serviceFactory";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return Response.json({ error: "Pull Request ID required" }, { status: 400 });

    const { prisma } = createServices();

    const result = await prisma.$transaction(async (tx: any) => {
      const pr = await tx.pull_requests.findUniqueOrThrow({ where: { id } });

      const checkSuites = await tx.check_suites.findMany({
        where: { pull_request_id: id },
        orderBy: { started_at: "desc" },
      });

      return {
        pull_request: {
          id: pr.id,
          title: pr.title,
          status: pr.status,
          source_branch: pr.source_branch,
          target_branch: pr.target_branch,
          pr_number: pr.pr_number,
          opened_at: pr.opened_at,
          merged_at: pr.merged_at,
        },
        check_suites: checkSuites.map((cs: any) => ({
          id: cs.id,
          provider: cs.provider,
          status: cs.status,
          summary: cs.summary,
          logs_ref: cs.logs_ref,
          external_run_ref: cs.external_run_ref,
          started_at: cs.started_at,
          finished_at: cs.finished_at,
          duration_ms: cs.started_at && cs.finished_at
            ? new Date(cs.finished_at).getTime() - new Date(cs.started_at).getTime()
            : null,
        })),
        ci_passed: checkSuites.length > 0 && checkSuites[0]?.status === "passed",
        total_suites: checkSuites.length,
      };
    });

    return Response.json(result);
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
