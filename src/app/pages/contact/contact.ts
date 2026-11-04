import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';

import { CONTACT_SOCIAL_LINKS } from './contact-social-links';
import { ContactService } from './data-access/contact.service';
import { CONTACT_LIMITS } from '../../../shared/contact';

type ContactStatus = 'idle' | 'sending' | 'success' | 'rate-limited' | 'error';

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
        next: ({ delivered }) => {
          if (!delivered) {
            this.status.set('error');
            return;
          }

          this.form.reset();
          this.status.set('success');
        },
        error: (error: HttpErrorResponse) => {
          this.status.set(error.status === 429 ? 'rate-limited' : 'error');
        },
      });
  }
}
