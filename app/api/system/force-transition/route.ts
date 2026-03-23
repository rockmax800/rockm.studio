import { createServices, errorResponse } from "@/api/serviceFactory";
import { verifyAdminKey } from "@/api/adminAuth";

const ALLOWED_ENTITY_TYPES = ["project", "task", "run", "artifact", "review", "approval"] as const;

export async function POST(req: Request) {
  const auth = verifyAdminKey(req);
  if (!auth.authorized) return auth.response!;

  // Block in production
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Force transition is disabled in production" }, { status: 403 });
  }

  try {
    const { entityType, entityId, toState } = await req.json();

    if (!entityType || !entityId || !toState) {
      return Response.json({ error: "entityType, entityId, and toState are required" }, { status: 400 });
    }

    if (!ALLOWED_ENTITY_TYPES.includes(entityType)) {
      return Response.json({ error: `Invalid entityType. Allowed: ${ALLOWED_ENTITY_TYPES.join(", ")}` }, { status: 400 });
    }

    const { orchestration, prisma } = createServices();

    // Look up entity to get projectId
    const TABLE_MAP: Record<string, string> = {
      project: "projects", task: "tasks", run: "runs",
      artifact: "artifacts", review: "reviews", approval: "approvals",
    };
    const entity = await (prisma as any)[TABLE_MAP[entityType]].findUniqueOrThrow({ where: { id: entityId } });
    const projectId = entity.project_id ?? entityId;

    const updated = await orchestration.transitionEntity({
      entityType,
      entityId,
      toState,
      actorType: "founder",
      projectId,
      metadata: { use_case: "ADMIN_FORCE_TRANSITION", trigger: "manual recovery tool" },
    });

    return Response.json({ success: true, entity: updated });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
