// Run only on the isolated validation Neon branch, never on production.

import { expect } from "bun:test";
import { randomUUID } from "node:crypto";
import { PATCH as patchCard } from "../src/app/api/board/[repoId]/route";
import { GET as getBoard } from "../src/app/api/board/route";
import { hashToken } from "../src/lib/api";
import { syncBoard } from "../src/lib/board";
import { pool } from "../src/lib/db";

if (
  !process.env.DATABASE_URL?.includes(
    process.env.VALIDATION_ENDPOINT ?? "must-use-validation-branch",
  )
)
  throw new Error("Validation branch required");
const run = randomUUID();
const a = `test-a-${run}`;
const b = `test-b-${run}`;
const tokenA = `fixture-a-${run}`;
const tokenB = `fixture-b-${run}`;
const readOnly = `fixture-read-${run}`;
const metadata = {
  name: "fixture",
  description: null,
  url: "https://github.com/demo/fixture",
  homepage: null,
  isPrivate: true,
  language: null,
  pushedAt: null,
};
for (const [id, email] of [
  [a, `a-${run}@example.invalid`],
  [b, `b-${run}@example.invalid`],
]) {
  await pool.query(
    'INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,$1,$2,false,now(),now())',
    [id, email],
  );
  await pool.query(
    'INSERT INTO account(id,"accountId","providerId","userId","accessToken","createdAt","updatedAt") VALUES($1,$1,\'github\',$2,\'fixture_token\',now(),now())',
    [`account-${id}`, id],
  );
  await pool.query(
    "INSERT INTO board_cards(user_id,repo_id,full_name,metadata,status,reason) VALUES($1,'123','demo/fixture',$2,'backlog','fixture')",
    [id, JSON.stringify(metadata)],
  );
}
for (const [userId, token, scope] of [
  [a, tokenA, "write"],
  [b, tokenB, "write"],
  [a, readOnly, "read"],
])
  await pool.query(
    "INSERT INTO board_tokens(id,user_id,name,token_hash,scope) VALUES($1,$2,'fixture',$3,$4)",
    [randomUUID(), userId, hashToken(token), scope],
  );
const request = (token: string, body?: unknown) =>
  new Request("http://localhost:3004/api/board/123", {
    method: body ? "PATCH" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
const context = { params: Promise.resolve({ repoId: "123" }) };
const originalFetch = globalThis.fetch;
globalThis.fetch = Object.assign(
  async (input: Parameters<typeof fetch>[0]) => {
    const url = String(input);
    const repo = {
      id: 123,
      name: "fixture",
      full_name: "demo/fixture",
      owner: { login: "demo" },
      description: null,
      html_url: "https://github.com/demo/fixture",
      homepage: null,
      private: true,
      archived: false,
      fork: false,
      size: 100,
      default_branch: "main",
      language: null,
      pushed_at: null,
      updated_at: new Date().toISOString(),
      open_issues_count: 0,
    };
    return Response.json(url.includes("/user/repos") ? [repo] : repo);
  },
  { preconnect: originalFetch.preconnect },
);
try {
  expect(
    (await getBoard(new Request("http://localhost:3004/api/board"))).status,
  ).toBe(401);
  expect(
    (
      await patchCard(
        request(readOnly, { status: "verify", version: 0 }),
        context,
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await patchCard(
        request(tokenA, {
          status: "verify",
          notes: "private note A",
          version: 0,
        }),
        context,
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await patchCard(
        request(tokenA, { status: "formal", version: 0 }),
        context,
      )
    ).status,
  ).toBe(409);
  const other = await getBoard(request(tokenB));
  const data = await other.json();
  expect(data.cards[0].notes).toBe("");
  expect(data.cards[0].status).toBe("backlog");
  const synced = await syncBoard(a);
  expect(synced[0].notes).toBe("private note A");
  expect(synced[0].status).toBe("verify");
  expect(synced[0].version).toBe(1);
  const activity = await pool.query(
    "SELECT actor,notes_changed FROM board_activity WHERE user_id=$1",
    [a],
  );
  expect(activity.rows.length).toBe(1);
  expect(activity.rows[0].actor).toBe("agent");
  await pool.query(
    "UPDATE board_tokens SET revoked_at=now() WHERE token_hash=$1",
    [hashToken(tokenA)],
  );
  expect((await getBoard(request(tokenA))).status).toBe(401);
  console.log(
    "PASS: real PostgreSQL tenant isolation, token scopes/revocation, version conflicts, audit and sync preservation",
  );
} finally {
  globalThis.fetch = originalFetch;
  await pool.end();
}
