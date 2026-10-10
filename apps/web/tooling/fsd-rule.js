import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const layers = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'];
const slicedLayers = new Set(['pages', 'widgets', 'features', 'entities']);

function locate(filename) {
  const relative = path.relative(root, filename);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  const [layer, slice, ...rest] = relative.split(path.sep);
  if (!layers.includes(layer)) return null;
  return { layer, slice, rest };
}

export const fsdRule = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      higher: 'FSD: импорт из вышестоящего слоя {{layer}} запрещён.',
      sibling: 'FSD: соседние слайсы одного слоя не импортируют друг друга.',
      publicApi:
        'FSD: импортируйте слайс через его public API, без внутренних путей.',
      alias: 'FSD: для импорта вне своего слайса используйте alias @/.',
    },
  },
  create(context) {
    const from = locate(context.filename);
    if (!from) return {};

    function check(node) {
      const source = node.source;
      if (!source || typeof source.value !== 'string') return;
      const specifier = source.value;
      if (!specifier.startsWith('@/') && !specifier.startsWith('.')) return;
      const target = specifier.startsWith('@/')
        ? path.resolve(root, specifier.slice(2))
        : path.resolve(path.dirname(context.filename), specifier);
      const to = locate(target);
      if (!to) return;

      let messageId;
      if (layers.indexOf(to.layer) < layers.indexOf(from.layer)) {
        messageId = 'higher';
      } else if (
        from.layer === to.layer &&
        slicedLayers.has(from.layer) &&
        from.slice !== to.slice
      ) {
        messageId = 'sibling';
      } else if (
        slicedLayers.has(to.layer) &&
        (from.layer !== to.layer || from.slice !== to.slice) &&
        (!to.slice ||
          (to.rest.length > 0 &&
            !(
              to.rest.length === 1 &&
              /^index(?:\.[cm]?[jt]sx?)?$/.test(to.rest[0])
            )))
      ) {
        messageId = 'publicApi';
      } else if (
        specifier.startsWith('.') &&
        (from.layer !== to.layer ||
          (slicedLayers.has(from.layer) && from.slice !== to.slice))
      ) {
        messageId = 'alias';
      }
      if (messageId)
        context.report({ node: source, messageId, data: { layer: to.layer } });
    }

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
      ImportExpression: check,
    };
  },
};
