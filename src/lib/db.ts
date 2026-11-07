import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 10000,
});
attachDatabasePool(pool);
