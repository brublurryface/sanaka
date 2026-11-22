import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { NewsletterService } from './newsletter.service';

describe('NewsletterService', () => {
  let service: NewsletterService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NewsletterService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads local availability without using the SSR transfer cache', () => {
    service.getAvailability().subscribe((result) => expect(result.available).toBe(true));

    const request = http.expectOne('/api/newsletter/status');
    expect(request.request.method).toBe('GET');
    expect(request.request.transferCache).toBe(false);
    request.flush({ available: true });
  });

  it.each([null, {}, [], { available: 'false' }])('rejects malformed availability (%j)', (body) => {
    const error = vi.fn();
    service.getAvailability().subscribe({ error });
    http.expectOne('/api/newsletter/status').flush(body);
    expect(error).toHaveBeenCalledOnce();
  });

  it.each([null, {}, [], { accepted: 'false' }])(
    'rejects an ambiguous signup receipt (%j)',
    (body) => {
      const error = vi.fn();
      service
        .subscribe({ email: 'reader@example.test', consent: true, website: '' })
        .subscribe({ error });
      http.expectOne('/api/newsletter').flush(body);
      expect(error).toHaveBeenCalledOnce();
      http.expectNone('/api/newsletter');
    },
  );

  it('sends only the public signup contract to Sanaka, not directly to Brevo', () => {
    const signup = { email: 'reader@example.com', consent: true, website: '' };
    service.subscribe(signup).subscribe((result) => expect(result.accepted).toBe(true));

    const request = http.expectOne('/api/newsletter');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(signup);
    expect(request.request.headers.has('api-key')).toBe(false);
    request.flush({ accepted: true }, { status: 202, statusText: 'Accepted' });
  });
});
