import { z } from "zod";
import { HttpError } from "./api";
import { pool } from "./db";
import { accessibleRepo, githubToken, listRepositories } from "./github";
import { type Card, classify, type Status } from "./model";

type Row = {
  repo_id: string;
  full_name: string;
  metadata: {
    name: string;
    description: string | null;
    url: string;
    homepage: string | null;
    isPrivate: boolean;
    language: string | null;
    pushedAt: string | null;
  };
  status: Status;
  notes: string;
  reason: string;
  source: "auto" | "manual";
  position: number;
  version: number;
  updated_at: Date;
};
export function toCard(row: Row): Card {
  return {
    repoId: row.repo_id,
    fullName: row.full_name,
    ...row.metadata,
    status: row.status,
    notes: row.notes,
    reason: row.reason,
    source: row.source,
    position: row.position,
    version: row.version,
    updatedAt: row.updated_at.toISOString(),
  };
}
export async function readBoard(userId: string) {
  const result = await pool.query<Row>(
    "SELECT repo_id,full_name,metadata,status,notes,reason,source,position,version,updated_at FROM board_cards WHERE user_id=$1 AND visible=true ORDER BY position,full_name",
    [userId],
  );
  return result.rows.map(toCard);
}

export async function syncBoard(userId: string) {
  const lock = await pool.query(
    `INSERT INTO board_sync(user_id,started_at) VALUES($1,now())
    ON CONFLICT(user_id) DO UPDATE SET started_at=now()
    WHERE board_sync.started_at<now()-interval '60 seconds' RETURNING user_id`,
    [userId],
  );
  if (!lock.rowCount) throw new HttpError(429, "請等候 60 秒再同步");
  const repos = await listRepositories(await githubToken(userId));
  const presets = await pool.query<{
    repo_id: string;
    status: Status;
    reason: string;
  }>(
    `SELECT p.repo_id,p.status,p.reason FROM board_presets p JOIN account a ON a."accountId"=p.github_id AND a."providerId"='github' WHERE a."userId"=$1`,
    [userId],
  );
  const suggested = new Map(presets.rows.map((p) => [p.repo_id, p]));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE board_cards SET visible=false WHERE user_id=$1",
      [userId],
    );
    for (const [position, repo] of repos.entries()) {
      const { status, reason } =
        suggested.get(String(repo.id)) ?? classify(repo);
      const metadata = {
        name: repo.name,
        description: repo.description,
        url: repo.html_url,
        homepage: repo.homepage ?? null,
        isPrivate: repo.private,
        language: repo.language,
        pushedAt: repo.pushed_at,
      };
      await client.query(
        `INSERT INTO board_cards(user_id,repo_id,full_name,metadata,status,reason,position)
        VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(user_id,repo_id) DO UPDATE
        SET full_name=excluded.full_name,metadata=excluded.metadata,visible=true`,
        [
          userId,
          String(repo.id),
          repo.full_name,
          JSON.stringify(metadata),
          status,
          reason,
          position,
        ],
      );
    }
    await client.query(
      "UPDATE board_sync SET completed_at=now() WHERE user_id=$1",
      [userId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return readBoard(userId);
}

export async function updateCard(
  userId: string,
  repoId: string,
  edit: { version: number; status?: Status; notes?: string },
  agent: boolean,
) {
  // Re-check live GitHub access, even for a valid agent token.
  await accessibleRepo(repoId, await githubToken(userId));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<Row>(
      "SELECT repo_id,full_name,metadata,status,notes,reason,source,position,version,updated_at FROM board_cards WHERE user_id=$1 AND repo_id=$2 AND visible=true FOR UPDATE",
      [userId, repoId],
    );
    const row = current.rows[0];
    if (!row) throw new HttpError(404, "找不到卡片，請先同步");
    if (row.version !== edit.version)
      throw new HttpError(
        409,
        "其他視窗或 Agent 已更新此卡片，請重新載入後再儲存",
      );
    const status = edit.status ?? row.status;
    const notes = edit.notes ?? row.notes;
    const result = await client.query<Row>(
      `UPDATE board_cards SET status=$3,notes=$4,source='manual',reason='手動設定',version=version+1,updated_at=now() WHERE user_id=$1 AND repo_id=$2 RETURNING repo_id,full_name,metadata,status,notes,reason,source,position,version,updated_at`,
      [userId, repoId, status, notes],
    );
    await client.query(
      "INSERT INTO board_activity(user_id,repo_id,actor,old_status,new_status,notes_changed) VALUES($1,$2,$3,$4,$5,$6)",
      [
        userId,
        repoId,
        agent ? "agent" : "human",
        row.status,
        status,
        notes !== row.notes,
      ],
    );
    await client.query("COMMIT");
    return toCard(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export function validId(id: string) {
  if (!z.string().regex(/^\d+$/).safeParse(id).success)
    throw new HttpError(400, "無效的 repo ID");
  return id;
}
