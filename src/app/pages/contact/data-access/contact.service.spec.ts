import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TimeoutError } from 'rxjs';
import { CONTACT_RESPONSE_TIMEOUT_MS } from '../../../../shared/contact';

import { ContactMessage, ContactService } from './contact.service';

describe('ContactService', () => {
  let service: ContactService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ContactService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ContactService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    try {
      httpTesting.verify();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should send the contact message to the server endpoint', () => {
    const message: ContactMessage = {
      name: 'Bruna',
      email: 'bruna@example.com',
      subject: 'Sanaka',
      message: 'Uma mensagem.',
      website: '',
    };

    service.send(message).subscribe((response) => expect(response.delivered).toBe(true));

    const request = httpTesting.expectOne('/api/contact');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(message);
    request.flush({ delivered: true });
  });

  it.each([
    null,
    {},
    [],
    { delivered: 'false' },
    { delivered: true, reason: 'unconfirmed' },
    { delivered: false, reason: 'other' },
  ])('rejects an incompatible success response without repeating the POST (%j)', (body) => {
    const error = vi.fn();
    service
      .send({
        name: 'Reader',
        email: 'reader@example.test',
        subject: '',
        message: 'Test',
        website: '',
      })
      .subscribe({ error });
    httpTesting.expectOne('/api/contact').flush(body);
    expect(error).toHaveBeenCalledOnce();
    httpTesting.expectNone('/api/contact');
  });

  it.each([{ delivered: false }, { delivered: false, reason: 'unconfirmed' }])(
    'preserves an explicit negative reply (%j)',
    (body) => {
      const next = vi.fn();
      service
        .send({
          name: 'Reader',
          email: 'reader@example.test',
          subject: '',
          message: 'Test',
          website: '',
        })
        .subscribe(next);
      httpTesting.expectOne('/api/contact').flush(body);
      expect(next).toHaveBeenCalledExactlyOnceWith(body);
    },
  );

  it('cancels an unanswered request at the response deadline without retrying the POST', () => {
    vi.useFakeTimers();
    const error = vi.fn();
    service
      .send({
        name: 'Reader',
        email: 'reader@example.test',
        subject: '',
        message: 'Test',
        website: '',
      })
      .subscribe({ error });
    const request = httpTesting.expectOne('/api/contact');
    vi.advanceTimersByTime(CONTACT_RESPONSE_TIMEOUT_MS - 1);
    expect(error).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(error).toHaveBeenCalledExactlyOnceWith(expect.any(TimeoutError));
    expect(request.cancelled).toBe(true);
    vi.advanceTimersByTime(CONTACT_RESPONSE_TIMEOUT_MS);
    httpTesting.expectNone('/api/contact');
    expect(error).toHaveBeenCalledOnce();
  });

  it('clears the response deadline after a confirmed reply', () => {
    vi.useFakeTimers();
    const next = vi.fn();
    const error = vi.fn();
    service
      .send({
        name: 'Reader',
        email: 'reader@example.test',
        subject: '',
        message: 'Test',
        website: '',
      })
      .subscribe({ next, error });
    httpTesting.expectOne('/api/contact').flush({ delivered: true });
    vi.advanceTimersByTime(CONTACT_RESPONSE_TIMEOUT_MS + 1);
    expect(next).toHaveBeenCalledExactlyOnceWith({ delivered: true });
    expect(error).not.toHaveBeenCalled();
    httpTesting.expectNone('/api/contact');
  });

  it('passes an unconfirmed server failure through without resending', () => {
    const error = vi.fn();
    service
      .send({
        name: 'Reader',
        email: 'reader@example.test',
        subject: '',
        message: 'Test',
        website: '',
      })
      .subscribe({ error });
    httpTesting
      .expectOne('/api/contact')
      .flush(
        { delivered: false, reason: 'unconfirmed' },
        { status: 504, statusText: 'Gateway Timeout' },
      );
    expect(error).toHaveBeenCalledOnce();
    expect(error.mock.calls[0][0].status).toBe(504);
    httpTesting.expectNone('/api/contact');
  });
});
