/**
 * Sincroniza recortes didáticos com os arquivos realmente executados.
 * --check detecta qualquer divergência sem escrever arquivos.
 * Sem argumento, gera os arquivos; nunca edite *.generated.ts à mão.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';
import ts from 'typescript';

/** A análise acontece na geração: nenhum compilador/editor é enviado ao navegador. */
function syntaxTokens(text) {
  const source = ts.createSourceFile('study.ts', text, ts.ScriptTarget.Latest, true);
  const tokens = [];
  const trivia = ts.createScanner(ts.ScriptTarget.Latest, false);
  let cursor = 0;

  // Agrupa trechos contíguos da mesma cor e conserva até os espaços/comentários originais.
  function append(start, end, className = '') {
    if (start === end) return;
    const previous = tokens.at(-1);
    if (previous?.end === start && previous.className === className) previous.end = end;
    else tokens.push({ start, end, className });
  }

  function appendTrivia(start, end) {
    trivia.setText(text, start, end - start);
    for (let kind = trivia.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = trivia.scan()) {
      const comment =
        kind === ts.SyntaxKind.SingleLineCommentTrivia ||
        kind === ts.SyntaxKind.MultiLineCommentTrivia;
      append(trivia.getTokenPos(), trivia.getTextPos(), comment ? 'token-comment' : '');
    }
  }

  function className(token) {
    const kind = token.kind;
    if (
      kind === ts.SyntaxKind.StringLiteral ||
      kind === ts.SyntaxKind.RegularExpressionLiteral ||
      (kind >= ts.SyntaxKind.FirstTemplateToken && kind <= ts.SyntaxKind.LastTemplateToken)
    )
      return 'token-string';
    if (
      kind === ts.SyntaxKind.TrueKeyword ||
      kind === ts.SyntaxKind.FalseKeyword ||
      kind === ts.SyntaxKind.NullKeyword ||
      kind === ts.SyntaxKind.UndefinedKeyword
    )
      return 'token-boolean';
    if (kind === ts.SyntaxKind.NumericLiteral) return 'token-constant';
    if (
      kind === ts.SyntaxKind.StringKeyword ||
      kind === ts.SyntaxKind.NumberKeyword ||
      kind === ts.SyntaxKind.BooleanKeyword ||
      kind === ts.SyntaxKind.VoidKeyword ||
      kind === ts.SyntaxKind.UnknownKeyword ||
      kind === ts.SyntaxKind.NeverKeyword ||
      kind === ts.SyntaxKind.AnyKeyword
    )
      return 'token-type';
    if (kind >= ts.SyntaxKind.FirstKeyword && kind <= ts.SyntaxKind.LastKeyword)
      return 'token-keyword';
    if (ts.isIdentifier(token)) {
      const name = token.getText(source);
      if (/^[A-Z][A-Z_\d]+$/.test(name)) return 'token-constant';
      if (/^[A-Z]/.test(name)) return 'token-type';
      if (/^\s*\(/.test(text.slice(token.end))) return 'token-call';
    }
    return '';
  }

  function visit(node) {
    // O comentário inteiro será tratado como trivia, incluindo tags de documentação.
    if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode)
      return;
    const children = node.getChildren(source);
    if (children.length) {
      children.forEach(visit);
    } else if (node.kind <= ts.SyntaxKind.LastToken && node.end > node.getStart(source)) {
      const start = node.getStart(source);
      appendTrivia(cursor, start);
      append(start, node.end, className(node));
      cursor = node.end;
    }
  }

  visit(source);
  appendTrivia(cursor, text.length);
  return tokens;
}

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
    const snippet = text.slice(from, to).trim();
    return {
      index,
      fileName: study.source,
      titleKey: `matrix.studies.${study.directory}.sources.${section}.title`,
      descriptionKey: `matrix.studies.${study.directory}.sources.${section}.description`,
      text: snippet,
      tokens: syntaxTokens(snippet),
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
