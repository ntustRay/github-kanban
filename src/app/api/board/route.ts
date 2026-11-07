import { fail, principal } from "@/lib/api";
import { readBoard, syncBoard } from "@/lib/board";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const { userId } = await principal(request);
    return Response.json(
      { cards: await readBoard(userId) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return fail(error);
  }
}
export async function POST(request: Request) {
  try {
    const { userId } = await principal(request, true);
    return Response.json({ cards: await syncBoard(userId) });
  } catch (error) {
    return fail(error);
  }
}
