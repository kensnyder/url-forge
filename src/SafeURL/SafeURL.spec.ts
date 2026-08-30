import { describe, expect, it } from 'bun:test';
import SafeURL from './SafeURL';

describe('SafeURL', () => {
  describe('absolute urls', () => {
    it('should behave like URL', () => {
      const url = new SafeURL('https://user:pw@example.com:8080/a/b?x=1#h');
      expect(url.protocol).toBe('https:');
      expect(url.username).toBe('user');
      expect(url.password).toBe('pw');
      expect(url.host).toBe('example.com:8080');
      expect(url.hostname).toBe('example.com');
      expect(url.port).toBe('8080');
      expect(url.origin).toBe('https://example.com:8080');
      expect(url.pathname).toBe('/a/b');
      expect(url.search).toBe('?x=1');
      expect(url.hash).toBe('#h');
      expect(url.href).toBe('https://user:pw@example.com:8080/a/b?x=1#h');
    });
    it('should resolve against a base', () => {
      const url = new SafeURL('c', 'https://example.com/a/b');
      expect(url.href).toBe('https://example.com/a/c');
    });
    it('should accept a URL as the base', () => {
      const url = new SafeURL('c', new URL('https://example.com/a/b'));
      expect(url.href).toBe('https://example.com/a/c');
    });
    it('should accept a SafeURL as the base', () => {
      const url = new SafeURL('c', new SafeURL('/a/b'));
      expect(url.href).toBe('/a/c');
    });
    it('should keep opaque schemes intact', () => {
      const url = new SafeURL('mailto:me@example.com');
      expect(url.protocol).toBe('mailto:');
      expect(url.hostname).toBe('');
      expect(url.pathname).toBe('me@example.com');
      expect(url.href).toBe('mailto:me@example.com');
    });
  });

  describe('leading slashes', () => {
    it('should treat // as a domain', () => {
      const url = new SafeURL('//localhost');
      expect(url.hostname).toBe('localhost');
      expect(url.href).toBe(new URL('http://localhost').href);
    });
    it('should treat // with a path as a domain', () => {
      const url = new SafeURL('//localhost/a/b');
      expect(url.hostname).toBe('localhost');
      expect(url.pathname).toBe('/a/b');
      expect(url.href).toBe('http://localhost/a/b');
    });
    it('should treat / as an absolute path', () => {
      const url = new SafeURL('/localhost');
      expect(url.hostname).toBe('');
      expect(url.pathname).toBe('/localhost');
      expect(url.href).toBe('/localhost');
    });
    it('should treat a bare word as a relative path', () => {
      const url = new SafeURL('localhost');
      expect(url.hostname).toBe('');
      expect(url.pathname).toBe('localhost');
      expect(url.href).toBe('localhost');
    });
    it('should keep a relative path relative through segments', () => {
      expect(new SafeURL('a/b/c').pathname).toBe('a/b/c');
      expect(new SafeURL('./a/b').pathname).toBe('a/b');
      expect(new SafeURL('a/../b').pathname).toBe('b');
    });
    it('should protocol-relative resolve against a base with a scheme', () => {
      const url = new SafeURL('//other.com/a', 'https://example.com/b');
      expect(url.href).toBe('https://other.com/a');
    });
  });

  describe('domain-less urls', () => {
    it('should report every origin field as empty', () => {
      const url = new SafeURL('/a/b?x=1#h');
      expect(url.protocol).toBe('');
      expect(url.username).toBe('');
      expect(url.password).toBe('');
      expect(url.host).toBe('');
      expect(url.hostname).toBe('');
      expect(url.port).toBe('');
      expect(url.origin).toBe('');
    });
    it('should never leak the sentinel origin', () => {
      const url = new SafeURL('a/b?x=1#h');
      expect(url.href).toBe('a/b?x=1#h');
      expect(url.toString()).toBe('a/b?x=1#h');
      expect(url.toJSON()).toBe('a/b?x=1#h');
      expect(JSON.stringify({ url })).toBe('{"url":"a/b?x=1#h"}');
    });
    it('should handle an empty string', () => {
      const url = new SafeURL('');
      expect(url.pathname).toBe('');
      expect(url.href).toBe('');
    });
    it('should handle a query-only reference', () => {
      const url = new SafeURL('?x=1');
      expect(url.pathname).toBe('');
      expect(url.search).toBe('?x=1');
      expect(url.href).toBe('?x=1');
    });
    it('should handle a hash-only reference', () => {
      const url = new SafeURL('#h');
      expect(url.pathname).toBe('');
      expect(url.hash).toBe('#h');
      expect(url.href).toBe('#h');
    });
    it('should handle a root path', () => {
      expect(new SafeURL('/').pathname).toBe('/');
      expect(new SafeURL('/').href).toBe('/');
    });
  });

  describe('relative bases', () => {
    it('should resolve a relative reference against a relative base', () => {
      const url = new SafeURL('c', 'a/b');
      expect(url.href).toBe('a/c');
    });
    it('should resolve a relative reference against a rooted base', () => {
      const url = new SafeURL('c', '/a/b');
      expect(url.href).toBe('/a/c');
    });
    it('should let a rooted reference override a relative base', () => {
      const url = new SafeURL('/c', 'a/b');
      expect(url.href).toBe('/c');
    });
    it('should inherit a domain from a protocol-relative base', () => {
      const url = new SafeURL('c', '//example.com/a/b');
      expect(url.hostname).toBe('example.com');
      expect(url.href).toBe('http://example.com/a/c');
    });
    it('should ignore an empty base', () => {
      expect(new SafeURL('a/b', '').href).toBe('a/b');
    });
  });

  describe('accepting relative references', () => {
    const inputs = [
      '',
      ' ',
      '//',
      '///',
      '//?x=1',
      '//#h',
      'http://',
      'https://',
      'ws://',
      'http://[',
      'http://x:999999',
      '1scheme:path',
      '\\\\example.com',
      '%',
      '/%',
      'a'.repeat(70000),
    ];
    for (const input of inputs) {
      const label = input.length > 30 ? `<${input.length} chars>` : input;
      it(`should parse ${JSON.stringify(label)} without throwing`, () => {
        expect(() => new SafeURL(input)).not.toThrow();
        expect(() => new SafeURL('a', input)).not.toThrow();
        expect(() => new SafeURL(input, 'https://example.com')).not.toThrow();
        expect(typeof new SafeURL(input).href).toBe('string');
      });
    }
    it('should keep a degenerate authority out of the hostname', () => {
      const url = new SafeURL('//');
      expect(url.hostname).toBe('');
      expect(url.href).toBe('//');
    });
    it('should salvage a scheme with no host', () => {
      const url = new SafeURL('http://');
      expect(url.hostname).toBe('');
      expect(url.href).toBe('http://');
    });
    it('should salvage a scheme with no host but a query', () => {
      const url = new SafeURL('http://?x=1');
      expect(url.pathname).toBe('http://');
      expect(url.search).toBe('?x=1');
    });
    it('should accept anything stringifiable', () => {
      expect(new SafeURL({ toString: () => '/a/b' }).href).toBe('/a/b');
      expect(new SafeURL(new URL('https://example.com/a')).href).toBe(
        'https://example.com/a'
      );
    });
  });

  describe('setters', () => {
    it('should add a domain when hostname is set', () => {
      const url = new SafeURL('/a/b');
      url.hostname = 'example.com';
      expect(url.hostname).toBe('example.com');
      expect(url.href).toBe('http://example.com/a/b');
    });
    it('should add a domain when host is set', () => {
      const url = new SafeURL('/a/b');
      url.host = 'example.com:8080';
      expect(url.port).toBe('8080');
      expect(url.href).toBe('http://example.com:8080/a/b');
    });
    it('should drop the domain when hostname is set to empty', () => {
      const url = new SafeURL('https://example.com/a/b?x=1');
      url.hostname = '';
      expect(url.hostname).toBe('');
      expect(url.origin).toBe('');
      expect(url.href).toBe('/a/b?x=1');
    });
    it('should keep a rooted path rooted when pathname is set', () => {
      const url = new SafeURL('a/b');
      url.pathname = '/c/d';
      expect(url.pathname).toBe('/c/d');
      expect(url.href).toBe('/c/d');
    });
    it('should keep a relative path relative when pathname is set', () => {
      const url = new SafeURL('/a/b');
      url.pathname = 'c/d';
      expect(url.pathname).toBe('c/d');
      expect(url.href).toBe('c/d');
    });
    it('should re-parse when href is set', () => {
      const url = new SafeURL('https://example.com/a');
      url.href = 'c/d?x=1';
      expect(url.hostname).toBe('');
      expect(url.pathname).toBe('c/d');
      expect(url.href).toBe('c/d?x=1');
    });
    it('should not throw when href is set to a relative value', () => {
      const url = new SafeURL('https://example.com/a');
      expect(() => {
        url.href = '/b';
      }).not.toThrow();
      expect(url.href).toBe('/b');
    });
    it('should support search, hash, port and credential setters', () => {
      const url = new SafeURL('https://example.com/a');
      url.search = '?x=1';
      url.hash = '#h';
      url.port = '8080';
      url.username = 'user';
      url.password = 'pw';
      expect(url.href).toBe('https://user:pw@example.com:8080/a?x=1#h');
    });
    it('should support the protocol setter', () => {
      const url = new SafeURL('http://example.com/a');
      url.protocol = 'https:';
      expect(url.protocol).toBe('https:');
      expect(url.href).toBe('https://example.com/a');
    });
    it('should hide a protocol set while there is no domain', () => {
      const url = new SafeURL('/a');
      url.protocol = 'https:';
      // a scheme without an authority is not meaningful, so it stays hidden
      expect(url.protocol).toBe('');
      expect(url.href).toBe('/a');
      // ...until a host makes it meaningful again
      url.hostname = 'example.com';
      expect(url.protocol).toBe('https:');
      expect(url.href).toBe('https://example.com/a');
    });
    it('should expose live searchParams', () => {
      const url = new SafeURL('/a');
      url.searchParams.set('x', '1');
      url.searchParams.append('y', '2');
      expect(url.search).toBe('?x=1&y=2');
      expect(url.href).toBe('/a?x=1&y=2');
    });
  });

  describe('mergeSearchParams', () => {
    it('should add params to a url with no query', () => {
      const url = new SafeURL('https://example.com/a');
      url.mergeSearchParams({ x: 1, y: 'two' });
      expect(url.search).toBe('?x=1&y=two');
      expect(url.href).toBe('https://example.com/a?x=1&y=two');
    });
    it('should overwrite existing params of the same name', () => {
      const url = new SafeURL('https://example.com/a?x=1&y=2');
      url.mergeSearchParams({ x: 9, z: 3 });
      // an object cannot express a repeated key, so `x` is replaced and, being
      // rewritten, moves to the end
      expect(url.search).toBe('?y=2&x=9&z=3');
    });
    it('should append when given entries', () => {
      const url = new SafeURL('https://example.com/a?x=1');
      url.mergeSearchParams([
        ['x', 2],
        ['y', 3],
      ]);
      expect(url.search).toBe('?x=1&x=2&y=3');
    });
    it('should append when given URLSearchParams', () => {
      const url = new SafeURL('https://example.com/a?x=1');
      url.mergeSearchParams(new URLSearchParams('x=2&y=3'));
      expect(url.search).toBe('?x=1&x=2&y=3');
    });
    it('should expand array values into repeated params', () => {
      const url = new SafeURL('/a');
      url.mergeSearchParams({ tags: ['a', 'b'] });
      expect(url.search).toBe('?tags=a&tags=b');
    });
    it('should drop a param given an empty array', () => {
      const url = new SafeURL('/a?x=1');
      url.mergeSearchParams({ x: [] });
      expect(url.search).toBe('');
      expect(url.href).toBe('/a');
    });
    it('should skip undefined values but keep null ones', () => {
      const url = new SafeURL('/a?x=1&y=2');
      url.mergeSearchParams({ x: undefined, y: null });
      expect(url.search).toBe('?x=1&y=');
    });
    it('should leave the query untouched when merging nothing', () => {
      const url = new SafeURL('/a?x=1');
      url.mergeSearchParams({});
      url.mergeSearchParams([]);
      url.mergeSearchParams(new URLSearchParams());
      expect(url.search).toBe('?x=1');
    });
    it('should encode names and values', () => {
      const url = new SafeURL('/a');
      url.mergeSearchParams({ 'a b': 'c&d' });
      expect(url.search).toBe('?a+b=c%26d');
      expect(url.searchParams.get('a b')).toBe('c&d');
    });
    it('should stringify non-string values', () => {
      const url = new SafeURL('/a');
      url.mergeSearchParams({ n: 0, t: true, s: { toString: () => 'obj' } });
      expect(url.search).toBe('?n=0&t=true&s=obj');
    });
    it('should preserve the path and hash', () => {
      const url = new SafeURL('https://example.com/a/b#h');
      url.mergeSearchParams({ x: 1 });
      expect(url.href).toBe('https://example.com/a/b?x=1#h');
    });
    it('should merge into a domain-less url', () => {
      const url = new SafeURL('a/b?x=1');
      url.mergeSearchParams({ y: 2 });
      expect(url.hasDomain).toBe(false);
      expect(url.href).toBe('a/b?x=1&y=2');
    });
    it('should keep searchParams live', () => {
      const url = new SafeURL('/a');
      const params = url.searchParams;
      url.mergeSearchParams({ x: 1 });
      expect(params).toBe(url.searchParams);
      expect(params.get('x')).toBe('1');
    });
    it('should not modify the params it was given', () => {
      const url = new SafeURL('/a?x=1');
      const source = new URLSearchParams('y=2');
      url.mergeSearchParams(source);
      expect(source.toString()).toBe('y=2');
    });
    it('should return this so merges can be chained', () => {
      const url = new SafeURL('/a?x=1');
      const returned = url.mergeSearchParams({ x: 2 }).mergeSearchParams({
        y: 3,
      });
      expect(returned).toBe(url);
      expect(url.href).toBe('/a?x=2&y=3');
    });
    it('should throw for an unsupported queryObject', () => {
      const url = new SafeURL('/a');
      expect(() => {
        // @ts-expect-error queryObject must be an object, entries, or params
        url.mergeSearchParams('x=1');
      }).toThrow(
        'Invalid queryObject. Expected object, array of entries, or URLSearchParams.'
      );
    });
  });

  describe('setSearchParams', () => {
    it('should add params to a url with no query', () => {
      const url = new SafeURL('https://example.com/a');
      url.setSearchParams({ x: 1, y: 'two' });
      expect(url.search).toBe('?x=1&y=two');
      expect(url.href).toBe('https://example.com/a?x=1&y=two');
    });
    it('should discard existing params', () => {
      const url = new SafeURL('https://example.com/a?x=1&y=2');
      url.setSearchParams({ z: 3 });
      expect(url.search).toBe('?z=3');
    });
    it('should discard repeated existing params', () => {
      const url = new SafeURL('/a?x=1&x=2&x=3');
      url.setSearchParams({ x: 4 });
      expect(url.searchParams.getAll('x')).toEqual(['4']);
    });
    it('should clear the query when given nothing', () => {
      const url = new SafeURL('/a?x=1');
      url.setSearchParams({});
      expect(url.search).toBe('');
      expect(url.href).toBe('/a');
    });
    it('should clear the query when given empty entries or params', () => {
      const fromEntries = new SafeURL('/a?x=1').setSearchParams([]);
      const fromParams = new SafeURL('/a?x=1').setSearchParams(
        new URLSearchParams()
      );
      expect(fromEntries.search).toBe('');
      expect(fromParams.search).toBe('');
    });
    it('should append within the entries it was given', () => {
      const url = new SafeURL('https://example.com/a?x=1');
      url.setSearchParams([
        ['x', 2],
        ['x', 3],
        ['y', 4],
      ]);
      // the existing `x` is gone, but repeats inside the entries are kept
      expect(url.search).toBe('?x=2&x=3&y=4');
    });
    it('should append within the URLSearchParams it was given', () => {
      const url = new SafeURL('https://example.com/a?x=1');
      url.setSearchParams(new URLSearchParams('x=2&x=3'));
      expect(url.search).toBe('?x=2&x=3');
    });
    it('should expand array values into repeated params', () => {
      const url = new SafeURL('/a?tags=old');
      url.setSearchParams({ tags: ['a', 'b'] });
      expect(url.search).toBe('?tags=a&tags=b');
    });
    it('should drop a param given an empty array', () => {
      const url = new SafeURL('/a?x=1');
      url.setSearchParams({ x: [], y: 2 });
      expect(url.search).toBe('?y=2');
    });
    it('should skip undefined values but keep null ones', () => {
      const url = new SafeURL('/a?x=1&y=2');
      url.setSearchParams({ x: undefined, y: null });
      // `x` is skipped rather than carried over, since the old query is gone
      expect(url.search).toBe('?y=');
    });
    it('should keep the params in the order they were given', () => {
      const url = new SafeURL('/a?a=1');
      url.setSearchParams({ z: 1, m: 2, b: 3 });
      expect(url.search).toBe('?z=1&m=2&b=3');
    });
    it('should encode names and values', () => {
      const url = new SafeURL('/a?x=1');
      url.setSearchParams({ 'a b': 'c&d' });
      expect(url.search).toBe('?a+b=c%26d');
      expect(url.searchParams.get('a b')).toBe('c&d');
    });
    it('should stringify non-string values', () => {
      const url = new SafeURL('/a?x=1');
      url.setSearchParams({ n: 0, t: true, s: { toString: () => 'obj' } });
      expect(url.search).toBe('?n=0&t=true&s=obj');
    });
    it('should preserve the path and hash', () => {
      const url = new SafeURL('https://example.com/a/b?x=1#h');
      url.setSearchParams({ y: 2 });
      expect(url.href).toBe('https://example.com/a/b?y=2#h');
    });
    it('should preserve the path and hash when clearing the query', () => {
      const url = new SafeURL('https://example.com/a/b?x=1#h');
      url.setSearchParams({});
      expect(url.href).toBe('https://example.com/a/b#h');
    });
    it('should set on a domain-less url', () => {
      const url = new SafeURL('a/b?x=1');
      url.setSearchParams({ y: 2 });
      expect(url.hasDomain).toBe(false);
      expect(url.href).toBe('a/b?y=2');
    });
    it('should keep searchParams live', () => {
      const url = new SafeURL('/a?x=1');
      const params = url.searchParams;
      url.setSearchParams({ y: 2 });
      expect(params).toBe(url.searchParams);
      expect(params.get('x')).toBe(null);
      expect(params.get('y')).toBe('2');
    });
    it('should not modify the params it was given', () => {
      const url = new SafeURL('/a?x=1');
      const source = new URLSearchParams('y=2');
      url.setSearchParams(source);
      expect(source.toString()).toBe('y=2');
    });
    it('should return this so calls can be chained', () => {
      const url = new SafeURL('/a?x=1');
      const returned = url.setSearchParams({ y: 2 }).setSearchParams({ z: 3 });
      expect(returned).toBe(url);
      // each call starts from an empty query, so only the last one survives
      expect(url.href).toBe('/a?z=3');
    });
    it('should chain with mergeSearchParams', () => {
      const url = new SafeURL('/a?x=1')
        .setSearchParams({ y: 2 })
        .mergeSearchParams({ z: 3 });
      expect(url.href).toBe('/a?y=2&z=3');
    });
    it('should throw for an unsupported queryObject', () => {
      const url = new SafeURL('/a');
      expect(() => {
        // @ts-expect-error queryObject must be an object, entries, or params
        url.setSearchParams('x=1');
      }).toThrow(
        'Invalid queryObject. Expected object, array of entries, or URLSearchParams.'
      );
    });
    it('should leave the query untouched when it throws', () => {
      const url = new SafeURL('/a?x=1');
      expect(() => {
        // @ts-expect-error queryObject must be an object, entries, or params
        url.setSearchParams(42);
      }).toThrow(TypeError);
      expect(url.search).toBe('?x=1');
    });
  });

  describe('statics', () => {
    it('should report canParse as true for anything stringifiable', () => {
      expect(SafeURL.canParse('https://example.com')).toBe(true);
      expect(SafeURL.canParse('/a/b')).toBe(true);
      expect(SafeURL.canParse('')).toBe(true);
      expect(SafeURL.canParse('http://')).toBe(true);
    });
    it('should report canParse as false when stringifying throws', () => {
      const bad = {
        toString: () => {
          throw new Error('nope');
        },
      };
      expect(SafeURL.canParse(bad)).toBe(false);
    });
    it('should parse without returning null', () => {
      const url = SafeURL.parse('a/b', '/c/');
      expect(url).toBeInstanceOf(SafeURL);
      expect(url.href).toBe('/c/a/b');
    });
    it('should round-trip object urls', () => {
      const objectUrl = SafeURL.createObjectURL(new Blob(['x']));
      expect(objectUrl).toStartWith('blob:');
      expect(() => SafeURL.revokeObjectURL(objectUrl)).not.toThrow();
    });
  });

  describe('hasDomain', () => {
    it('should be true only when an authority is present', () => {
      expect(new SafeURL('https://example.com').hasDomain).toBe(true);
      expect(new SafeURL('//example.com').hasDomain).toBe(true);
      expect(new SafeURL('a', '//example.com/b').hasDomain).toBe(true);
      expect(new SafeURL('/a/b').hasDomain).toBe(false);
      expect(new SafeURL('a/b').hasDomain).toBe(false);
      expect(new SafeURL('').hasDomain).toBe(false);
    });
  });
});
