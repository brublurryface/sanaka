export interface ContactSocialLink {
  readonly id: 'instagram' | 'linkedin' | 'github' | 'x';
  readonly name: string;
  readonly mark: string;
  readonly presenceKey: string;
  readonly descriptionKey: string;
  readonly handle: string;
  readonly href: string;
}

export const CONTACT_SOCIAL_LINKS: readonly ContactSocialLink[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    mark: '◎',
    presenceKey: 'contact.social.instagram.presence',
    descriptionKey: 'contact.social.instagram.description',
    handle: '@omsanaka',
    href: 'https://www.instagram.com/omsanaka/',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    mark: 'in',
    presenceKey: 'contact.social.linkedin.presence',
    descriptionKey: 'contact.social.linkedin.description',
    handle: 'Bruna Lourenço da Silva',
    href: 'https://br.linkedin.com/in/brublurryface',
  },
  {
    id: 'github',
    name: 'GitHub',
    mark: 'GH',
    presenceKey: 'contact.social.github.presence',
    descriptionKey: 'contact.social.github.description',
    handle: '@brublurryface',
    href: 'https://github.com/brublurryface',
  },
];

// Suporte para o X: quando o perfil tiver uma presença ativa, basta completar
// os textos no i18n e incluir este objeto na coleção acima.
// {
//   id: 'x',
//   name: 'X',
//   mark: 'X',
//   presenceKey: 'contact.social.x.presence',
//   descriptionKey: 'contact.social.x.description',
//   handle: '@usuario',
//   href: 'https://x.com/usuario',
// }
