import buildSearchParams, {
  type QueryObject,
} from '../buildSearchParams/buildSearchParams.ts';

export type Stringifiable = string | { toString: () => string };

/**
 * Origin used to parse references that carry no authority of their own.
 *
 * It only ever exists inside the wrapped `URL`. Every accessor that could leak
 * it (`host`, `hostname`, `origin`, `port`, `protocol`, `href`, ...) reports an
 * empty string or omits the origin entirely while {@link SafeURL#hasDomain} is
 * `false`.
 */
const SENTINEL_ORIGIN = 'http://safe-url-parser.local';
const SENTINEL_HOST = 'safe-url-parser.local';

/**
 * How many slashes introduced the path in the parsed reference.
 *
 * - `2` an authority is present (`//host/p`, `http://host/p`)
 * - `1` an absolute path with no authority (`/p`)
 * - `0` a relative path (`p`)
 */
type SlashCount = 0 | 1 | 2;

type ParsedUrl = {
  url: URL;
  hasDomain: boolean;
  slashCount: SlashCount;
};

type ResolvedUrl = {
  url: URL;
  /** `true` when the reference had to be salvaged instead of parsed. */
  degraded: boolean;
};

/**
 * A `URL` that accepts relative references instead of throwing on them.
 *
 * `URL` rejects anything without a scheme and authority, so `new URL('/a/b')`
 * throws and callers end up wrapping every construction in a `try`. `SafeURL`
 * accepts the same inputs as `URL` plus every relative reference, and parses
 * domain-less references against a private sentinel origin.
 *
 * When neither the reference nor the base carries an authority, `host`,
 * `hostname`, `origin`, `port`, `protocol`, `username` and `password` all read
 * as an empty string, and `href` is just the path, query and hash. The number
 * of leading slashes is preserved, so `SafeURL` distinguishes the three shapes
 * `URL` cannot:
 *
 * ```ts
 * new SafeURL('//localhost').hostname; // 'localhost' — same as http://localhost
 * new SafeURL('/localhost').pathname;  // '/localhost' — an absolute path
 * new SafeURL('localhost').pathname;   // 'localhost'  — a relative path
 * ```
 */
export default class SafeURL implements URL {
  protected _url: URL;
  protected _hasDomain: boolean;
  protected _slashCount: SlashCount;

  /**
   * @param inputUrl The reference to parse. Absolute or relative; relative
   *   references are parsed rather than rejected.
   * @param base Optional base to resolve `inputUrl` against. Unlike `URL`, the
   *   base may itself be relative.
   */
  constructor(inputUrl: Stringifiable, base?: Stringifiable) {
    const parsed = parseSafely(String(inputUrl), stringifyBase(base));
    this._url = parsed.url;
    this._hasDomain = parsed.hasDomain;
    this._slashCount = parsed.slashCount;
  }

  /**
   * Merge query parameters into the existing ones, in place.
   *
   * Objects overwrite parameters of the same name, since an object cannot
   * express a repeated key; entry arrays and `URLSearchParams` append, since
   * those formats can. `queryObject` itself is never modified.
   *
   * ```ts
   * new SafeURL('/a?x=1').mergeSearchParams({ x: 2, y: 3 }).href; // '/a?x=2&y=3'
   * new SafeURL('/a?x=1').mergeSearchParams([['x', 2]]).href;     // '/a?x=1&x=2'
   * ```
   *
   * @param queryObject Parameters to merge, as an object, an array of
   *   `[name, value]` entries, or a `URLSearchParams`.
   * @returns This `SafeURL`, so merges can be chained.
   * @throws {TypeError} If `queryObject` is not one of the supported shapes.
   */
  mergeSearchParams(queryObject: QueryObject): this {
    const params = buildSearchParams(queryObject, this._url.searchParams);
    this._url.search = params.toString();
    return this;
  }

