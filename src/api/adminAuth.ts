// Admin auth guard for system endpoints
// Checks x-admin-key header against ADMIN_KEY env var

export function verifyAdminKey(req: Request): { authorized: boolean; response?: Response } {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return {
      authorized: false,
      response: Response.json({ error: "ADMIN_KEY not configured on server" }, { status: 503 }),
    };
  }

  const provided = req.headers.get("x-admin-key");
  if (!provided || provided !== adminKey) {
    return {
      authorized: false,
      response: Response.json({ error: "Unauthorized — invalid or missing x-admin-key" }, { status: 401 }),
    };
  }

  return { authorized: true };
}
