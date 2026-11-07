import { fail, principal } from "@/lib/api";
import { validId } from "@/lib/board";
import { pool } from "@/lib/db";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ repoId: string }> },
) {
  try {
    const { userId } = await principal(request);
    const { rows } = await pool.query(
      "SELECT actor,old_status,new_status,notes_changed,created_at FROM board_activity WHERE user_id=$1 AND repo_id=$2 ORDER BY created_at DESC LIMIT 30",
      [userId, validId((await params).repoId)],
    );
    return Response.json({ activity: rows });
  } catch (error) {
    return fail(error);
  }
}