  /**
   * Replace the query with `queryObject`, in place.
   *
   * Every parameter already on the URL is discarded first, so the result holds
   * exactly what was passed. Within `queryObject` the usual rules still apply:
   * objects overwrite parameters of the same name, entry arrays and
   * `URLSearchParams` append. `queryObject` itself is never modified.
   *
   * ```ts
   * new SafeURL('/a?x=1').setSearchParams({ y: 2 }).href; // '/a?y=2'
   * new SafeURL('/a?x=1').setSearchParams({}).href;       // '/a'
   * ```
   *
   * @param queryObject Parameters to set, as an object, an array of
   *   `[name, value]` entries, or a `URLSearchParams`.
   * @returns This `SafeURL`, so calls can be chained.
   * @throws {TypeError} If `queryObject` is not one of the supported shapes.
   */
  setSearchParams(queryObject: QueryObject): this {
    const params = buildSearchParams(queryObject);
    this._url.search = params.toString();
    return this;
  }

  /**
   * Whether an authority was found in the reference or its base. While this is
   * `false`, every origin-related accessor reads as an empty string.
   */
  get hasDomain(): boolean {
    return this._hasDomain;
  }

  get hash(): string {
    return this._url.hash;
  }

  set hash(value: string) {
    this._url.hash = value;
  }

  get host(): string {
    if (!this._hasDomain) {
      return '';
    }
    return this._url.host;
  }

  set host(value: string) {
    this._setAuthority('host', String(value));
  }

  get hostname(): string {
    if (!this._hasDomain) {
      return '';
    }
    return this._url.hostname;
  }

  set hostname(value: string) {
    this._setAuthority('hostname', String(value));
  }

  get href(): string {
    if (this._hasDomain) {
      return this._url.href;
    }
    // the sentinel origin is an implementation detail; never surface it
    return `${this.pathname}${this._url.search}${this._url.hash}`;
  }

  /**
   * Re-parses from scratch. Unlike `URL`, a relative value is accepted and is
   * resolved against nothing rather than throwing.
   */
  set href(value: string) {
    const parsed = parseSafely(String(value));
    this._url = parsed.url;
    this._hasDomain = parsed.hasDomain;
    this._slashCount = parsed.slashCount;
  }

  get origin(): string {
    if (!this._hasDomain) {
      return '';
    }
    return this._url.origin;
  }

  get password(): string {
    if (!this._hasDomain) {
      return '';
    }
    return this._url.password;
  }

  set password(value: string) {
    this._url.password = value;
  }

  /**
   * The path, carrying the same number of leading slashes as the reference it
   * was parsed from: `'/a/b'` stays rooted, while `'a/b'` stays relative.
   */
  get pathname(): string {
    const pathname = this._url.pathname;
    if (this._slashCount === 0 && pathname.startsWith('/')) {
      return pathname.slice(1);
    }
    return pathname;
  }

  set pathname(value: string) {
    const pathname = String(value);
    if (!this._hasDomain) {
      // a rooted path stays rooted, a relative one stays relative
      this._slashCount = countLeadingSlashes(pathname) === 0 ? 0 : 1;
    }
    this._url.pathname = pathname;
  }

  get port(): string {
    if (!this._hasDomain) {
      return '';
    }
    return this._url.port;
  }

  set port(value: string) {
    this._url.port = value;
  }

  get protocol(): string {
    if (!this._hasDomain) {
      return '';
    }
    return this._url.protocol;
  }

  set protocol(value: string) {
    this._url.protocol = value;
  }

  get search(): string {
    return this._url.search;
  }

  set search(value: string) {
    this._url.search = value;
  }

  /** Live params, exactly as `URL` provides: edits write back to `search`. */
  get searchParams(): URLSearchParams {
    return this._url.searchParams;
  }

  get username(): string {
    if (!this._hasDomain) {
      return '';
    }
    return this._url.username;
  }

  set username(value: string) {
    this._url.username = value;
  }

  toString(): string {
    return this.href;
  }

  toJSON(): string {
    return this.href;
  }

  /**
   * Assign the authority, and remember whether one is now present. Assigning an
   * empty string drops the authority, which `URL` refuses to do.
   */
  protected _setAuthority(key: 'host' | 'hostname', value: string): void {
    if (value === '') {
      this._url.host = SENTINEL_HOST;
      this._hasDomain = false;
      // the path was absolute while an authority existed, so keep it rooted
      this._slashCount = 1;
      return;
    }
    this._url[key] = value;
    this._hasDomain = true;
    this._slashCount = 2;
  }

