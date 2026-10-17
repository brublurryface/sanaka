import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';

import { NEWSLETTER_EMAIL_MAX_LENGTH } from '../../../../shared/newsletter';
import { NewsletterService } from './data-access/newsletter.service';

type NewsletterStatus =
  | 'checking'
  | 'unavailable'
  | 'idle'
  | 'submitting'
  | 'pending-confirmation'
  | 'rate-limited'
  | 'error';

@Component({
  selector: 'app-newsletter-signup',
  imports: [ReactiveFormsModule, TranslocoPipe],
  templateUrl: './newsletter-signup.html',
  styleUrl: './newsletter-signup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsletterSignup {
  private readonly newsletter = inject(NewsletterService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly emailMaxLength = NEWSLETTER_EMAIL_MAX_LENGTH;
  protected readonly status = signal<NewsletterStatus>('checking');
  protected readonly canSubmit = computed(() =>
    ['idle', 'rate-limited', 'error'].includes(this.status()),
  );

  // O consentimento começa desmarcado. Enviar o formulário de contato não cadastra ninguém aqui.
  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(this.emailMaxLength)]],
    consent: [false, Validators.requiredTrue],
    website: [''],
  });

  constructor() {
    // Espera o navegador: não grava a disponibilidade da Brevo no HTML pré-renderizado do site.
    afterNextRender(() => this.checkAvailability());
  }

  protected checkAvailability(): void {
    this.status.set('checking');
    this.newsletter
      .getAvailability()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ available }) => this.status.set(available ? 'idle' : 'unavailable'),
        error: () => this.status.set('unavailable'),
      });
  }

  protected subscribe(): void {
    // Também bloqueia chamadas repetidas por teclado, não apenas cliques no botão desabilitado.
    if (!this.canSubmit()) {
      return;
    }

    this.form.controls.email.setValue(this.form.controls.email.value.trim());
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.status.set('submitting');
    this.newsletter
      .subscribe(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ accepted }) => {
          this.status.set(accepted ? 'pending-confirmation' : 'error');
          if (accepted) {
            this.form.reset();
          }
        },
        error: (error: HttpErrorResponse) => {
          this.status.set(
            error.status === 429 ? 'rate-limited' : error.status === 503 ? 'unavailable' : 'error',
          );
        },
      });
  }
}
