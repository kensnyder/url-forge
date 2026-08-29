import { describe, expect, it } from 'bun:test';
import { buildUrl } from '../index';

describe('buildUrl', () => {
  it('should handle basic URL and object queryObject', () => {
    const result = buildUrl('/api/users', { name: 'alice', age: 30 });
    expect(result).toBe('/api/users?age=30&name=alice');
  });

  it('should overwrite existing query parameter when using object', () => {
    const result = buildUrl('/api/users?name=bob', { name: 'alice' });
    expect(result).toBe('/api/users?name=alice');
  });

  it('should ignore undefined values in object queryObject', () => {
    const result = buildUrl('/api/users?name=bob', { age: undefined });
    expect(result).toBe('/api/users?name=bob');
  });

  it('should support array values in object queryObject', () => {
    const result = buildUrl('/api/users', { tag: ['admin', 'active'] });
    expect(result).toBe('/api/users?tag=admin&tag=active');
  });

  it('should overwrite existing parameter with array values', () => {
    const result = buildUrl('/api/users?tag=guest', {
      tag: ['admin', 'active'],
    });
    expect(result).toBe('/api/users?tag=admin&tag=active');
  });

  it('should clear existing parameter given an empty array', () => {
    const result = buildUrl('/api/users?tag=guest', { tag: [] });
    expect(result).toBe('/api/users');
  });

  it('should handle URL instance as path', () => {
    const url = new URL('https://example.com/search');
    const result = buildUrl(url, { q: 'test' });
    expect(result).toBe('https://example.com/search?q=test');
  });

  it('should preserve hash fragments', () => {
    const result = buildUrl('/page#section', { page: 1 });
    expect(result).toBe('/page?page=1#section');
  });

  it('should preserve a hash containing additional hashes', () => {
    const result = buildUrl('/page#section#sub', { page: 1 });
    expect(result).toBe('/page?page=1#section#sub');
  });

  it('should preserve a question mark inside the query string', () => {
    const result = buildUrl('/search?a=1?b=2');
    expect(result).toBe('/search?a=1%3Fb%3D2');
  });

  it('should preserve existing query string and hash when appending entries', () => {
    const result = buildUrl('/search?page=1#top', [
      ['filter', 'new'],
      ['filter', 'popular'],
    ]);
    expect(result).toBe('/search?filter=new&filter=popular&page=1#top');
  });

  it('should handle URLSearchParams queryObject', () => {
    const params = new URLSearchParams([
      ['k', 'v1'],
      ['k', 'v2'],
    ]);
    const result = buildUrl('/path', params);
    expect(result).toBe('/path?k=v1&k=v2');
  });

  it('should allow undefined entries', () => {
    const url = buildUrl('/path', [['preview']]);
    expect(url).toBe('/path?preview=');
  });

  it('should coerce non-string entry names', () => {
    // @ts-expect-error entry names are typed as strings but coerced at runtime
    const url = buildUrl('/path', [[42, 'answer']]);
    expect(url).toBe('/path?42=answer');
  });

  it('should stringify boolean values', () => {
    const url = buildUrl('/path', { active: true, archived: false });
    expect(url).toBe('/path?active=true&archived=false');
  });

  it('should treat null values as empty strings', () => {
    const url = buildUrl('/path', { q: null });
    expect(url).toBe('/path?q=');
  });

  it('should ignore falsy query', () => {
    expect(buildUrl('/path', null)).toBe('/path');
    expect(buildUrl('/path', false)).toBe('/path');
    expect(buildUrl('/path')).toBe('/path');
  });

  it('should sort parameters regardless of input order', () => {
    const first = buildUrl('/path', { b: 2, a: 1, c: 3 });
    const second = buildUrl('/path', { c: 3, a: 1, b: 2 });
    expect(first).toBe('/path?a=1&b=2&c=3');
    expect(second).toBe(first);
  });

  it('should keep insertion order among values of the same name', () => {
    const url = buildUrl('/path', [
      ['z', '1'],
      ['a', '2'],
      ['z', '0'],
    ]);
    expect(url).toBe('/path?a=2&z=1&z=0');
  });

  it('should throw error for non-object queryObject', () => {
    expect(() => {
      // @ts-expect-error queryObject must be an object, entries, or params
      buildUrl('/path', 'invalid');
    }).toThrow(
      'Invalid queryObject. Expected object, array of entries, or URLSearchParams.'
    );
  });

  it('should throw error for a malformed entry', () => {
    expect(() => {
      // @ts-expect-error entries must have at least a name
      buildUrl('/path', [[]]);
    }).toThrow(
      'Invalid queryObject. Expected object, array of entries, or URLSearchParams.'
    );
  });
});
