import { readFile, writeFile, mkdir } from 'node:fs/promises';
import openapiTS, { astToString } from 'openapi-typescript';
import prettier from 'prettier';
import { fileURLToPath } from 'node:url';

const schema = new URL('../../docs/openapi.yaml', import.meta.url);
const output = new URL(
  '../../apps/web/src/shared/api/schema.d.ts',
  import.meta.url,
);
const ast = await openapiTS(schema);
const config = await prettier.resolveConfig(fileURLToPath(output));
const generated = await prettier.format(
  '// Generated from docs/openapi.yaml. Run npm run api:generate; do not edit.\n' +
    astToString(ast),
  { ...config, parser: 'typescript' },
);
if (process.argv.includes('--check')) {
  const current = await readFile(output, 'utf8').catch(() => '');
  if (current.replaceAll('\r\n', '\n') !== generated) {
    throw new Error('API types are stale. Run npm run api:generate.');
  }
} else {
  await mkdir(new URL('../../apps/web/src/shared/api/', import.meta.url), {
    recursive: true,
  });
  await writeFile(output, generated);
}
