import buildSearchParams, {
  type QueryObject,
} from '../buildSearchParams/buildSearchParams';

export type { QueryObject };

/**
 * Construct a URL string by merging query parameters into a path.
 *
 * Merging is delegated to {@link buildSearchParams}: objects overwrite existing
 * parameters of the same name, while entry arrays and `URLSearchParams` append.
 * Any existing query string on `path` is merged, and the hash is preserved.
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
export default function buildUrl(
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
  const existing = queryAt === -1 ? '' : beforeHash.slice(queryAt + 1);
  const params = buildSearchParams(queryObject, existing);
  // sort by name so that equivalent inputs always yield the same URL
  params.sort();
  const qs = params.toString();
  const maybeQs = qs ? `?${qs}` : '';
  return `${base}${maybeQs}${hash}`;
}
