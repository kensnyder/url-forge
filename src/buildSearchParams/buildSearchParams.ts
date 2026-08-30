const INVALID_QUERY_OBJECT =
  'Invalid queryObject. Expected object, array of entries, or URLSearchParams.';

/**
 * Query parameter sources accepted by {@link buildSearchParams}.
 */
export type QueryObject =
  | Record<string, unknown>
  | Array<[name: string, value?: unknown]>
  | URLSearchParams;

/**
 * Build a `URLSearchParams` by merging query parameters into a base set.
 *
 * Objects overwrite existing parameters of the same name, since an object
 * cannot express a repeated key. Entry arrays and `URLSearchParams` append,
 * since those formats can.
 *
 * The returned params are raw: they keep the order the values were merged in
 * and are never sorted. Call `.sort()` on the result if a stable ordering
 * matters. Neither `queryObject` nor `base` is modified.
 *
 * @param queryObject Parameters to merge. Nullish or `false` merges nothing.
 * @param base Parameters to merge into, as a query string or
 *   `URLSearchParams`. A leading `?` is allowed and ignored.
 * @returns A new `URLSearchParams` holding the merged parameters.
 * @throws {TypeError} If `queryObject` is not one of the supported shapes.
 */
export default function buildSearchParams(
  queryObject?: QueryObject | null | false,
  base?: string | URLSearchParams
): URLSearchParams {
  const params = new URLSearchParams(base);
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
  return params;
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
