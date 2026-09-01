import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguagePreferenceService, type SupportedLanguage } from './language-preference.service';

describe('LanguagePreferenceService', () => {
  let service: LanguagePreferenceService;
  let mockTranslocoService: {
    setActiveLang: ReturnType<typeof vi.fn>;
    getActiveLang: ReturnType<typeof vi.fn>;
  };
  let mockDocument: {
    defaultView: {
      localStorage: {
        getItem: (key: string) => string | null;
        setItem: (key: string, value: string) => void;
      };
      navigator: {
        language: string;
        languages: string[];
      };
    } | null;
  };
  let mockLocalStorage: Map<string, string>;

  beforeEach(() => {
    mockLocalStorage = new Map();

    mockTranslocoService = {
      setActiveLang: vi.fn(),
      getActiveLang: vi.fn(() => 'pt-BR'),
    };

    const mockBrowserWindow = {
      localStorage: {
        getItem: (key: string) => mockLocalStorage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          mockLocalStorage.set(key, value);
        },
      },
      navigator: {
        language: 'pt-BR',
        languages: ['pt-BR'],
      },
    };

    mockDocument = {
      defaultView: mockBrowserWindow,
    };

    TestBed.configureTestingModule({
      providers: [
        LanguagePreferenceService,
        { provide: TranslocoService, useValue: mockTranslocoService },
        { provide: DOCUMENT, useValue: mockDocument },
      ],
    });

    service = TestBed.inject(LanguagePreferenceService);
  });

  describe('initialize()', () => {
    it('should use saved language when available', () => {
      mockLocalStorage.set('sanaka.language', 'en');

      service.initialize();

      expect(mockTranslocoService.setActiveLang).toHaveBeenCalledWith('en');
    });

    it('should use pt-BR when saved language is pt-BR', () => {
      mockLocalStorage.set('sanaka.language', 'pt-BR');

      service.initialize();

      expect(mockTranslocoService.setActiveLang).toHaveBeenCalledWith('pt-BR');
    });

    it('should detect pt-BR from browser when no saved language (pt-BR)', () => {
      if (mockDocument.defaultView) {
        mockDocument.defaultView.navigator.language = 'pt-BR';
        mockDocument.defaultView.navigator.languages = ['pt-BR'];
      }

      service.initialize();

      expect(mockTranslocoService.setActiveLang).toHaveBeenCalledWith('pt-BR');
    });

    it('should detect pt-BR from any pt-* browser language', () => {
      if (mockDocument.defaultView) {
        mockDocument.defaultView.navigator.language = 'pt-PT';
        mockDocument.defaultView.navigator.languages = ['pt-PT'];
      }

      service.initialize();

      expect(mockTranslocoService.setActiveLang).toHaveBeenCalledWith('pt-BR');
    });

    it('should detect en from non-Portuguese browser language', () => {
      if (mockDocument.defaultView) {
        mockDocument.defaultView.navigator.language = 'en-US';
        mockDocument.defaultView.navigator.languages = ['en-US'];
      }

      service.initialize();

      expect(mockTranslocoService.setActiveLang).toHaveBeenCalledWith('en');
    });

    it('should detect en from unsupported language like fr-FR', () => {
      if (mockDocument.defaultView) {
        mockDocument.defaultView.navigator.language = 'fr-FR';
        mockDocument.defaultView.navigator.languages = ['fr-FR'];
      }

      service.initialize();

      expect(mockTranslocoService.setActiveLang).toHaveBeenCalledWith('en');
    });

    it('should handle missing defaultView gracefully', () => {
      mockDocument.defaultView = null;

      service.initialize();

      expect(mockTranslocoService.setActiveLang).not.toHaveBeenCalled();
    });
  });

  describe('setLanguage()', () => {
    it('should change active language and save preference', () => {
      const language: SupportedLanguage = 'en';

      service.setLanguage(language);

      expect(mockTranslocoService.setActiveLang).toHaveBeenCalledWith('en');
      expect(mockLocalStorage.get('sanaka.language')).toBe('en');
    });

    it('should change active language to pt-BR and persist', () => {
      const language: SupportedLanguage = 'pt-BR';

      service.setLanguage(language);

      expect(mockTranslocoService.setActiveLang).toHaveBeenCalledWith('pt-BR');
      expect(mockLocalStorage.get('sanaka.language')).toBe('pt-BR');
    });

    it('should change language even if localStorage is unavailable', () => {
      if (mockDocument.defaultView) {
        mockDocument.defaultView.localStorage.setItem = vi.fn(() => {
          throw new Error('localStorage not available');
        });
      }

      const language: SupportedLanguage = 'en';

      service.setLanguage(language);

      expect(mockTranslocoService.setActiveLang).toHaveBeenCalledWith('en');
    });

    it('should handle missing defaultView when setting language', () => {
      mockDocument.defaultView = null;

      service.setLanguage('en');

      expect(mockTranslocoService.setActiveLang).toHaveBeenCalledWith('en');
    });
  });

  describe('isActiveLanguage()', () => {
    it('should return true when language matches active language', () => {
      mockTranslocoService.getActiveLang = vi.fn(() => 'pt-BR');

      const result = service.isActiveLanguage('pt-BR');

      expect(result).toBe(true);
    });

    it('should return false when language does not match active language', () => {
      mockTranslocoService.getActiveLang = vi.fn(() => 'pt-BR');

      const result = service.isActiveLanguage('en');

      expect(result).toBe(false);
    });

    it('should return true for en when active language is en', () => {
      mockTranslocoService.getActiveLang = vi.fn(() => 'en');

      const result = service.isActiveLanguage('en');

      expect(result).toBe(true);
    });
  });

  describe('browser language detection', () => {
    it('should prioritize languages array over language property', () => {
      if (mockDocument.defaultView) {
        mockDocument.defaultView.navigator.language = 'en-US';
        mockDocument.defaultView.navigator.languages = ['pt-BR', 'en-US'];
      }

      service.initialize();

      expect(mockTranslocoService.setActiveLang).toHaveBeenCalledWith('pt-BR');
    });

    it('should fallback to language property when languages array is empty', () => {
      if (mockDocument.defaultView) {
        mockDocument.defaultView.navigator.language = 'en-US';
        mockDocument.defaultView.navigator.languages = [];
      }

      service.initialize();

      expect(mockTranslocoService.setActiveLang).toHaveBeenCalledWith('en');
    });

    it('should handle case-insensitive language detection', () => {
      if (mockDocument.defaultView) {
        mockDocument.defaultView.navigator.language = 'PT-br';
        mockDocument.defaultView.navigator.languages = ['PT-br'];
      }

      service.initialize();

      expect(mockTranslocoService.setActiveLang).toHaveBeenCalledWith('pt-BR');
    });
  });

  describe('localStorage edge cases', () => {
    it('should ignore corrupted localStorage values', () => {
      mockLocalStorage.set('sanaka.language', 'es-ES');
      if (mockDocument.defaultView) {
        mockDocument.defaultView.navigator.language = 'en-US';
        mockDocument.defaultView.navigator.languages = ['en-US'];
      }

      service.initialize();

      expect(mockTranslocoService.setActiveLang).toHaveBeenCalledWith('en');
    });

    it('should handle localStorage.getItem throwing error on initialize', () => {
      if (mockDocument.defaultView) {
        mockDocument.defaultView.localStorage.getItem = vi.fn(() => {
          throw new Error('localStorage access denied');
        });
      }

      service.initialize();

      expect(mockTranslocoService.setActiveLang).toHaveBeenCalled();
    });
  });
});
