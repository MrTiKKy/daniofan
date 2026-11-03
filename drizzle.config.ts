import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.local' });

/** Schema push / migrări pe Supabase (transaction pooler din .env.local). */
const url = process.env.SUPABASE_DATABASE_URL;
if (!url) {
  throw new Error('SUPABASE_DATABASE_URL lipsește pentru drizzle-kit');
}

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
});
