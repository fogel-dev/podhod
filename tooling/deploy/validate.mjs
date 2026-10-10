import { readFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

// Checks release inputs only; never reads or prints secret file contents.
const root = fileURLToPath(new URL('../../', import.meta.url));
const filename = process.argv[2];
if (!filename)
  throw new Error('Pass the production env file outside checkout.');
const absolute = resolve(filename);
const fromRoot = relative(root, absolute);
if (
  !isAbsolute(fromRoot) &&
  fromRoot !== '..' &&
  !fromRoot.startsWith(`..${sep}`)
)
  throw new Error('Production env must be outside checkout.');
const env = parseEnv(await readFile(absolute, 'utf8'));
const domain = env.PODHOD_DOMAIN ?? '';
if (
  domain.length > 253 ||
  !domain.includes('.') ||
  !domain
    .split('.')
    .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)) ||
  /\.(invalid|localhost|test)$/i.test(domain) ||
  /(^|\.)example\.(com|net|org)$/i.test(domain) ||
  /^\d+(\.\d+){3}$/.test(domain)
)
  throw new Error(
    'PODHOD_DOMAIN must be a real DNS hostname, without scheme or port.',
  );
for (const name of [
  'PODHOD_API_IMAGE',
  'PODHOD_WEB_IMAGE',
  'PODHOD_PROXY_IMAGE',
  'PODHOD_DB_IMAGE',
]) {
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9._/:\-]*@sha256:[a-f0-9]{64}$/.test(env[name] ?? '')
  )
    throw new Error(`${name} must specify an immutable image digest.`);
}
for (const name of ['PODHOD_STATE_DIR', 'PODHOD_SECRETS_DIR']) {
  const value = env[name] ?? '';
  if (
    !/^\/[a-zA-Z0-9_/-]+$/.test(value) ||
    value.includes('//') ||
    value.endsWith('/') ||
    value === '/' ||
    value.startsWith('/opt/podhod')
  )
    throw new Error(
      `${name} must be an absolute Linux directory outside checkout.`,
    );
}
if (env.PODHOD_STATE_DIR === env.PODHOD_SECRETS_DIR)
  throw new Error('State and secrets must use different directories.');
console.log(
  'Release configuration inputs valid; server/TLS/backup still require live verification.',
);
