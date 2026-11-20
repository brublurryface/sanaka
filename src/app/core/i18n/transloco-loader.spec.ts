import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { TranslocoHttpLoader } from './transloco-loader';

describe('TranslocoHttpLoader', () => {
  it('revalidates translations at the existing relative URL', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const loader = TestBed.inject(TranslocoHttpLoader);

    loader.getTranslation('pt-BR').subscribe();

    const request = http.expectOne('/i18n/pt-BR.json');
    expect(request.request.cache).toBe('no-cache');
    request.flush({ app: { title: 'Sanaka' } });
    http.verify();
  });
});
