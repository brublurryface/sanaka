import { HttpHeaders, HttpRequest } from '@angular/common/http';
import { isPublicWordPressRead } from './wordpress-transfer-cache';

describe('WordPress transfer cache boundary', () => {
  it('accepts public editorial reads including pagination', () => {
    expect(
      isPublicWordPressRead(
        new HttpRequest('GET', 'https://cms.sanaka.com.br/wp-json/wp/v2/posts?page=2'),
      ),
    ).toBe(true);
    expect(
      isPublicWordPressRead(
        new HttpRequest('GET', 'https://cms.sanaka.com.br/wp-json/wp/v2/categories'),
      ),
    ).toBe(true);
  });

  it.each([
    'https://cms.sanaka.com.br/wp-json/sanaka/v1/obolos/nandini',
    'https://cms.sanaka.com.br/wp-json/wp/v2/users',
    'https://other.example/wp-json/wp/v2/posts',
    'https://cms.sanaka.com.br/wp-json/wp/v2/posts?context=edit',
    'https://cms.sanaka.com.br/wp-json/wp/v2/posts?status=draft',
    'https://cms.sanaka.com.br/wp-json/wp/v2/posts?password=private',
    '/api/newsletter',
  ])('excludes non-public content or mutable counters (%s)', (url) => {
    expect(isPublicWordPressRead(new HttpRequest('GET', url))).toBe(false);
  });

  it('excludes mutations and authenticated requests', () => {
    const url = 'https://cms.sanaka.com.br/wp-json/wp/v2/posts';
    expect(isPublicWordPressRead(new HttpRequest('POST', url, null))).toBe(false);
    for (const name of ['Authorization', 'Proxy-Authorization', 'Cookie']) {
      expect(
        isPublicWordPressRead(
          new HttpRequest('GET', url, { headers: new HttpHeaders({ [name]: 'test' }) }),
        ),
      ).toBe(false);
    }
    expect(isPublicWordPressRead(new HttpRequest('GET', url, { withCredentials: true }))).toBe(
      false,
    );
  });
});
