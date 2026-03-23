// PART 6 — Founder Approval for Prompt Changes
// POST: Approve a suggestion → create new PromptVersion → activate it
// Admin-only endpoint.

import { verifyAdminKey } from "@/api/adminAuth";
import { createServices, errorResponse } from "@/api/serviceFactory";
import { PromptVersionService } from "@/services/PromptVersionService";
import { OfficeEventEmitter } from "@/services/OfficeEventEmitter";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const auth = verifyAdminKey(req);
  if (!auth.authorized) return auth.response!;

  try {
    const { prisma } = createServices();
    const suggestionId = params.id;
    const body = await req.json().catch(() => ({}));
    const projectId = body.project_id as string | undefined;

    // Load suggestion
    const suggestion = await prisma.prompt_improvement_suggestions.findUniqueOrThrow({
      where: { id: suggestionId },
    });

    if (suggestion.approved) {
      return Response.json({ error: "Suggestion already approved" }, { status: 400 });
    }

    const officeEmitter = new OfficeEventEmitter(prisma);
    const promptVersionService = new PromptVersionService(prisma, officeEmitter);

    // Create new version from suggestion
    const newVersion = await promptVersionService.createVersion({
      roleId: suggestion.role_id,
      fullPrompt: suggestion.suggested_prompt,
      createdBy: "founder",
    });

    // Activate it
    await promptVersionService.activateVersion(newVersion.id, projectId);

    // Mark suggestion as approved
    await prisma.prompt_improvement_suggestions.update({
      where: { id: suggestionId },
      data: {
        approved: true,
        approved_at: new Date().toISOString(),
        resulting_version_id: newVersion.id,
      },
    });

    return Response.json({
      approved: true,
      suggestion_id: suggestionId,
      new_version_id: newVersion.id,
      version_number: newVersion.version_number,
    });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
