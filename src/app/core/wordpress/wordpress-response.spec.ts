import {
  assertWordPressCategoryTree,
  parseWordPressCategories,
  parseWordPressEditorialCategories,
  parseWordPressPosts,
  parseWordPressTagContexts,
  parseWordPressTags,
  wordPressCountHeader,
  wordPressPostReference,
  WordPressContractError,
} from './wordpress-response';

const post = {
  id: 7,
  slug: 'samvit',
  date: '2026-11-01T12:00:00',
  title: { rendered: 'Saṃvit &amp; Śabala' },
  excerpt: { rendered: '<p>Resumo.</p>' },
  content: { rendered: '<p>Texto aprovado.</p>' },
  categories: [10],
  featured_media: 20,
};
const category = { id: 10, slug: 'estudos', name: 'Estudos', parent: 0 };

describe('WordPress response contracts', () => {
  it.each([null, undefined, {}, 'not an array', 7, false])(
    'rejects a non-array collection (%#) without inventing an empty archive',
    (body) => expect(() => parseWordPressPosts(body)).toThrow(WordPressContractError),
  );

  it.each([
    { id: '7' },
    { id: 0 },
    { id: -1 },
    { id: 1.5 },
    { id: Number.NaN },
    { id: Number.MAX_SAFE_INTEGER + 1 },
    { slug: null },
    { slug: 7 },
    { slug: '' },
    { slug: '  ' },
    { title: null },
    { title: 'Title' },
    { title: { rendered: 7 } },
    { excerpt: [] },
    { excerpt: { rendered: null } },
    { date: null },
    { date: 2026 },
    { date: 'not a date' },
    { categories: null },
    { categories: {} },
    { categories: ['10'] },
    { categories: [0] },
    { categories: [1.5] },
  ])('rejects a malformed required field (%#)', (patch) => {
    expect(() => parseWordPressPosts([{ ...post, ...patch }])).toThrow(WordPressContractError);
  });

  it.each([null, true, [], { ...post, slug: undefined }])(
    'rejects the whole page when one mandatory record is malformed (%#)',
    (invalid) => {
      expect(() => parseWordPressPosts([post, invalid])).toThrow(WordPressContractError);
    },
  );

  it('keeps valid identity and HTML unchanged and distinguishes a genuine empty collection', () => {
    expect(parseWordPressPosts([post], true)[0]).toMatchObject({
      id: 7,
      slug: 'samvit',
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      categories: [10],
    });
    expect(parseWordPressPosts([])).toEqual([]);
    expect(parseWordPressPosts([{ ...post, title: { rendered: '' } }])).toHaveLength(1);
  });

  it.each([undefined, null, {}, { rendered: 5 }])(
    'requires article content instead of fabricating a successful empty reader (%#)',
    (content) => {
      expect(() => parseWordPressPosts([{ ...post, content }], true)).toThrow(
        WordPressContractError,
      );
      expect(parseWordPressPosts([{ ...post, content }])).toHaveLength(1);
    },
  );

  it.each([
    [{ ...post }, { ...post, slug: 'another-slug' }],
    [{ ...post }, { ...post, id: 8 }],
  ])('rejects ambiguous identities (%#)', (posts) => {
    expect(() => parseWordPressPosts(posts)).toThrow(WordPressContractError);
  });

  it.each([null, '8', {}, [null], ['8'], [0]])(
    'discards malformed optional tags and character metadata without losing the article (%#)',
    (tags) => {
      const parsed = parseWordPressPosts(
        [{ ...post, tags, sanaka_character_slug: {}, sanaka_character_name: 42 }],
        true,
      )[0];
      expect(parsed.content).toEqual(post.content);
      expect(parsed.tags).toBeUndefined();
      expect(parsed.sanaka_character_slug).toBeUndefined();
      expect(parsed.sanaka_character_name).toBeUndefined();
    },
  );

  it('retains valid optional fields without mutating the input', () => {
    const source = {
      ...post,
      tags: [3],
      sanaka_character_slug: 'samvit',
      sanaka_character_name: 'Saṃvit',
      sanaka_obolo_front: '/approved-front.png',
      sanaka_obolo_back: '/approved-back.png',
    };
    const before = JSON.stringify(source);
    expect(parseWordPressPosts([source], true)[0]).toMatchObject(source);
    expect(JSON.stringify(source)).toBe(before);
  });

  it.each([null, [], { 'wp:featuredmedia': {} }, { 'wp:featuredmedia': [null, {}] }])(
    'drops malformed optional embedded media without crashing (%#)',
    (_embedded) => {
      const parsed = parseWordPressPosts([{ ...post, _embedded }], true)[0];
      expect(parsed.content).toEqual(post.content);
      expect(parsed._embedded?.['wp:featuredmedia']).toEqual([]);
    },
  );

  it('keeps a valid cover and normalizes only malformed optional sizes and alt text', () => {
    const media = {
      id: 20,
      source_url: '/approved-original.webp',
      alt_text: 5,
      media_details: {
        sizes: {
          medium_large: { source_url: 42 },
          large: { source_url: '/approved-large.webp' },
        },
      },
    };
    const parsed = parseWordPressPosts([
      { ...post, _embedded: { 'wp:featuredmedia': [null, media] } },
    ])[0];
    expect(parsed._embedded?.['wp:featuredmedia'][0]).toMatchObject({
      id: 20,
      source_url: '/approved-original.webp',
      alt_text: '',
      media_details: { sizes: { large: { source_url: '/approved-large.webp' } } },
    });
    expect(
      parsed._embedded?.['wp:featuredmedia'][0].media_details?.sizes?.['medium_large'],
    ).toBeUndefined();
  });

  it.each([null, {}, [{ id: '10', slug: 'romance' }], [{ id: 10, slug: 42 }]])(
    'rejects an invalid editorial lookup before exclusions can be resolved (%#)',
    (body) => expect(() => parseWordPressEditorialCategories(body)).toThrow(WordPressContractError),
  );

  it('rejects duplicate editorial IDs and slugs', () => {
    expect(() =>
      parseWordPressEditorialCategories([category, { ...category, slug: 'romance' }]),
    ).toThrow(WordPressContractError);
    expect(() => parseWordPressEditorialCategories([category, { ...category, id: 11 }])).toThrow(
      WordPressContractError,
    );
  });

  it.each([{ parent: '0' }, { parent: -1 }, { parent: 0.5 }, { name: null }])(
    'rejects an unusable category hierarchy field (%#)',
    (patch) =>
      expect(() => parseWordPressCategories([{ ...category, ...patch }])).toThrow(
        WordPressContractError,
      ),
  );

  it('rejects self and indirect category cycles before taxonomy traversal', () => {
    expect(() => assertWordPressCategoryTree([{ ...category, parent: 10 }])).toThrow(
      WordPressContractError,
    );
    expect(() =>
      assertWordPressCategoryTree([
        { ...category, parent: 11 },
        { id: 11, slug: 'child', name: 'Child', parent: 10 },
      ]),
    ).toThrow(WordPressContractError);
    expect(() =>
      assertWordPressCategoryTree([
        category,
        { id: 11, slug: 'child', name: 'Child', parent: 10 },
        { id: 12, slug: 'partial', name: 'Partial', parent: 99 },
      ]),
    ).not.toThrow();
  });

  it('checks tags and contextual categories before they become filters or links', () => {
    expect(() => parseWordPressTags([{ id: 1, slug: 'tag', name: 7 }])).toThrow(
      WordPressContractError,
    );
    expect(() => parseWordPressTagContexts([{ categories: ['10'], tags: [1] }])).toThrow(
      WordPressContractError,
    );
    expect(parseWordPressTagContexts([{ categories: [10], tags: 'bad' }])).toEqual([
      { categories: [10], tags: undefined },
    ]);
    expect(() => wordPressPostReference({ slug: 'valid', title: {} })).toThrow(
      WordPressContractError,
    );
  });

  it.each([null, '', ' ', '-1', '-0', '1.5', '1.0', '1e2', '0x10', 'Infinity', '9007199254740992'])(
    'rejects a non-decimal or unsafe pagination header (%#)',
    (header) => expect(() => wordPressCountHeader(header)).toThrow(WordPressContractError),
  );

  it.each([
    ['0', 0],
    ['12', 12],
    [' 12 ', 12],
  ] as const)('accepts a safe count header %s', (header, count) =>
    expect(wordPressCountHeader(header)).toBe(count),
  );
});
