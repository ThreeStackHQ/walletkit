export * from "./schema";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(connectionString: string): ReturnType<typeof drizzle<typeof schema>> {
  if (!_db) {
    const pool = new Pool({ connectionString });
    _db = drizzle(pool, { schema });
  }
  return _db;
}
