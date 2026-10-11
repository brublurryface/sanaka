/**
 * Sincroniza recortes didáticos com os arquivos realmente executados.
 * --check detecta qualquer divergência sem escrever arquivos.
 * Sem argumento, gera os arquivos; nunca edite *.generated.ts à mão.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';

const root = new URL('../', import.meta.url);
const studies = [
  {
    directory: 'obolos',
    symbol: 'OBOLO_SOURCES',
    source: 'obolo-inventory.ts',
    sections: ['read-index', 'nested-loops', 'set-search', 'map-count', 'edit-array', 'traversal'],
  },
  {
    directory: 'entregas',
    symbol: 'DELIVERY_SOURCES',
    source: 'delivery-queue.ts',
    sections: [
      'start-delivery',
      'confirm-delivery',
      'retry-delivery',
      'compare-structures',
      'enqueue',
    ],
  },
  {
    directory: 'jogo',
    symbol: 'GAME_SOURCES',
    source: 'kalika-game.ts',
    sections: ['classic-function', 'rule-contract', 'dominance-rule', 'composed-game'],
  },
  {
    directory: 'padaria',
    symbol: 'BAKERY_SOURCES',
    source: 'bakery-api.ts',
    sections: ['request-contract', 'create-order', 'idempotent-payment', 'bff-view'],
  },
];

let stale = false;
for (const study of studies) {
  const directory = `src/app/pages/matrix/studies/${study.directory}/`;
  const text = await readFile(new URL(directory + study.source, root), 'utf8');
  const snippets = study.sections.map((section, index) => {
    const start = `// @study-start ${section}`;
    const end = `// @study-end ${section}`;
    if (text.split(start).length !== 2 || text.split(end).length !== 2) {
      throw new Error(`Marcadores ausentes ou repetidos: ${study.source} / ${section}`);
    }
    const from = text.indexOf(start) + start.length;
    const to = text.indexOf(end);
    if (to <= from) {
      throw new Error(`Marcadores fora de ordem: ${study.source} / ${section}`);
    }
    return {
      index,
      fileName: study.source,
      titleKey: `matrix.studies.${study.directory}.sources.${section}.title`,
      descriptionKey: `matrix.studies.${study.directory}.sources.${section}.description`,
      text: text.slice(from, to).trim(),
    };
  });
  const generated = await format(
    `// Gerado por scripts/matrix-study-source.mjs. Fonte: ${study.source}.\n` +
      `import { StudySource } from '../shared/matrix-study-definition';\n` +
      `export const ${study.symbol}: readonly StudySource[] = ${JSON.stringify(snippets)};\n`,
    { parser: 'typescript', singleQuote: true, printWidth: 100 },
  );
  const destination = new URL(directory + study.directory + '-source.generated.ts', root);
  if (process.argv.includes('--check')) {
    const actual = await readFile(destination, 'utf8').catch(() => '');
    if (actual !== generated) {
      stale = true;
      console.error(`Recorte desatualizado: ${fileURLToPath(destination)}`);
    }
  } else {
    await writeFile(destination, generated);
    console.log(`Recortes sincronizados: ${study.directory}`);
  }
}
if (stale) {
  console.error('Execute npm run matrix:source:sync e confira o diff.');
  process.exitCode = 1;
} else if (process.argv.includes('--check')) {
  console.log('Código didático confere com os arquivos reais.');
}
