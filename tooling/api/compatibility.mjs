import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import OpenApiDiff from 'openapi-diff';
import YAML from 'yaml';

export async function compareContracts(source, destination) {
  if (isDeepStrictEqual(source, destination)) {
    return {
      compatible: true,
      breaking: [],
      unclassified: [],
      policyChanges: [],
    };
  }
  // Avoid expanding unchanged nested unions in the set-theory engine.
  const resolve = (value, document, ancestors = new Set()) => {
    if (Array.isArray(value))
      return value.map((item) => resolve(item, document, ancestors));
    if (!value || typeof value !== 'object') return value;
    if (value.$ref?.startsWith('#/')) {
      if (ancestors.has(value.$ref)) return value;
      const target = value.$ref
        .slice(2)
        .split('/')
        .reduce((node, key) => node?.[key], document);
      return resolve(target, document, new Set([...ancestors, value.$ref]));
    }
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key]) =>
            ![
              'description',
              'summary',
              'example',
              'examples',
              'externalDocs',
            ].includes(key),
        )
        .map(([key, item]) => [key, resolve(item, document, ancestors)]),
    );
  };
  const oldPaths = {},
    newPaths = {};
  for (const [path, item] of Object.entries(source.paths ?? {})) {
    for (const [method, operation] of Object.entries(item)) {
      if (
        ![
          'get',
          'post',
          'put',
          'patch',
          'delete',
          'head',
          'options',
          'trace',
        ].includes(method)
      )
        continue;
      const nextItem = destination.paths?.[path];
      const next = nextItem?.[method];
      if (
        isDeepStrictEqual(
          resolve([operation, item.parameters], source),
          resolve([next, nextItem?.parameters], destination),
        )
      )
        continue;
      oldPaths[path] ??= {};
      oldPaths[path][method] = operation;
      if (next) {
        newPaths[path] ??= {};
        newPaths[path][method] = next;
      }
      if (item.parameters) oldPaths[path].parameters = item.parameters;
      if (next && nextItem.parameters)
        newPaths[path].parameters = nextItem.parameters;
    }
  }
  const result = Object.keys(oldPaths).length
    ? await OpenApiDiff.diffSpecs({
        sourceSpec: {
          content: JSON.stringify({ ...source, paths: oldPaths }),
          location: 'base.json',
          format: 'openapi3',
        },
        destinationSpec: {
          content: JSON.stringify({ ...destination, paths: newPaths }),
          location: 'current.json',
          format: 'openapi3',
        },
      })
    : { breakingDifferencesFound: false };
  // Security/discriminators/extensions are not classified by the upstream engine.
  // Fail closed on unclassified changes; description-only edits remain allowed.
  const unclassified = result.unclassifiedDiffs ?? [];
  const policyChanges = [];
  if (!isDeepStrictEqual(source.security, destination.security))
    policyChanges.push('Root security changed');
  if (
    !isDeepStrictEqual(
      source.components?.securitySchemes,
      destination.components?.securitySchemes,
    )
  ) {
    policyChanges.push('Security schemes changed');
  }
  for (const [path, item] of Object.entries(source.paths ?? {})) {
    for (const [method, operation] of Object.entries(item)) {
      if (
        ![
          'get',
          'post',
          'put',
          'patch',
          'delete',
          'head',
          'options',
          'trace',
        ].includes(method)
      )
        continue;
      const next = destination.paths?.[path]?.[method];
      if (next && !isDeepStrictEqual(operation.security, next.security)) {
        policyChanges.push(`Security changed: ${method} ${path}`);
      }
    }
  }
  for (const [name, schema] of Object.entries(
    source.components?.schemas ?? {},
  )) {
    const next = destination.components?.schemas?.[name];
    if (next && !isDeepStrictEqual(schema.discriminator, next.discriminator)) {
      policyChanges.push(`Discriminator changed: ${name}`);
    }
  }
  return {
    compatible:
      !result.breakingDifferencesFound &&
      unclassified.length === 0 &&
      policyChanges.length === 0,
    breaking: result.breakingDifferences ?? [],
    unclassified,
    policyChanges,
  };
}

export function approvedReset(previous, current, approval) {
  const hash = (value) => createHash('sha256').update(value).digest('hex');
  return (
    approval.issue === 'EGO-21' &&
    approval.reason ===
      'Password registration replaces unreleased email authentication; ADR-003' &&
    approval.before === hash(previous) &&
    approval.after === hash(current)
  );
}

async function main() {
  const base = process.argv[2] ?? 'HEAD';
  if (!/^[a-zA-Z0-9_./-]+$/.test(base) || base.startsWith('-')) {
    throw new Error('Invalid git base ref');
  }
  execFileSync('git', ['rev-parse', '--verify', `${base}^{commit}`], {
    stdio: 'pipe',
  });
  const files = execFileSync(
    'git',
    ['ls-tree', '--name-only', base, 'docs/openapi.yaml'],
    { encoding: 'utf8' },
  );
  if (!files.trim()) {
    console.log('Initial contract: base commit has no OpenAPI schema.');
    return;
  }
  const previous = execFileSync('git', ['show', `${base}:docs/openapi.yaml`], {
    encoding: 'utf8',
  });
  const current = await readFile(
    new URL('../../docs/openapi.yaml', import.meta.url),
    'utf8',
  );
  const approval = JSON.parse(
    await readFile(
      new URL('./prerelease-auth-reset.json', import.meta.url),
      'utf8',
    ),
  );
  if (approvedReset(previous, current, approval)) {
    console.log(
      'Approved one-time prerelease auth contract reset: EGO-21 / ADR-003. Exact contract hashes match.',
    );
    return;
  }
  const result = await compareContracts(
    YAML.parse(previous),
    YAML.parse(current),
  );
  if (!result.compatible) {
    console.error(JSON.stringify(result, null, 2));
    throw new Error(
      'API compatibility check failed. Keep v1 compatible; add a new API version for breaking changes.',
    );
  }
  console.log(`API contract is compatible with ${base}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main();
