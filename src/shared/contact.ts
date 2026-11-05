/** Contrato público do contato; validação e entrega continuam independentes no servidor. */
export const CONTACT_LIMITS = Object.freeze({ name: 80, email: 254, subject: 120, message: 4_000 });

export interface ContactMessage {
  readonly name: string;
  readonly email: string;
  readonly subject: string;
  readonly message: string;
  readonly website: string;
}

export interface ContactResponse {
  readonly delivered: boolean;
}
