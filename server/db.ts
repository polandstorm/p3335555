import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as neonDrizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const useNeon = process.env.USE_NEON === "true";

export const pool = useNeon
  ? new NeonPool({ connectionString: process.env.DATABASE_URL })
  : new Pool({ connectionString: process.env.DATABASE_URL });

export const db = useNeon
  ? neonDrizzle(pool as NeonPool, { schema })
  : drizzle(pool as Pool, { schema });

