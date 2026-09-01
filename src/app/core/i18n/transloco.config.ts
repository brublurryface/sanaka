import { isDevMode } from '@angular/core';
import { TranslocoOptions } from '@jsverse/transloco';
import { TranslocoHttpLoader } from './transloco-loader';

export const translocoConfig: TranslocoOptions = {
  config: {
    availableLangs: ['pt-BR', 'en'],
    defaultLang: 'pt-BR',
    fallbackLang: 'pt-BR',
    reRenderOnLangChange: true,
    prodMode: !isDevMode(),
  },
  loader: TranslocoHttpLoader,
};
