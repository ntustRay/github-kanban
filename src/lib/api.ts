import { createHash } from "node:crypto";
import { auth } from "./auth";
import { pool } from "./db";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function fail(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error(
    "Request failed",
    error instanceof Error ? error.name : "unknown",
  );
  return Response.json(
    { error: "服務暫時無法完成請求，請稍後重試。" },
    { status: 500 },
  );
}
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function principal(
  request: Request,
  write = false,
  browserOnly = false,
) {
  const bearer = request.headers.get("authorization");
  if (bearer?.startsWith("Bearer ") && !browserOnly) {
    const { rows } = await pool.query<{ user_id: string; scope: string }>(
      `SELECT user_id, scope FROM board_tokens WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now()`,
      [hashToken(bearer.slice(7))],
    );
    const row = rows[0];
    if (!row) throw new HttpError(401, "Agent token 無效或已過期");
    if (write && row.scope !== "write")
      throw new HttpError(403, "此 token 只有讀取權限");
    return { userId: row.user_id, agent: true };
  }
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new HttpError(401, "請先使用 GitHub 登入");
  if (write && request.headers.get("origin") !== new URL(request.url).origin)
    throw new HttpError(403, "請從本站操作");
  return { userId: session.user.id, agent: false };
}