  /**
   * Whether `inputUrl` can be parsed. Mirrors `URL.canParse`, and is `true` for
   * every value that stringifies, since `SafeURL` accepts relative references.
   */
  static canParse(inputUrl: Stringifiable, base?: Stringifiable): boolean {
    try {
      new SafeURL(inputUrl);
      return true;
    } catch {
      // only reachable when stringifying `inputUrl` or `base` throws
      return false;
    }
  }

  /**
   * Parse `inputUrl`. Mirrors `URL.parse`, except that it never returns `null`.
   */
  static parse(inputUrl: Stringifiable, base?: Stringifiable): SafeURL {
    return new SafeURL(inputUrl, base);
  }

  /** Delegates to the global `URL`; provided only for API parity. */
  static createObjectURL(obj: Blob): string {
    return URL.createObjectURL(obj);
  }

  /** Delegates to the global `URL`; provided only for API parity. */
  static revokeObjectURL(objectURL: string): void {
    URL.revokeObjectURL(objectURL);
  }
}

function stringifyBase(base?: Stringifiable): string | undefined {
  if (base === undefined || base === null) {
    return undefined;
  }
  return String(base);
}

/**
 * Count the slashes that open a reference. Backslashes count too, because the
 * URL parser folds them into slashes for the special schemes we parse against.
 */
function countLeadingSlashes(url: string): number {
  let count = 0;
  while (count < url.length && (url[count] === '/' || url[count] === '\\')) {
    count++;
  }
  return count;
}

/**
 * Resolve `reference` against `base` without throwing.
 *
 * A few references are not usable as references at all — `'//'` has an empty
 * authority, `'http://'` has a scheme but no host. The `URL` setters never
 * throw, so those are salvaged by assigning their text piecewise instead.
 */
function resolve(reference: string, base: URL): ResolvedUrl {
  try {
    return { url: new URL(reference, base), degraded: false };
  } catch {
    // fall through and salvage the reference below
  }
  const hashAt = reference.indexOf('#');
  const hash = hashAt === -1 ? '' : reference.slice(hashAt);
  const beforeHash = hashAt === -1 ? reference : reference.slice(0, hashAt);
  const queryAt = beforeHash.indexOf('?');
  const search = queryAt === -1 ? '' : beforeHash.slice(queryAt);
  const pathname = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
  const url = new URL(base.href);
  url.pathname = pathname;
  // assigning empty clears whatever the base carried
  url.search = search;
  url.hash = hash;
  return { url, degraded: true };
}

/**
 * Parse `url` against `base`, falling back to the sentinel origin when neither
 * carries an authority. Recurses at most one level, to parse a relative `base`.
 */
function parseSafely(url: string, base?: string): ParsedUrl {
  try {
    // `URL` handles everything with a scheme, including opaque ones like
    // `mailto:` whose hostname is legitimately empty
    return { url: new URL(url, base), hasDomain: true, slashCount: 2 };
  } catch {
    // no usable scheme in `url` or `base`; rebuild against the sentinel
  }
  const parsedBase = base === undefined ? null : parseSafely(base);
  const from = parsedBase === null ? new URL(SENTINEL_ORIGIN) : parsedBase.url;
  const leadingSlashes = countLeadingSlashes(url);
  const resolved = resolve(url, from);
  const hasDomain =
    // the reference resolved to a scheme or host of its own
    resolved.url.origin !== SENTINEL_ORIGIN ||
    // `//host` is protocol-relative, so it names a host even against a sentinel
    (!resolved.degraded && leadingSlashes >= 2) ||
    // otherwise the authority, if any, comes from the base
    parsedBase?.hasDomain === true;
  return {
    url: resolved.url,
    hasDomain,
    slashCount: countSlashes({ hasDomain, leadingSlashes, parsedBase }),
  };
}

function countSlashes({
  hasDomain,
  leadingSlashes,
  parsedBase,
}: {
  hasDomain: boolean;
  leadingSlashes: number;
  parsedBase: ParsedUrl | null;
}): SlashCount {
  if (hasDomain) {
    return 2;
  }
  if (leadingSlashes >= 1) {
    return 1;
  }
  // a relative reference inherits the shape of the path it was merged into
  if (parsedBase !== null) {
    return parsedBase.slashCount;
  }
  return 0;
}
