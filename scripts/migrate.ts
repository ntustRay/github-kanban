import { readdir, readFile } from "node:fs/promises";
import { getMigrations } from "better-auth/db/migration";
import { auth } from "../src/lib/auth";
import { pool } from "../src/lib/db";

const { runMigrations } = await getMigrations(auth.options);
await runMigrations();
const directory = new URL("../migrations/", import.meta.url);
for (const file of (await readdir(directory))
  .filter((name) => name.endsWith(".sql"))
  .sort()) {
  await pool.query(await readFile(new URL(file, directory), "utf8"));
}
console.log("Auth and board schema ready");
await pool.end();
