// Full workflow simulation harness
// Project → Task → Run → Artifact → Review → Task Done → Milestone Complete
// Uses only existing services. No direct state mutation.

import { OrchestrationService } from "@/services/OrchestrationService";
import { ProjectService } from "@/services/ProjectService";
import { TaskService } from "@/services/TaskService";
import { RunService } from "@/services/RunService";
import { ArtifactService } from "@/services/ArtifactService";
import { ReviewService } from "@/services/ReviewService";
import { ApprovalService } from "@/services/ApprovalService";

interface PrismaLike {
  $transaction: <T>(fn: (tx: any) => Promise<T>) => Promise<T>;
  [key: string]: any;
}

function log(step: number, label: string, detail?: any) {
  console.log(`[STEP ${String(step).padStart(2, "0")}] ${label}`, detail ? JSON.stringify(detail, null, 2) : "");
}

export async function simulateWorkflow(prisma: PrismaLike) {
  // 1. Instantiate services
  const orchestration = new OrchestrationService(prisma);
  const projectService = new ProjectService(prisma, orchestration);
  const taskService = new TaskService(prisma, orchestration);
  const runService = new RunService(prisma, orchestration);
  const artifactService = new ArtifactService(prisma, orchestration);
  const reviewService = new ReviewService(prisma, orchestration);
  const approvalService = new ApprovalService(prisma, orchestration);

  try {
    // 2. Create project in scoped state
    const project = await prisma.$transaction(async (tx: any) => {
      return tx.projects.create({
        data: {
          name: "Simulation Project",
          slug: `sim-${Date.now()}`,
          purpose: "End-to-end workflow simulation",
          state: "scoped",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    });
    log(2, "Project created", { id: project.id, state: project.state });

    // 3. Insert required documents
    const requiredDocs = [
      { path: "docs/00-project-brief.md", title: "Project Brief", type: "brief" },
      { path: "docs/04-domain-boundaries.md", title: "Domain Boundaries", type: "domain" },
      { path: "docs/05-lifecycle-state-machine.md", title: "Lifecycle State Machine", type: "lifecycle" },
    ];

    for (const doc of requiredDocs) {
      await prisma.$transaction(async (tx: any) => {
        return tx.documents.create({
          data: {
            project_id: project.id,
            title: doc.title,
            file_path: doc.path,
            doc_type: doc.type,
            status: "active",
            content_markdown: `# ${doc.title}\n\nSimulation document.`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        });
      });
    }
    log(3, "Required documents inserted", requiredDocs.map((d) => d.path));

    // 4. Request project activation approval
    const activationApproval = await approvalService.requestApproval({
      projectId: project.id,
      approvalType: "project_activation",
      targetType: "project",
      targetId: project.id,
      summary: "Request to activate simulation project",
    });
    log(4, "Activation approval requested", { id: activationApproval.id, state: activationApproval.state });

    // 5. Resolve approval as approved
    const resolvedActivation = await approvalService.resolveApproval({
      approvalId: activationApproval.id,
      decision: "approved",
      decisionNote: "Approved for simulation",
      actorType: "founder",
    });
    log(5, "Activation approval resolved", { id: activationApproval.id, state: resolvedActivation.state });

    // 6. Activate project
    const activeProject = await projectService.activateProject(project.id, "founder");
    log(6, "Project activated", { id: project.id, state: activeProject.state });

    // Ensure an agent role exists
    let agentRole = await prisma.$transaction(async (tx: any) => {
      const existing = await tx.agent_roles.findFirst({ where: { status: "active" } });
      if (existing) return existing;
      return tx.agent_roles.create({
        data: {
          name: "Simulation Agent",
          code: "sim_agent",
          description: "Agent for workflow simulation",
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    });
    log(6.5, "Agent role ready", { id: agentRole.id, name: agentRole.name });

    // Ensure a reviewer role exists
    let reviewerRole = await prisma.$transaction(async (tx: any) => {
      const existing = await tx.agent_roles.findFirst({
        where: { status: "active", code: { not: agentRole.code } },
      });
      if (existing) return existing;
      return tx.agent_roles.create({
        data: {
          name: "Simulation Reviewer",
          code: "sim_reviewer",
          description: "Reviewer for workflow simulation",
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    });
    log(6.6, "Reviewer role ready", { id: reviewerRole.id, name: reviewerRole.name });

    // 7. Create task in ready state
    const task = await prisma.$transaction(async (tx: any) => {
      return tx.tasks.create({
        data: {
          project_id: project.id,
          title: "Simulation Task",
          purpose: "Test full workflow pipeline",
          domain: "docs",
          expected_output_type: "document",
          state: "ready",
          priority: "medium",
          acceptance_criteria: [{ description: "Output must exist" }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    });
    log(7, "Task created", { id: task.id, state: task.state });

    // 8. Assign task
    const assignedTask = await taskService.assignTask({
      taskId: task.id,
      ownerRoleId: agentRole.id,
      actorType: "system",
    });
    log(8, "Task assigned", { id: task.id, state: assignedTask.state, owner: agentRole.name });

    // 9. Create ContextPack
    const contextPack = await prisma.$transaction(async (tx: any) => {
      return tx.context_packs.create({
        data: {
          project_id: project.id,
          task_id: task.id,
          summary: "Simulation context pack",
          included_document_ids: [],
          included_artifact_ids: [],
          included_file_paths: [],
          assumptions: [{ note: "This is a simulation" }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    });
    log(9, "ContextPack created", { id: contextPack.id });

    // 10-11. Start Run (includes executeRun via enqueue)
    const run = await runService.startRun({ taskId: task.id, actorType: "system" });
    log(11, "Run started and executed", { id: run.id, run_number: run.run_number });

    // 12. Find produced artifact
    const artifact = await prisma.$transaction(async (tx: any) => {
      return tx.artifacts.findFirst({
        where: { run_id: run.id },
      });
    });

    if (!artifact) {
      throw new Error("No artifact produced by run");
    }
    log(12, "Artifact found", { id: artifact.id, state: artifact.state, title: artifact.title });

    // 13. Classify artifact (created → classified)
    await orchestration.transitionEntity({
      entityType: "artifact",
      entityId: artifact.id,
      toState: "classified",
      actorType: "system",
      projectId: project.id,
      metadata: { trigger: "auto-classify after run" },
    });
    log(13, "Artifact classified", { id: artifact.id });

    // 14. Submit for review
    const review = await artifactService.submitForReview({
      artifactId: artifact.id,
      reviewerRoleId: reviewerRole.id,
      actorType: "system",
    });
    log(14, "Artifact submitted for review", { review_id: review.id });

    // 15. Approve review
    const approvedResult = await reviewService.approveReview({
      reviewId: review.id,
      verdict: "approved",
      actorType: "agent_role",
    });
    log(15, "Review approved", { task_state: approvedResult?.state });

    // 16. Complete task
    const completedTask = await taskService.completeTask({
      taskId: task.id,
      actorType: "founder",
    });
    log(16, "Task completed", { id: task.id, state: completedTask.state });

    // 17. Request release approval
    const releaseApproval = await approvalService.requestApproval({
      projectId: project.id,
      approvalType: "release",
      targetType: "project",
      targetId: project.id,
      summary: "Release candidate ready for milestone completion",
    });
    log(17, "Release approval requested", { id: releaseApproval.id });

    // 18. Resolve release approval
    const resolvedRelease = await approvalService.resolveApproval({
      approvalId: releaseApproval.id,
      decision: "approved",
      decisionNote: "Release approved for simulation milestone",
      actorType: "founder",
    });
    log(18, "Release approval resolved", { state: resolvedRelease.state });

    // 19. Move project to in_review
    await orchestration.transitionEntity({
      entityType: "project",
      entityId: project.id,
      toState: "in_review",
      actorType: "founder",
      projectId: project.id,
      metadata: { use_case: "UC-12", trigger: "release candidate submitted" },
    });
    log(19, "Project moved to in_review");

    // 20. Complete milestone
    const completedProject = await projectService.completeMilestone({
      projectId: project.id,
      actorType: "founder",
    });
    log(20, "Milestone completed", { id: project.id, state: completedProject.state });

    console.log("\n========================================");
    console.log("SIMULATION COMPLETE — ALL STEPS PASSED");
    console.log("========================================\n");

    return { project: completedProject, task: completedTask, run, artifact, review };
  } catch (error) {
    console.error("\n========================================");
    console.error("SIMULATION FAILED");
    console.error("========================================");
    if (error instanceof Error) {
      console.error("Error:", error.message);
      console.error("Stack:", error.stack);
    } else {
      console.error("Error:", error);
    }
    throw error;
  }
}
