import { readFile } from "node:fs/promises";
import { getMigrations } from "better-auth/db/migration";
import { auth } from "../src/lib/auth";
import { pool } from "../src/lib/db";

const { runMigrations } = await getMigrations(auth.options);
await runMigrations();
await pool.query(
  await readFile(
    new URL("../migrations/001-board.sql", import.meta.url),
    "utf8",
  ),
);
console.log("Auth and board schema ready");
await pool.end();
