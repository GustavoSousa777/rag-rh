import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

const globalRef = globalThis as unknown as { __sql?: ReturnType<typeof postgres> };

export function getSql() {
  if (!globalRef.__sql) {
    globalRef.__sql = postgres(getEnv().DATABASE_URL, { max: 5, idle_timeout: 20 });
  }
  return globalRef.__sql;
}

export function getDb() {
  return drizzle(getSql(), { schema });
}
