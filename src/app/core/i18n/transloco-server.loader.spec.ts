import { TestBed } from '@angular/core/testing';
import { join } from 'node:path';
import { vi } from 'vitest';

import {
  resolveServerTranslationsDirectory,
  SERVER_TRANSLATIONS_DIRECTORY,
  TranslocoServerLoader,
} from './transloco-server.loader';

describe('resolveServerTranslationsDirectory', () => {
  it('should prefer translations copied beside the production server bundle', () => {
    const directoryExists = vi.fn((path: string) => path === '/app/browser/i18n');

    expect(resolveServerTranslationsDirectory('/app/server', '/workspace', directoryExists)).toBe(
      '/app/browser/i18n',
    );
  });

  it('should use public translations while Angular prerenders from a temporary bundle', () => {
    expect(resolveServerTranslationsDirectory('/tmp/prerender', '/workspace', () => false)).toBe(
      '/workspace/public/i18n',
    );
  });
});

describe('TranslocoServerLoader', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TranslocoServerLoader,
        {
          provide: SERVER_TRANSLATIONS_DIRECTORY,
          useValue: join(process.cwd(), 'public/i18n'),
        },
      ],
    });
  });

  it('should read a supported language from the translation artifact', async () => {
    const translation = await TestBed.inject(TranslocoServerLoader).getTranslation('pt-BR');

    expect(translation['app']).toMatchObject({ title: 'Sanaka' });
  });

  it('should reject unsupported languages before accessing the file system', async () => {
    await expect(
      TestBed.inject(TranslocoServerLoader).getTranslation('../private'),
    ).rejects.toThrow('Idioma não suportado no SSR: ../private');
  });
});
