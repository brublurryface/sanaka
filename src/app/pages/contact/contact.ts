import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TimeoutError } from 'rxjs';

import { CONTACT_SOCIAL_LINKS } from './contact-social-links';
import { ContactService } from './data-access/contact.service';
import { CONTACT_LIMITS } from '../../../shared/contact';

type ContactStatus = 'idle' | 'sending' | 'success' | 'rate-limited' | 'unconfirmed' | 'error';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, TranslocoPipe],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contact {
  private readonly contactService = inject(ContactService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly socialLinks = CONTACT_SOCIAL_LINKS;
  protected readonly status = signal<ContactStatus>('idle');
  protected readonly limits = CONTACT_LIMITS;

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(CONTACT_LIMITS.name)]],
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(CONTACT_LIMITS.email)],
    ],
    subject: ['', [Validators.maxLength(CONTACT_LIMITS.subject)]],
    message: ['', [Validators.required, Validators.maxLength(CONTACT_LIMITS.message)]],
    website: [''],
  });

  protected sendMessage(): void {
    if (this.form.invalid || this.status() === 'sending') {
      this.form.markAllAsTouched();
      return;
    }

    this.status.set('sending');
    this.contactService
      .send(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ delivered, reason }) => {
          if (!delivered) {
            this.status.set(reason === 'unconfirmed' ? 'unconfirmed' : 'error');
            return;
          }

          this.form.reset();
          this.status.set('success');
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 429) {
            this.status.set('rate-limited');
          } else if (
            error instanceof TimeoutError ||
            (error instanceof HttpErrorResponse &&
              (error.status === 0 || error.status === 504 || error.error?.reason === 'unconfirmed'))
          ) {
            this.status.set('unconfirmed');
          } else {
            this.status.set('error');
          }
        },
      });
  }
}
