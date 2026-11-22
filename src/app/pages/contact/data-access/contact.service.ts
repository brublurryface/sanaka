import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, timeout } from 'rxjs';
import { assertFormFlag, InvalidFormResponse } from '../../../core/http/form-response';
import {
  CONTACT_RESPONSE_TIMEOUT_MS,
  ContactMessage,
  ContactResponse,
} from '../../../../shared/contact';
export type { ContactMessage } from '../../../../shared/contact';

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);

  send(message: ContactMessage): Observable<ContactResponse> {
    return this.http
      .post<unknown>('/api/contact', message)
      .pipe(timeout(CONTACT_RESPONSE_TIMEOUT_MS), map(readContactResponse));
  }
}

function readContactResponse(body: unknown): ContactResponse {
  assertFormFlag(body, 'delivered');
  if (!('reason' in body)) return { delivered: body.delivered };
  if (!body.delivered && body.reason === 'unconfirmed') {
    return { delivered: false, reason: 'unconfirmed' };
  }
  throw new InvalidFormResponse('Confirmação de entrega incompatível.');
}
