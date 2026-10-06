import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { TranslocoHttpLoader } from './transloco-loader';

describe('TranslocoHttpLoader', () => {
  it('should use a relative translation URL in the browser', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const loader = TestBed.inject(TranslocoHttpLoader);

    loader.getTranslation('pt-BR').subscribe();

    http.expectOne('/i18n/pt-BR.json').flush({ app: { title: 'Sanaka' } });
    http.verify();
  });
});
