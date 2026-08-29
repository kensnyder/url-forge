const INVALID_QUERY_OBJECT =
  'Invalid queryObject. Expected object, array of entries, or URLSearchParams.';

/**
 * Query parameter sources accepted by {@link toUrl}.
 */
export type QueryObject =
  | Record<string, unknown>
  | Array<[name: string, value?: unknown]>
  | URLSearchParams;

/**
 * Construct a URL string by merging query parameters into a path.
 *
 * Objects overwrite existing parameters of the same name, since an object
 * cannot express a repeated key. Entry arrays and `URLSearchParams` append,
 * since those formats can. Any existing query string on `path` is merged, and
 * the hash is preserved.
 *
 * Parameters are always sorted by name so that a given set of inputs produces
 * a byte-identical URL, which keeps caching and snapshot comparisons stable.
 * Repeated values for the same name keep their insertion order.
 *
 * @param path The base path or URL. Existing query string and hash are kept.
 * @param queryObject Parameters to merge. Nullish or `false` merges nothing.
 * @returns The resulting URL string.
 * @throws {TypeError} If `queryObject` is not one of the supported shapes.
 */
export default function toUrl(
  path: string | URL,
  queryObject?: QueryObject | null | false
): string {
  const href = String(path);
  const hashAt = href.indexOf('#');
  // keep the leading '#' so that fragments containing '#' survive intact
  const hash = hashAt === -1 ? '' : href.slice(hashAt);
  const beforeHash = hashAt === -1 ? href : href.slice(0, hashAt);
  const queryAt = beforeHash.indexOf('?');
  const base = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
  const params = new URLSearchParams(
    queryAt === -1 ? '' : beforeHash.slice(queryAt + 1)
  );
  if (Array.isArray(queryObject)) {
    for (const entry of queryObject) {
      if (!isEntry(entry)) {
        throw new TypeError(INVALID_QUERY_OBJECT);
      }
      // we choose to append all values since we have an entries format
      params.append(String(entry[0]), valueToString(entry[1]));
    }
  } else if (queryObject instanceof URLSearchParams) {
    for (const [name, value] of queryObject) {
      // we choose to append all values since we have an entries format
      params.append(name, value);
    }
  } else if (queryObject && typeof queryObject === 'object') {
    // treat queryObject as Record<string, unknown>
    for (const [name, value] of Object.entries(queryObject)) {
      if (value === undefined) {
        continue;
      }
      // we choose to overwrite existing values since new values are an object
      params.delete(name);
      if (!Array.isArray(value)) {
        params.append(name, valueToString(value));
        continue;
      }
      for (const item of value) {
        params.append(name, valueToString(item));
      }
    }
  } else if (
    queryObject !== undefined &&
    queryObject !== null &&
    queryObject !== false
  ) {
    throw new TypeError(INVALID_QUERY_OBJECT);
  }
  // sort by name so that equivalent inputs always yield the same URL
  params.sort();
  const qs = params.toString();
  const maybeQs = qs ? `?${qs}` : '';
  return `${base}${maybeQs}${hash}`;
}

function valueToString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

/**
 * Determine whether a value can be read as a `[name, value?]` entry. Accepts
 * `unknown` so that the length check survives narrowing by the tuple type.
 */
function isEntry(value: unknown): value is [unknown, unknown?] {
  return Array.isArray(value) && value.length > 0;
}
