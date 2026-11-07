import { fail, principal } from "@/lib/api";
import { validId } from "@/lib/board";
import { accessibleRepo, documents, githubToken } from "@/lib/github";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ repoId: string }> },
) {
  try {
    const { userId } = await principal(request);
    const token = await githubToken(userId);
    const repo = await accessibleRepo(validId((await params).repoId), token);
    return Response.json(
      { documents: await documents(repo, token) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return fail(error);
  }
}
