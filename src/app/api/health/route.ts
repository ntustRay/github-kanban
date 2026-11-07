import { pool } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await pool.query("SELECT 1 FROM board_cards LIMIT 1");
    return Response.json({
      status: "ok",
      database: "ready",
      github: process.env.GITHUB_CLIENT_ID ? "configured" : "setup_required",
    });
  } catch {
    return Response.json(
      { status: "error", database: "unavailable" },
      { status: 503 },
    );
  }
}
