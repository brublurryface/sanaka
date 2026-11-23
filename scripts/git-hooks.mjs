import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { validCommitMessage, validatePush } from './git-policy.mjs';

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

function install() {
  const current = spawnSync('git', ['config', '--get', 'core.hooksPath'], { encoding: 'utf8' });
  if (current.error || ![0, 1].includes(current.status)) {
    throw new Error('Não foi possível consultar a configuração dos hooks.');
  }
  if (current.status === 0 && current.stdout.trim() !== '.githooks') {
    throw new Error('Já existem hooks configurados. Integre-os antes de alterar core.hooksPath.');
  }
  git('config', '--local', 'core.hooksPath', '.githooks');
  console.log('Hooks do Sanaka configurados neste clone.');
}

async function checkStaged() {
  const prettier = await import('prettier');
  const paths = git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z')
    .split('\0')
    .filter(Boolean);
  const failures = [];

  for (const path of paths) {
    const info = await prettier.getFileInfo(path, {
      ignorePath: ['.gitignore', '.prettierignore'],
    });
    if (info.ignored || !info.inferredParser) continue;

    // Lê o índice do Git, inclusive quando o arquivo tem alterações parcialmente preparadas.
    const source = git('show', `:${path}`);
    const config = await prettier.resolveConfig(path, { editorconfig: true });
    if (!(await prettier.check(source, { ...config, filepath: path }))) failures.push(path);
  }

  if (failures.length) {
    throw new Error(
      `Formatação incorreta no índice:\n${failures.join('\n')}\nFormate e adicione novamente.`,
    );
  }
}

function checkMessage() {
  if (!validCommitMessage(readFileSync(process.argv[3], 'utf8'))) {
    throw new Error('Use tipo(escopo): descrição ou tipo: descrição no commit.');
  }
}

function checkPush() {
  const input = readFileSync(0, 'utf8');
  const head = git('rev-parse', 'HEAD').trim();
  const dirty = Boolean(git('status', '--porcelain'));
  if (!validatePush(input, head, dirty)) return;

  const result = spawnSync('npm', ['run', 'check'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error || result.status !== 0) {
    throw new Error('Validação local falhou. Corrija a causa antes de enviar.');
  }
}

try {
  switch (process.argv[2]) {
    case 'install':
      install();
      break;
    case 'staged':
      await checkStaged();
      break;
    case 'message':
      checkMessage();
      break;
    case 'push':
      checkPush();
      break;
    default:
      throw new Error('Comando de hook desconhecido.');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
