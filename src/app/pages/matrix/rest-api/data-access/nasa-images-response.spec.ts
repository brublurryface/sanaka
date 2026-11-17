import { NasaContractError, parseNasaImagesResponse } from './nasa-images-response';

const preview = 'https://images-assets.nasa.gov/image/approved/approved~thumb.jpg';
const data = { nasa_id: 'approved', title: 'A nebulosa', media_type: 'image' };
const item = { data: [data], links: [{ rel: 'preview', render: 'image', href: preview }] };

describe('NASA search response contract', () => {
  it.each([
    null,
    undefined,
    [],
    'not JSON',
    {},
    { collection: null },
    { collection: [] },
    { collection: { items: null } },
    { collection: { items: {} } },
    { collection: { items: 'bad' } },
    { collection: {} },
  ])('rejects a malformed required collection (%#)', (body) => {
    expect(() => parseNasaImagesResponse(body)).toThrow(NasaContractError);
  });

  it.each(['1', null, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rejects an invalid supplied total (%#)',
    (total_hits) =>
      expect(() =>
        parseNasaImagesResponse({
          collection: { items: [item], metadata: { total_hits } },
        }),
      ).toThrow(NasaContractError),
  );

  it.each([[], 42, 'bad'])('rejects a malformed metadata container (%#)', (metadata) =>
    expect(() => parseNasaImagesResponse({ collection: { items: [], metadata } })).toThrow(
      NasaContractError,
    ),
  );

  it('rejects totals inconsistent with the returned collection', () => {
    expect(() =>
      parseNasaImagesResponse({
        collection: { items: [item], metadata: { total_hits: 0 } },
      }),
    ).toThrow(NasaContractError);
  });

  it.each([undefined, null, {}])(
    'keeps the existing fallback for absent optional metadata (%#)',
    (metadata) => {
      const parsed = parseNasaImagesResponse({ collection: { items: [item], metadata } });
      expect(parsed.total).toBe(0);
      expect(parsed.image).toMatchObject({
        id: 'approved',
        title: 'A nebulosa',
        credit: 'NASA',
        date: null,
        center: null,
        imageUrl: preview,
        sourceUrl: preview,
      });
    },
  );

  it.each([
    null,
    5,
    [],
    {},
    { ...item, data: {} },
    { ...item, links: {} },
    { ...item, data: [null] },
    { ...item, data: [{ ...data, nasa_id: 5 }] },
    { ...item, data: [{ ...data, title: {} }] },
    { ...item, data: [{ ...data, media_type: 'video' }] },
    { ...item, links: [null, { rel: 'preview', render: 'image', href: 42 }] },
  ])('skips an unusable image candidate while retaining a valid later item (%#)', (invalid) => {
    const parsed = parseNasaImagesResponse({ collection: { items: [invalid, item] } });
    expect(parsed.image?.id).toBe('approved');
    expect(parsed.image?.imageUrl).toBe(preview);
  });

  it('normalizes malformed optional credits and dates without replacing approved image URLs', () => {
    const parsed = parseNasaImagesResponse({
      collection: {
        items: [
          {
            ...item,
            data: [
              {
                ...data,
                photographer: 42,
                secondary_creator: ' NASA / ESA ',
                date_created: [],
                center: {},
              },
            ],
          },
        ],
      },
    });
    expect(parsed.image).toMatchObject({
      credit: 'NASA / ESA',
      date: null,
      center: null,
      imageUrl: preview,
    });
  });

  it.each([
    'http://example.test/image.png',
    'javascript:alert(1)',
    'bad URL',
    '',
    'data:image/png,x',
  ])('does not fabricate a valid HTTPS preview from %s', (href) => {
    const parsed = parseNasaImagesResponse({
      collection: {
        items: [
          {
            ...item,
            links: [{ rel: 'preview', render: 'image', href }],
          },
        ],
      },
    });
    expect(parsed.image).toBeNull();
  });

  it('uses a valid later preview when an optional link is unusable', () => {
    expect(
      parseNasaImagesResponse({
        collection: {
          items: [
            {
              ...item,
              links: [null, { rel: 'preview', render: 'image', href: 'bad' }, ...item.links],
            },
          ],
        },
      }).image?.imageUrl,
    ).toBe(preview);
  });

  it('keeps empty collections and unmatched curated IDs distinct from malformed JSON', () => {
    expect(
      parseNasaImagesResponse({ collection: { items: [], metadata: { total_hits: 0 } } }),
    ).toEqual({ image: null, total: 0 });
    expect(
      parseNasaImagesResponse({ collection: { items: [item] } }, 'another-id').image,
    ).toBeNull();
  });
});
