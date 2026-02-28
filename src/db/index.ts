// src/db/index.ts
import "dotenv/config";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg"; // Import Pool

import * as schema from "./schema";

// Check if DATABASE_URL is defined
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Add SSL configuration if needed for production environments
  // ssl: {
  //   rejectUnauthorized: false, // Example for environments like Heroku, adjust as needed
  // },
});

export const db = drizzle(pool, {
  // Use the pool
  schema,
  // logger: true // Enable logger for debugging queries if needed
});
