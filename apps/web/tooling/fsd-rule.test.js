import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { Linter } from 'eslint';
import { fsdRule } from './fsd-rule.js';

const src = fileURLToPath(new URL('../src/', import.meta.url));
const linter = new Linter();

const cases = [
  ['app/app.js', "import '@/features/workout'", null],
  ['features/workout/ui/view.js', "import '@/entities/exercise'", null],
  ['features/workout/ui/view.js', "import '../model/state.js'", null],
  ['shared/lib/theme.js', "import '@/shared/assets/icon.svg'", null],
  ['entities/exercise/model.js', "import '@/features/workout'", 'higher'],
  ['features/workout/ui/view.js', "import '@/features/program'", 'sibling'],
  [
    'pages/today/ui/view.js',
    "import '@/entities/exercise/model/state'",
    'publicApi',
  ],
  [
    'pages/today/ui/view.js',
    "export * from '@/entities/exercise/model/state'",
    'publicApi',
  ],
  [
    'pages/today/ui/view.js',
    "import('@/entities/exercise/model/state')",
    'publicApi',
  ],
  ['pages/today/ui/view.js', "import '@/entities'", 'publicApi'],
  ['app/app.js', "import '../shared/lib/theme.js'", 'alias'],
];

for (const [filename, code, expected] of cases) {
  test(`${filename}: ${code}`, () => {
    const messages = linter.verify(
      code,
      {
        plugins: { architecture: { rules: { fsd: fsdRule } } },
        rules: { 'architecture/fsd': 'error' },
      },
      { filename: path.join(src, filename) },
    );
    assert.deepEqual(
      messages.map((message) => message.messageId),
      expected ? [expected] : [],
    );
  });
}
