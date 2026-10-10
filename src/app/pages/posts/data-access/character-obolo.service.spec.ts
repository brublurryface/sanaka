import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { WORDPRESS_REST_URL } from '../../../core/wordpress/wordpress-api';
import { CharacterOboloService } from './character-obolo.service';

describe('CharacterOboloService', () => {
  let httpTesting: HttpTestingController;
  let service: CharacterOboloService;

  const restUrl = 'https://example.com/wp-json';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WORDPRESS_REST_URL, useValue: restUrl },
      ],
    });

    httpTesting = TestBed.inject(HttpTestingController);
    service = TestBed.inject(CharacterOboloService);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should read the counter associated with the character', () => {
    let total: number | undefined;

    service.getTotal('nandinī').subscribe((value) => {
      total = value;
    });

    const request = httpTesting.expectOne(`${restUrl}/sanaka/v1/obolos/nandin%C4%AB`);

    expect(request.request.method).toBe('GET');
    request.flush({ characterSlug: 'nandinī', total: 128 });
    expect(total).toBe(128);
  });

  it('should offer exactly one obolo without sending a client-defined increment', () => {
    let total: number | undefined;

    service.offer('nandini').subscribe((value) => {
      total = value;
    });

    const request = httpTesting.expectOne(`${restUrl}/sanaka/v1/obolos/nandini`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({ characterSlug: 'nandini', total: 129 });
    expect(total).toBe(129);
  });

  it('should reject a response that belongs to another character', () => {
    let error: unknown;

    service.getTotal('nandini').subscribe({
      error: (reason: unknown) => {
        error = reason;
      },
    });

    httpTesting
      .expectOne(`${restUrl}/sanaka/v1/obolos/nandini`)
      .flush({ characterSlug: 'maya', total: 10 });

    expect(error).toBeInstanceOf(Error);
  });
});
