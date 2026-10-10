import test from 'node:test';
import assert from 'node:assert/strict';
import { compareContracts } from './compatibility.mjs';
import { readFile } from 'node:fs/promises';
import YAML from 'yaml';

function contract() {
  return {
    openapi: '3.0.3',
    info: { title: 'Contract test', version: '1' },
    paths: {
      '/records': {
        post: {
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { name: { type: 'string', maxLength: 120 } },
                  required: ['name'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'ok',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { id: { type: 'string' } },
                    required: ['id'],
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

test('compatible additive operation passes', async () => {
  const before = contract(),
    after = contract();
  after.paths['/other'] = structuredClone(after.paths['/records']);
  assert.equal((await compareContracts(before, after)).compatible, true);
});
test('removed operation fails', async () => {
  const before = contract(),
    after = contract();
  delete after.paths['/records'];
  assert.equal((await compareContracts(before, after)).compatible, false);
});
test('new required request field fails', async () => {
  const before = contract(),
    after = contract();
  const schema =
    after.paths['/records'].post.requestBody.content['application/json'].schema;
  schema.properties.token = { type: 'string' };
  schema.required.push('token');
  assert.equal((await compareContracts(before, after)).compatible, false);
});
test('removing response guarantee fails', async () => {
  const before = contract(),
    after = contract();
  delete after.paths['/records'].post.responses['200'].content[
    'application/json'
  ].schema.required;
  assert.equal((await compareContracts(before, after)).compatible, false);
});
test('narrowing request constraint fails', async () => {
  const before = contract(),
    after = contract();
  after.paths['/records'].post.requestBody.content[
    'application/json'
  ].schema.properties.name.maxLength = 10;
  assert.equal((await compareContracts(before, after)).compatible, false);
});

test('adding authentication to public operation fails', async () => {
  const before = contract(),
    after = contract();
  after.components = {
    securitySchemes: {
      session: { type: 'apiKey', in: 'cookie', name: 'session' },
    },
  };
  after.paths['/records'].post.security = [{ session: [] }];
  assert.equal((await compareContracts(before, after)).compatible, false);
});

test('project contract can be compared including command unions', async () => {
  const schema = YAML.parse(
    await readFile(new URL('../../docs/openapi.yaml', import.meta.url), 'utf8'),
  );
  assert.equal(
    (await compareContracts(schema, structuredClone(schema))).compatible,
    true,
  );
});
