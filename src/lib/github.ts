import { z } from "zod";
import { HttpError } from "./api";
import { auth } from "./auth";
import { pool } from "./db";
import { type Document, githubRepoSchema, type Repository } from "./model";

export async function githubToken(userId: string) {
  const { rows } = await pool.query<{ id: string }>(
    'SELECT id FROM account WHERE "userId"=$1 AND "providerId"=\'github\'',
    [userId],
  );
  if (!rows[0]) throw new HttpError(401, "請重新使用 GitHub 登入");
  const token = await auth.api.getAccessToken({
    body: { accountId: rows[0].id, userId },
  });
  if (!token.accessToken)
    throw new HttpError(401, "GitHub 授權已失效，請重新登入");
  return token.accessToken;
}

// Deliberately GET-only. No code path can mutate GitHub repositories.
export async function githubGet(path: string, token: string): Promise<unknown> {
  if (!path.startsWith("/") || path.startsWith("//"))
    throw new HttpError(400, "無效的 GitHub 路徑");
  const response = await fetch(`https://api.github.com${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const status = response.status;
    if (status === 401)
      throw new HttpError(401, "GitHub 授權已失效，請重新登入");
    if (status === 403 || status === 429)
      throw new HttpError(
        429,
        "GitHub 暫時限制請求，請稍後再同步，或檢查 App 的 repo 存取權限",
      );
    if (status === 404)
      throw new HttpError(404, "找不到 repo 或尚未授權 GitHub App 讀取");
    throw new HttpError(502, "GitHub 暫時無法回應");
  }
  return response.json();
}

export async function listRepositories(token: string): Promise<Repository[]> {
  const repos = new Map<number, Repository>();
  // Public and private repositories visible to this GitHub App user token, all pages.
  for (let page = 1; ; page++) {
    const batch = z
      .array(githubRepoSchema)
      .parse(
        await githubGet(
          `/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
          token,
        ),
      );
    for (const repo of batch) repos.set(repo.id, repo);
    if (batch.length < 100) break;
  }
  return [...repos.values()];
}

export async function accessibleRepo(repoId: string, token: string) {
  const repo = githubRepoSchema.parse(
    await githubGet(`/repositories/${encodeURIComponent(repoId)}`, token),
  );
  return repo;
}

const entrySchema = z.object({
  name: z.string(),
  path: z.string(),
  type: z.string(),
  size: z.number().optional(),
});
export async function documents(
  repo: Repository,
  token: string,
): Promise<Document[]> {
  const base = `/repos/${repo.full_name.split("/").map(encodeURIComponent).join("/")}/contents`;
  let entries: z.infer<typeof entrySchema>[];
  try {
    entries = z.array(entrySchema).parse(await githubGet(base, token));
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 404) throw error;
    return ["TODO.md", "README.md", "AGENTS.md"].map((name) => ({
      name,
      path: null,
      content: null,
      error: "Repo 是空的或無法讀取",
    }));
  }
  // Root first; then the conventional docs and .github folders, case insensitive.
  const nested = await Promise.all(
    ["docs", ".github"].map(async (directory) => {
      const folder = entries.find(
        (e) => e.type === "dir" && e.name.toLowerCase() === directory,
      );
      if (!folder) return [];
      try {
        return z
          .array(entrySchema)
          .parse(
            await githubGet(
              `${base}/${encodeURIComponent(folder.path)}`,
              token,
            ),
          );
      } catch {
        return [];
      }
    }),
  );
  const all = [...entries, ...nested.flat()];
  return Promise.all(
    ["TODO.md", "README.md", "AGENTS.md"].map(async (name) => {
      const file = all.find(
        (e) => e.type === "file" && e.name.toLowerCase() === name.toLowerCase(),
      );
      if (!file)
        return { name, path: null, content: null, error: "找不到此文件" };
      if ((file.size ?? 0) > 200000)
        return {
          name,
          path: file.path,
          content: null,
          error: "文件超過 200 KB，請至 GitHub 閱讀",
        };
      try {
        const value = z
          .object({ content: z.string(), encoding: z.literal("base64") })
          .parse(
            await githubGet(
              `${base}/${file.path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(repo.default_branch)}`,
              token,
            ),
          );
        return {
          name,
          path: file.path,
          content: Buffer.from(value.content, "base64").toString("utf8"),
          error: null,
        };
      } catch {
        return {
          name,
          path: file.path,
          content: null,
          error: "文件讀取失敗，請重試",
        };
      }
    }),
  );
}
