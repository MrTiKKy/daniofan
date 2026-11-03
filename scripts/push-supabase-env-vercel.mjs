/* Adaugă SUPABASE_URL + SUPABASE_SECRET_KEY în Vercel (production/preview/development).
   Rulează: npx vercel login && node --env-file=.env.local scripts/push-supabase-env-vercel.mjs
   Nu afișează valorile. */
import { spawnSync } from 'node:child_process';

const keys = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY'];
const envs = ['production', 'preview', 'development'];

for (const key of keys) {
  const value = process.env[key];
  if (!value) {
    console.error(`FAIL: ${key} lipsește din env`);
    process.exit(1);
  }
  for (const target of envs) {
    const r = spawnSync(
      'npx',
      ['--yes', 'vercel@latest', 'env', 'add', key, target, '--force'],
      {
        input: value + '\n',
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    if (r.status !== 0) {
      console.error(`FAIL ${key}@${target}:`, (r.stderr || r.stdout || '').trim().slice(0, 300));
      process.exit(1);
    }
    console.log(`OK ${key} → ${target}`);
  }
}
console.log('OK: env Vercel actualizat (fără a afișa valori)');
