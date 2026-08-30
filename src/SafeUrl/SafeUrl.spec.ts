import { describe, expect, it } from 'bun:test';
import SafeUrl from './SafeUrl';

describe('SafeUrl', () => {
  describe('absolute urls', () => {
    it('should behave like URL', () => {
      const url = new SafeUrl('https://user:pw@example.com:8080/a/b?x=1#h');
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
      const url = new SafeUrl('c', 'https://example.com/a/b');
      expect(url.href).toBe('https://example.com/a/c');
    });
    it('should accept a URL as the base', () => {
      const url = new SafeUrl('c', new URL('https://example.com/a/b'));
      expect(url.href).toBe('https://example.com/a/c');
    });
    it('should accept a SafeUrl as the base', () => {
      const url = new SafeUrl('c', new SafeUrl('/a/b'));
      expect(url.href).toBe('/a/c');
    });
    it('should keep opaque schemes intact', () => {
      const url = new SafeUrl('mailto:me@example.com');
      expect(url.protocol).toBe('mailto:');
      expect(url.hostname).toBe('');
      expect(url.pathname).toBe('me@example.com');
      expect(url.href).toBe('mailto:me@example.com');
    });
  });

  describe('leading slashes', () => {
    it('should treat // as a domain', () => {
      const url = new SafeUrl('//localhost');
      expect(url.hostname).toBe('localhost');
      expect(url.href).toBe(new URL('http://localhost').href);
    });
    it('should treat // with a path as a domain', () => {
      const url = new SafeUrl('//localhost/a/b');
      expect(url.hostname).toBe('localhost');
      expect(url.pathname).toBe('/a/b');
      expect(url.href).toBe('http://localhost/a/b');
    });
    it('should treat / as an absolute path', () => {
      const url = new SafeUrl('/localhost');
      expect(url.hostname).toBe('');
      expect(url.pathname).toBe('/localhost');
      expect(url.href).toBe('/localhost');
    });
    it('should treat a bare word as a relative path', () => {
      const url = new SafeUrl('localhost');
      expect(url.hostname).toBe('');
      expect(url.pathname).toBe('localhost');
      expect(url.href).toBe('localhost');
    });
    it('should keep a relative path relative through segments', () => {
      expect(new SafeUrl('a/b/c').pathname).toBe('a/b/c');
      expect(new SafeUrl('./a/b').pathname).toBe('a/b');
      expect(new SafeUrl('a/../b').pathname).toBe('b');
    });
    it('should protocol-relative resolve against a base with a scheme', () => {
      const url = new SafeUrl('//other.com/a', 'https://example.com/b');
      expect(url.href).toBe('https://other.com/a');
    });
  });

  describe('domain-less urls', () => {
    it('should report every origin field as empty', () => {
      const url = new SafeUrl('/a/b?x=1#h');
      expect(url.protocol).toBe('');
      expect(url.username).toBe('');
      expect(url.password).toBe('');
      expect(url.host).toBe('');
      expect(url.hostname).toBe('');
      expect(url.port).toBe('');
      expect(url.origin).toBe('');
    });
    it('should never leak the sentinel origin', () => {
      const url = new SafeUrl('a/b?x=1#h');
      expect(url.href).toBe('a/b?x=1#h');
      expect(url.toString()).toBe('a/b?x=1#h');
      expect(url.toJSON()).toBe('a/b?x=1#h');
      expect(JSON.stringify({ url })).toBe('{"url":"a/b?x=1#h"}');
    });
    it('should handle an empty string', () => {
      const url = new SafeUrl('');
      expect(url.pathname).toBe('');
      expect(url.href).toBe('');
    });
    it('should handle a query-only reference', () => {
      const url = new SafeUrl('?x=1');
      expect(url.pathname).toBe('');
      expect(url.search).toBe('?x=1');
      expect(url.href).toBe('?x=1');
    });
    it('should handle a hash-only reference', () => {
      const url = new SafeUrl('#h');
      expect(url.pathname).toBe('');
      expect(url.hash).toBe('#h');
      expect(url.href).toBe('#h');
    });
    it('should handle a root path', () => {
      expect(new SafeUrl('/').pathname).toBe('/');
      expect(new SafeUrl('/').href).toBe('/');
    });
  });

  describe('relative bases', () => {
    it('should resolve a relative reference against a relative base', () => {
      const url = new SafeUrl('c', 'a/b');
      expect(url.href).toBe('a/c');
    });
    it('should resolve a relative reference against a rooted base', () => {
      const url = new SafeUrl('c', '/a/b');
      expect(url.href).toBe('/a/c');
    });
    it('should let a rooted reference override a relative base', () => {
      const url = new SafeUrl('/c', 'a/b');
      expect(url.href).toBe('/c');
    });
    it('should inherit a domain from a protocol-relative base', () => {
      const url = new SafeUrl('c', '//example.com/a/b');
      expect(url.hostname).toBe('example.com');
      expect(url.href).toBe('http://example.com/a/c');
    });
    it('should ignore an empty base', () => {
      expect(new SafeUrl('a/b', '').href).toBe('a/b');
    });
  });

  describe('never throwing', () => {
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
        expect(() => new SafeUrl(input)).not.toThrow();
        expect(() => new SafeUrl('a', input)).not.toThrow();
        expect(() => new SafeUrl(input, 'https://example.com')).not.toThrow();
        expect(typeof new SafeUrl(input).href).toBe('string');
      });
    }
    it('should keep a degenerate authority out of the hostname', () => {
      const url = new SafeUrl('//');
      expect(url.hostname).toBe('');
      expect(url.href).toBe('//');
    });
    it('should salvage a scheme with no host', () => {
      const url = new SafeUrl('http://');
      expect(url.hostname).toBe('');
      expect(url.href).toBe('http://');
    });
    it('should salvage a scheme with no host but a query', () => {
      const url = new SafeUrl('http://?x=1');
      expect(url.pathname).toBe('http://');
      expect(url.search).toBe('?x=1');
    });
    it('should accept anything stringifiable', () => {
      expect(new SafeUrl({ toString: () => '/a/b' }).href).toBe('/a/b');
      expect(new SafeUrl(new URL('https://example.com/a')).href).toBe(
        'https://example.com/a'
      );
    });
  });

  describe('setters', () => {
    it('should add a domain when hostname is set', () => {
      const url = new SafeUrl('/a/b');
      url.hostname = 'example.com';
      expect(url.hostname).toBe('example.com');
      expect(url.href).toBe('http://example.com/a/b');
    });
    it('should add a domain when host is set', () => {
      const url = new SafeUrl('/a/b');
      url.host = 'example.com:8080';
      expect(url.port).toBe('8080');
      expect(url.href).toBe('http://example.com:8080/a/b');
    });
    it('should drop the domain when hostname is set to empty', () => {
      const url = new SafeUrl('https://example.com/a/b?x=1');
      url.hostname = '';
      expect(url.hostname).toBe('');
      expect(url.origin).toBe('');
      expect(url.href).toBe('/a/b?x=1');
    });
    it('should keep a rooted path rooted when pathname is set', () => {
      const url = new SafeUrl('a/b');
      url.pathname = '/c/d';
      expect(url.pathname).toBe('/c/d');
      expect(url.href).toBe('/c/d');
    });
    it('should keep a relative path relative when pathname is set', () => {
      const url = new SafeUrl('/a/b');
      url.pathname = 'c/d';
      expect(url.pathname).toBe('c/d');
      expect(url.href).toBe('c/d');
    });
    it('should re-parse when href is set', () => {
      const url = new SafeUrl('https://example.com/a');
      url.href = 'c/d?x=1';
      expect(url.hostname).toBe('');
      expect(url.pathname).toBe('c/d');
      expect(url.href).toBe('c/d?x=1');
    });
    it('should not throw when href is set to a relative value', () => {
      const url = new SafeUrl('https://example.com/a');
      expect(() => {
        url.href = '/b';
      }).not.toThrow();
      expect(url.href).toBe('/b');
    });
    it('should support search, hash, port and credential setters', () => {
      const url = new SafeUrl('https://example.com/a');
      url.search = '?x=1';
      url.hash = '#h';
      url.port = '8080';
      url.username = 'user';
      url.password = 'pw';
      expect(url.href).toBe('https://user:pw@example.com:8080/a?x=1#h');
    });
    it('should support the protocol setter', () => {
      const url = new SafeUrl('http://example.com/a');
      url.protocol = 'https:';
      expect(url.protocol).toBe('https:');
      expect(url.href).toBe('https://example.com/a');
    });
    it('should hide a protocol set while there is no domain', () => {
      const url = new SafeUrl('/a');
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
      const url = new SafeUrl('/a');
      url.searchParams.set('x', '1');
      url.searchParams.append('y', '2');
      expect(url.search).toBe('?x=1&y=2');
      expect(url.href).toBe('/a?x=1&y=2');
    });
  });

  describe('statics', () => {
    it('should report canParse as true for anything stringifiable', () => {
      expect(SafeUrl.canParse('https://example.com')).toBe(true);
      expect(SafeUrl.canParse('/a/b')).toBe(true);
      expect(SafeUrl.canParse('')).toBe(true);
      expect(SafeUrl.canParse('http://')).toBe(true);
    });
    it('should report canParse as false when stringifying throws', () => {
      const bad = {
        toString: () => {
          throw new Error('nope');
        },
      };
      expect(SafeUrl.canParse(bad)).toBe(false);
    });
    it('should parse without returning null', () => {
      const url = SafeUrl.parse('a/b', '/c/');
      expect(url).toBeInstanceOf(SafeUrl);
      expect(url.href).toBe('/c/a/b');
    });
    it('should round-trip object urls', () => {
      const objectUrl = SafeUrl.createObjectURL(new Blob(['x']));
      expect(objectUrl).toStartWith('blob:');
      expect(() => SafeUrl.revokeObjectURL(objectUrl)).not.toThrow();
    });
  });

  describe('hasDomain', () => {
    it('should be true only when an authority is present', () => {
      expect(new SafeUrl('https://example.com').hasDomain).toBe(true);
      expect(new SafeUrl('//example.com').hasDomain).toBe(true);
      expect(new SafeUrl('a', '//example.com/b').hasDomain).toBe(true);
      expect(new SafeUrl('/a/b').hasDomain).toBe(false);
      expect(new SafeUrl('a/b').hasDomain).toBe(false);
      expect(new SafeUrl('').hasDomain).toBe(false);
    });
  });
});
