/** Contrato público do cadastro. Segredos e IDs da Brevo pertencem somente ao servidor. */
export const NEWSLETTER_EMAIL_MAX_LENGTH = 254;

export interface NewsletterSignupRequest {
  readonly email: string;
  readonly consent: boolean;
  readonly website: string;
}

export interface NewsletterAvailability {
  readonly available: boolean;
}

export interface NewsletterSignupResponse {
  readonly accepted: boolean;
}
