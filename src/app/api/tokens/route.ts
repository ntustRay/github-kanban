import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { fail, HttpError, hashToken, principal } from "@/lib/api";
import { pool } from "@/lib/db";
export async function GET(request: Request) {
  try {
    const { userId } = await principal(request, false, true);
    const { rows } = await pool.query(
      "SELECT id,name,scope,created_at,expires_at FROM board_tokens WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC",
      [userId],
    );
    return Response.json({ tokens: rows });
  } catch (error) {
    return fail(error);
  }
}
export async function POST(request: Request) {
  try {
    const { userId } = await principal(request, true, true);
    const parsed = z
      .object({
        name: z.string().trim().min(1).max(80),
        scope: z.enum(["read", "write"]),
      })
      .strict()
      .safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, "請輸入名稱與讀取／修改權限");
    const { rows } = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM board_tokens WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>now()",
      [userId],
    );
    if (Number(rows[0].count) >= 10)
      throw new HttpError(400, "最多建立 10 組有效 token");
    const token = `gkb_${randomBytes(32).toString("hex")}`;
    await pool.query(
      "INSERT INTO board_tokens(id,user_id,name,scope,token_hash) VALUES($1,$2,$3,$4,$5)",
      [
        randomUUID(),
        userId,
        parsed.data.name,
        parsed.data.scope,
        hashToken(token),
      ],
    );
    return Response.json(
      { token },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return fail(error);
  }
}
export async function DELETE(request: Request) {
  try {
    const { userId } = await principal(request, true, true);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new HttpError(400, "缺少 token ID");
    await pool.query(
      "UPDATE board_tokens SET revoked_at=now() WHERE user_id=$1 AND id=$2",
      [userId, id],
    );
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
