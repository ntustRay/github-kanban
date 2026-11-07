import { fail, HttpError, principal } from "@/lib/api";
import { updateCard, validId } from "@/lib/board";
import { editSchema } from "@/lib/model";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ repoId: string }> },
) {
  try {
    const actor = await principal(request, true);
    if (Number(request.headers.get("content-length") ?? 0) > 100000)
      throw new HttpError(413, "內容過大");
    const parsed = editSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new HttpError(
        400,
        "請提供有效的 status、notes、position 與 version",
      );
    return Response.json({
      card: await updateCard(
        actor.userId,
        validId((await params).repoId),
        parsed.data,
        actor.agent,
      ),
    });
  } catch (error) {
    return fail(error);
  }
}
