export interface ContactSocialLink {
  readonly id: 'instagram' | 'linkedin' | 'x';
  readonly name: string;
  readonly presenceKey: string;
  readonly descriptionKey: string;
  readonly handle: string;
  readonly href: string;
}

export const CONTACT_SOCIAL_LINKS: readonly ContactSocialLink[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    presenceKey: 'contact.social.instagram.presence',
    descriptionKey: 'contact.social.instagram.description',
    handle: '@omsanaka',
    href: 'https://www.instagram.com/omsanaka/',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    presenceKey: 'contact.social.linkedin.presence',
    descriptionKey: 'contact.social.linkedin.description',
    handle: 'Bruna Lourenço da Silva',
    href: 'https://br.linkedin.com/in/brublurryface',
  },
];

// Suporte para o X: quando o perfil tiver uma presença ativa, basta completar
// os textos no i18n e incluir este objeto na coleção acima.
// {
//   id: 'x',
//   name: 'X',
//   presenceKey: 'contact.social.x.presence',
//   descriptionKey: 'contact.social.x.description',
//   handle: '@usuario',
//   href: 'https://x.com/usuario',
// }
