/** O catálogo de fontes não deve inventar links antes de publicar os arquivos. */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { studyFiles, studySourceUrl } from './matrix-study-files';

describe('Matrix study source files', () => {
  it.each(['obolos', 'entregas', 'jogo', 'padaria'] as const)(
    'points only to existing files for %s',
    (id) => {
      const files = studyFiles(id);
      expect(files).toHaveLength(5);
      expect(files.every((file) => existsSync(join(process.cwd(), file.path)))).toBe(true);
    },
  );
  it('returns no URL for an unpublished ref and a concrete file URL after publication', () => {
    expect(studySourceUrl('src/example.ts', undefined)).toBeNull();
    expect(studySourceUrl('src/example.ts', 'main')).toBe(
      'https://github.com/brublurryface/sanaka/blob/main/src/example.ts',
    );
  });
});
