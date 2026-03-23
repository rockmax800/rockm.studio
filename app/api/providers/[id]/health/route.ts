import { createServices, errorResponse } from "@/api/serviceFactory";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { providerService } = createServices();
    const result = await providerService.healthCheck(params.id);
    return Response.json(result);
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
