import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ContactMessage, ContactResponse } from '../../../../shared/contact';
export type { ContactMessage } from '../../../../shared/contact';

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);

  send(message: ContactMessage): Observable<ContactResponse> {
    return this.http.post<ContactResponse>('/api/contact', message);
  }
}
