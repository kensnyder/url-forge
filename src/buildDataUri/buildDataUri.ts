const INVALID_DATA =
  'Invalid data. Expected string, ArrayBuffer, or typed array.';

/**
 * Payload types accepted by {@link buildDataUri}.
 *
 * `ArrayBufferView` covers every typed array plus `DataView`, and therefore
 * Node's `Buffer`, which subclasses `Uint8Array`.
 */
export type DataUriData = string | ArrayBufferLike | ArrayBufferView;

/**
 * Build a base64 `data:` URI from text or binary data.
 *
 * Strings are encoded as UTF-8 before being base64ed. `btoa` alone cannot do
 * this: it throws on any code point above `U+00FF` and silently emits Latin-1
 * bytes for `U+0080`–`U+00FF`, so hand-rolled `btoa(text)` turns `café` into a
 * payload no UTF-8 decoder accepts.
 *
 * Because a string payload is always encoded as UTF-8, `;charset=utf-8` is
 * appended to `mimeType` unless it already declares a charset. Binary payloads
 * get no charset, since their encoding is not knowable from the bytes.
 *
 * Binary payloads are read through their own view window, so a typed array
 * that covers part of a larger buffer contributes only its own bytes.
 *
 * `mimeType` is not validated. A value containing `,` ends the media type
 * early and the remainder is read as payload, so pass a well-formed type.
 *
 * @param data The payload. Strings are encoded as UTF-8.
 * @param mimeType The media type to declare.
 * @returns The resulting `data:` URI.
 * @throws {TypeError} If `data` is not one of the supported shapes.
 */
export default function buildDataUri(
  data: DataUriData,
  mimeType: string = 'text/plain'
): string {
  const bytes = toBytes(data);
  const mediaType = withCharset(mimeType, typeof data === 'string');
  return `data:${mediaType};base64,${bytesToBase64(bytes)}`;
}

/**
 * Normalize any supported payload to the exact bytes it represents.
 */
function toBytes(data: DataUriData): Uint8Array {
  if (typeof data === 'string') {
    return new TextEncoder().encode(data);
  }
  if (ArrayBuffer.isView(data)) {
    // honor the view window so that a typed array covering part of a larger
    // buffer does not drag in the bytes around it
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (isArrayBufferLike(data)) {
    return new Uint8Array(data);
  }
  throw new TypeError(INVALID_DATA);
}

/**
 * Determine whether a value is an `ArrayBuffer` or `SharedArrayBuffer`.
 *
 * The brand check is used instead of `instanceof` because a buffer built in
 * another realm — an iframe, a worker, a `vm` context — fails `instanceof`
 * against this realm's constructor.
 */
function isArrayBufferLike(value: unknown): value is ArrayBufferLike {
  const tag = Object.prototype.toString.call(value);
  return tag === '[object ArrayBuffer]' || tag === '[object SharedArrayBuffer]';
}

/**
 * Declare the UTF-8 charset for text payloads that do not already have one.
 *
 * Without it the payload is misread: RFC 2397 defaults a `data:` URI to
 * `US-ASCII`, and `text/*` defaults the same way under RFC 2046.
 */
function withCharset(mimeType: string, isText: boolean): string {
  if (!isText || /;\s*charset=/i.test(mimeType)) {
    return mimeType;
  }
  return `${mimeType};charset=utf-8`;
}

/**
 * A `Uint8Array` on a runtime that implements the TC39 base64 proposal.
 */
type Base64Capable = { toBase64: () => string };

/**
 * Encode bytes as base64 using the widest set of runtimes available.
 */
function bytesToBase64(bytes: Uint8Array): string {
  const native = bytes as Partial<Base64Capable>;
  if (typeof native.toBase64 === 'function') {
    return native.toBase64();
  }
  // `btoa` covers every runtime that lacks `toBase64`, which as of this
  // writing still includes Node and older Safari and Firefox
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    // chunked because spreading a multi-megabyte array into `fromCharCode`
    // overflows the argument stack
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
