import { z } from "zod";

export const statuses = [
  "legacy",
  "backlog",
  "in_progress",
  "verify",
  "formal",
  "archive",
] as const;
export type Status = (typeof statuses)[number];
export const labels: Record<Status, string> = {
  legacy: "Legacy",
  backlog: "Backlog",
  in_progress: "In progress",
  verify: "Verify",
  formal: "Formal",
  archive: "Archive",
};
export const descriptions: Record<Status, string> = {
  legacy: "舊專案，暫不維護",
  backlog: "待開始",
  in_progress: "開發中",
  verify: "待驗證",
  formal: "正式使用",
  archive: "封存",
};

export const githubRepoSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  full_name: z.string(),
  owner: z.object({ login: z.string() }),
  description: z.string().nullable(),
  html_url: z.string().url(),
  homepage: z.string().nullable().optional(),
  private: z.boolean(),
  archived: z.boolean(),
  fork: z.boolean(),
  size: z.number(),
  default_branch: z.string(),
  language: z.string().nullable(),
  pushed_at: z.string().nullable(),
  updated_at: z.string(),
  open_issues_count: z.number(),
});
export type Repository = z.infer<typeof githubRepoSchema>;
export type Card = {
  repoId: string;
  fullName: string;
  name: string;
  description: string | null;
  url: string;
  homepage: string | null;
  isPrivate: boolean;
  language: string | null;
  status: Status;
  notes: string;
  reason: string;
  source: "auto" | "manual";
  position: number;
  version: number;
  pushedAt: string | null;
  updatedAt: string;
};
export type Document = {
  name: string;
  path: string | null;
  content: string | null;
  error: string | null;
};
export const editSchema = z
  .object({
    status: z.enum(statuses).optional(),
    notes: z.string().max(20000).optional(),
    position: z.number().min(-1e12).max(1e12).optional(),
    version: z.number().int().min(0),
  })
  .strict()
  .refine(
    (v) =>
      v.status !== undefined ||
      v.notes !== undefined ||
      v.position !== undefined,
    "至少提供狀態、備註或排序位置",
  );

export function classify(
  repo: Repository,
  now = Date.now(),
): { status: Status; reason: string } {
  if (repo.archived)
    return { status: "archive", reason: "GitHub 已標記 archived" };
  if (repo.size === 0)
    return { status: "backlog", reason: "Repo 尚無程式內容" };
  if (repo.fork)
    return { status: "backlog", reason: "Fork repo，等待確認用途" };
  const age = repo.pushed_at
    ? (now - Date.parse(repo.pushed_at)) / 86400000
    : Infinity;
  if (age <= 30)
    return { status: "in_progress", reason: "最近 30 天有 push，先列開發中" };
  if (
    repo.homepage?.startsWith("https://") ||
    repo.homepage?.startsWith("http://")
  )
    return { status: "verify", reason: "有網站連結；仍需人工確認可正式使用" };
  return { status: "backlog", reason: "缺少可確認的進度訊號，待整理" };
}
