import { mkdir, writeFile, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = resolve(
  process.env.PODHOD_SECRETS_DIR ?? resolve(tmpdir(), 'podhod-dev-secrets'),
);
if (!relative(root, directory).startsWith('..'))
  throw new Error('Secrets must be outside the repository.');
await mkdir(directory, { recursive: true, mode: 0o700 });
const password = () => randomBytes(32).toString('hex');
const values = {
  db_admin_password: password(),
  db_api_password: password(),
  db_worker_password: password(),
  db_migration_password: password(),
  job_encryption_key: password(),
  auth_hmac_key: password(),
};
for (const [name, value] of Object.entries(values)) {
  try {
    await access(resolve(directory, name));
  } catch {
    await writeFile(resolve(directory, name), value, {
      flag: 'wx',
      mode: 0o600,
    });
  }
}
const { readFile } = await import('node:fs/promises');
for (const [name, login, pass] of [
  ['api_database_url', 'api_login', 'db_api_password'],
  ['worker_database_url', 'worker_login', 'db_worker_password'],
  ['migration_database_url', 'migration_login', 'db_migration_password'],
]) {
  const value = (await readFile(resolve(directory, pass), 'utf8')).trim();
  await writeFile(
    resolve(directory, name),
    `postgres://${login}:${encodeURIComponent(value)}@db:5432/podhod?sslmode=disable`,
    { mode: 0o600 },
  );
}
console.log(`Development secrets prepared outside repository: ${directory}`);
