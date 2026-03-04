// src/db/index.ts
import "dotenv/config";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

const databaseUrl = process.env.DATABASE_URL;

try {
  const parsedDbUrl = new URL(databaseUrl);
  if (/^\d+\.\d+\.\d+\.\d+$/.test(parsedDbUrl.hostname)) {
    console.warn(
      "[DB] DATABASE_URL esta usando IP direto. Em ambiente Docker/Coolify prefira nome de servico (ex: postgres:5432).",
    );
  }
} catch (error) {
  console.warn("[DB] DATABASE_URL invalida.", error);
}

const pool = new Pool({
  connectionString: databaseUrl,
});

pool.on("error", (error) => {
  console.error("[DB] Erro inesperado no pool PostgreSQL:", error);
});

export const db = drizzle(pool, {
  schema,
});
