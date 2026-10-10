import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

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

  afterEach(() => httpTesting.verify());

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
});
