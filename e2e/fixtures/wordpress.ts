// Public CMS-shaped fixtures. These are synthetic editorial records, not production exports.
export const categories = [
  { id: 90, slug: 'romance', name: 'Romance', parent: 0 },
  { id: 91, slug: 'sobre', name: 'Sobre', parent: 0 },
  { id: 92, slug: 'sanaka-loka', name: 'Sanaka-loka', parent: 0 },
  { id: 10, slug: 'estudos', name: 'Estudos', parent: 0 },
  { id: 11, slug: 'reflexoes', name: 'Reflexões', parent: 10 },
];

export const article = {
  id: 501,
  slug: 'browser-test-article',
  date: '2026-01-02T10:00:00',
  title: { rendered: 'Uma leitura de teste' },
  excerpt: { rendered: '<p>Resumo editorial de teste.</p>' },
  content: { rendered: '<p>Conteúdo editorial de teste, preservado depois da retentativa.</p>' },
  featured_media: 0,
  categories: [11],
  tags: [],
};

export const cycles = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'].map(
  (numeral, index) => ({
    id: 600 + index,
    slug: `browser-test-cycle-${index + 1}`,
    title: { rendered: `${numeral} — Fragmento de teste` },
    excerpt: { rendered: `<p>História do fragmento ${index + 1}.</p>` },
    hover_text: `Prévia do fragmento ${index + 1}.`,
  }),
);

export const books = [
  {
    id: 701,
    slug: 'browser-test-book',
    title: { rendered: 'Volume de teste' },
    sanakaverse_cover: {
      source_url: '/images/posts/temple/hamsa.svg',
      alt_text: 'Capa de teste',
    },
  },
];
