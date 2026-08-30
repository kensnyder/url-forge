import { describe, expect, it } from 'bun:test';
import buildDataUri from './buildDataUri';

/**
 * Decode the payload of a base64 data URI back to bytes.
 */
function payloadBytes(uri: string): Uint8Array {
  const base64 = uri.slice(uri.indexOf(',') + 1);
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
}

/**
 * Decode the payload of a base64 data URI back to text, rejecting any byte
 * sequence that is not valid UTF-8.
 */
function payloadText(uri: string): string {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  return decoder.decode(payloadBytes(uri));
}

describe('buildDataUri', () => {
  it('should default to text/plain with a utf-8 charset', () => {
    expect(buildDataUri('hello')).toBe(
      'data:text/plain;charset=utf-8;base64,aGVsbG8='
    );
  });

  it('should use the given mime type', () => {
    expect(buildDataUri('{"a":1}', 'application/json')).toBe(
      'data:application/json;charset=utf-8;base64,eyJhIjoxfQ=='
    );
  });

  it('should encode an empty string', () => {
    expect(buildDataUri('')).toBe('data:text/plain;charset=utf-8;base64,');
  });

  describe('text encoding', () => {
    it('should encode latin-1 range characters as utf-8', () => {
      // btoa alone would emit the single byte 0xe9 here, which is not utf-8
      const uri = buildDataUri('café');
      expect(payloadBytes(uri)).toEqual(
        new Uint8Array([99, 97, 102, 195, 169])
      );
      expect(payloadText(uri)).toBe('café');
    });

    it('should encode characters that btoa rejects outright', () => {
      expect(() => btoa('€')).toThrow();
      expect(payloadText(buildDataUri('€'))).toBe('€');
    });

    it('should encode astral plane characters', () => {
      expect(payloadText(buildDataUri('😀'))).toBe('😀');
    });

    it('should round trip mixed text', () => {
      const text = 'café € 😀 日本語';
      expect(payloadText(buildDataUri(text))).toBe(text);
    });

    it('should encode a lone surrogate as the replacement character', () => {
      expect(payloadText(buildDataUri('\ud800'))).toBe('�');
    });
  });

  describe('charset', () => {
    it('should keep an explicit charset', () => {
      expect(buildDataUri('hi', 'text/html;charset=iso-8859-1')).toBe(
        'data:text/html;charset=iso-8859-1;base64,aGk='
      );
    });

    it('should keep an explicit charset given spaces and mixed case', () => {
      expect(buildDataUri('hi', 'text/html; CharSet=us-ascii')).toBe(
        'data:text/html; CharSet=us-ascii;base64,aGk='
      );
    });

    it('should not add a charset to binary data', () => {
      const bytes = new Uint8Array([137, 80, 78, 71]);
      expect(buildDataUri(bytes, 'image/png')).toBe(
        'data:image/png;base64,iVBORw=='
      );
    });
  });

  describe('binary data', () => {
    it('should accept an ArrayBuffer', () => {
      const bytes = new Uint8Array([137, 80, 78, 71]);
      expect(buildDataUri(bytes.buffer, 'image/png')).toBe(
        'data:image/png;base64,iVBORw=='
      );
    });

    it('should accept a Uint8Array', () => {
      const bytes = new Uint8Array([137, 80, 78, 71]);
      expect(buildDataUri(bytes, 'image/png')).toBe(
        'data:image/png;base64,iVBORw=='
      );
    });

    it('should accept an empty ArrayBuffer', () => {
      expect(buildDataUri(new ArrayBuffer(0), 'image/png')).toBe(
        'data:image/png;base64,'
      );
    });

    it('should read only the bytes a view covers', () => {
      const buffer = new ArrayBuffer(8);
      new Uint8Array(buffer).set([1, 2, 3, 4, 137, 80, 78, 71]);
      const view = new Uint8Array(buffer, 4, 4);
      expect(buildDataUri(view, 'image/png')).toBe(
        'data:image/png;base64,iVBORw=='
      );
    });

    it('should accept a DataView', () => {
      const buffer = new ArrayBuffer(8);
      new Uint8Array(buffer).set([1, 2, 3, 4, 137, 80, 78, 71]);
      const view = new DataView(buffer, 4, 4);
      expect(buildDataUri(view, 'image/png')).toBe(
        'data:image/png;base64,iVBORw=='
      );
    });

    it('should accept a wide typed array by its byte length', () => {
      const words = new Uint16Array([1, 2]);
      expect(
        payloadBytes(buildDataUri(words, 'application/octet-stream'))
      ).toHaveLength(4);
    });

    it('should accept a Node Buffer', () => {
      expect(buildDataUri(Buffer.from('hi'), 'application/octet-stream')).toBe(
        'data:application/octet-stream;base64,aGk='
      );
    });

    it('should encode every byte value', () => {
      const all = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        all[i] = i;
      }
      expect(
        payloadBytes(buildDataUri(all, 'application/octet-stream'))
      ).toEqual(all);
    });
  });

  describe('base64 fallback', () => {
    /**
     * Runtimes split on `Uint8Array.prototype.toBase64`, so exercise the
     * `btoa` path the same way a runtime without it would.
     */
    function withoutNativeBase64<T>(run: () => T): T {
      const proto = Uint8Array.prototype as Partial<{ toBase64: () => string }>;
      const native = proto.toBase64;
      if (native === undefined) {
        return run();
      }
      delete proto.toBase64;
      try {
        return run();
      } finally {
        proto.toBase64 = native;
      }
    }

    it('should agree with the native encoder', () => {
      const text = 'café € 😀 日本語';
      const fallback = withoutNativeBase64(() => buildDataUri(text));
      expect(fallback).toBe(buildDataUri(text));
    });

    it('should encode a payload larger than one chunk', () => {
      const bytes = new Uint8Array(0x8000 * 3 + 7).fill(65);
      const fallback = withoutNativeBase64(() =>
        buildDataUri(bytes, 'application/octet-stream')
      );
      expect(payloadBytes(fallback)).toEqual(bytes);
    });

    it('should encode a payload too large to spread onto the stack', () => {
      const bytes = new Uint8Array(3_000_000).fill(65);
      const fallback = withoutNativeBase64(() =>
        buildDataUri(bytes, 'application/octet-stream')
      );
      expect(payloadBytes(fallback)).toHaveLength(bytes.length);
    });
  });

  describe('invalid data', () => {
    const cases: Array<[label: string, value: unknown]> = [
      ['null', null],
      ['undefined', undefined],
      ['a number', 42],
      ['a boolean', true],
      ['a plain object', {}],
      ['an array', [1, 2, 3]],
    ];
    for (const [label, value] of cases) {
      it(`should throw a TypeError given ${label}`, () => {
        expect(() => buildDataUri(value as string)).toThrow(TypeError);
      });
    }
  });
});
