import { createServices, errorResponse } from "@/api/serviceFactory";
import { verifyAdminKey } from "@/api/adminAuth";

interface Violation {
  type: string;
  entityType: string;
  entityId: string;
  detail: string;
}

export async function GET(req: Request) {
  const auth = verifyAdminKey(req);
  if (!auth.authorized) return auth.response!;

  try {
    const { prisma } = createServices();
    const violations: Violation[] = [];

    // 1. Tasks in "done" with non-closed reviews or pending approvals
    const doneTasks = await prisma.tasks.findMany({ where: { state: "done" }, select: { id: true, title: true } });
    for (const task of doneTasks) {
      const openReviews = await prisma.reviews.count({ where: { task_id: task.id, state: { not: "closed" } } });
      if (openReviews > 0) {
        violations.push({ type: "done_task_open_review", entityType: "task", entityId: task.id, detail: `Task "${task.title}" is done but has ${openReviews} non-closed review(s)` });
      }
      const pendingApprovals = await prisma.approvals.count({ where: { target_type: "task", target_id: task.id, state: "pending" } });
      if (pendingApprovals > 0) {
        violations.push({ type: "done_task_pending_approval", entityType: "task", entityId: task.id, detail: `Task "${task.title}" is done but has ${pendingApprovals} pending approval(s)` });
      }
    }

    // 2. Projects in "completed" with non-terminal tasks
    const completedProjects = await prisma.projects.findMany({ where: { state: "completed" }, select: { id: true, name: true } });
    for (const project of completedProjects) {
      const nonTerminal = await prisma.tasks.count({ where: { project_id: project.id, state: { notIn: ["done", "cancelled"] } } });
      if (nonTerminal > 0) {
        violations.push({ type: "completed_project_open_tasks", entityType: "project", entityId: project.id, detail: `Project "${project.name}" is completed but has ${nonTerminal} non-terminal task(s)` });
      }
    }

    // 3. Runs in "running" without started_at
    const runningNoStart = await prisma.runs.findMany({ where: { state: "running", started_at: null }, select: { id: true, run_number: true } });
    for (const run of runningNoStart) {
      violations.push({ type: "running_run_no_start", entityType: "run", entityId: run.id, detail: `Run #${run.run_number} is running but has no started_at` });
    }

    // 4. Non-closed reviews with missing artifact
    const openReviews = await prisma.reviews.findMany({ where: { state: { not: "closed" } }, select: { id: true, artifact_id: true } });
    for (const review of openReviews) {
      const artifact = await prisma.artifacts.findUnique({ where: { id: review.artifact_id }, select: { id: true } });
      if (!artifact) {
        violations.push({ type: "review_missing_artifact", entityType: "review", entityId: review.id, detail: `Review references non-existent artifact ${review.artifact_id}` });
      }
    }

    // 5. Artifacts without task or run reference
    const noRefArtifacts = await prisma.artifacts.findMany({ where: { task_id: null, run_id: null }, select: { id: true, title: true } });
    for (const art of noRefArtifacts) {
      violations.push({ type: "artifact_no_reference", entityType: "artifact", entityId: art.id, detail: `Artifact "${art.title}" has no task_id and no run_id` });
    }

    return Response.json({ violations, count: violations.length, checkedAt: new Date().toISOString() });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
