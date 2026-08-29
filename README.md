# url-forge

[![NPM Link](https://badgen.net/npm/v/url-forge?v=1.0.0&cb=1)](https://npmjs.com/package/url-forge)
[![Language](https://badgen.net/static/language/TS?v=1.0.0&cb=1)](https://github.com/search?q=repo:kensnyder/url-forge++language:TypeScript&type=code)
[![Build Status](https://github.com/kensnyder/url-forge/actions/workflows/workflow.yml/badge.svg?v=1.0.0&cb=1)](https://github.com/kensnyder/url-forge/actions)
[![Code Coverage](https://codecov.io/gh/kensnyder/url-forge/branch/main/graph/badge.svg?v=1.0.0&cb=1)](https://codecov.io/gh/kensnyder/url-forge)
[![Gzipped Size](https://badgen.net/static/minzipped/0.5kb/green?v=1.0.0&cb=1)](https://bundlephobia.com/package/url-forge@1.0.0)
[![Dependency details](https://badgen.net/static/dependencies/0/green?v=1.0.0&cb=1)](https://www.npmjs.com/package/url-forge?activeTab=dependencies)
[![ISC License](https://badgen.net/github/license/kensnyder/url-forge?v=1.0.0&cb=1)](https://opensource.org/licenses/ISC)

`url-forge` is a lightweight, dependency-free TypeScript library providing a single simple function for constructing URLs by merging query parameters from objects, arrays of entries, or `URLSearchParams`.

```bash
npm install url-forge
```

## Usage

```ts
import { buildUrl } from 'url-forge';

// Object: overwrites existing parameters, supports arrays, sorted by name
buildUrl('/api/search?page=1', { sort: 'asc', filter: ['a', 'b'] });
// => "/api/search?filter=a&filter=b&page=1&sort=asc"

// Entries array: appends values, sorted by name
buildUrl('/api/search', [
  ['tag', 'js'],
  ['tag', 'ts'],
]);
// => "/api/search?tag=js&tag=ts"

// URLSearchParams: appends values, sorted by name
const params = new URLSearchParams({ q: 'hello' });
buildUrl('https://example.com/path#hash', params);
// => "https://example.com/path?q=hello#hash"
```

## Behavior

### Merging

Every input type merges into whatever query string the path already carries.
What differs is whether a name is overwritten or appended to.

| `queryObject` | Behavior | Reason |
| --- | --- | --- |
| Object | Overwrites the name | An object cannot express a repeated key |
| Array of entries | Appends to the name | Entries can express repeated keys |
| `URLSearchParams` | Appends to the name | Params can express repeated keys |

An object replaces every existing value for that name, whether you pass one
value or several. An empty array clears the name entirely.

```ts
buildUrl('/items?color=red', { color: 'blue' });
// => "/items?color=blue"

buildUrl('/items?color=red', { color: ['blue', 'green'] });
// => "/items?color=blue&color=green"

buildUrl('/items?color=red', { color: [] });
// => "/items"
```

Entries and `URLSearchParams` add to what is already there rather than
replacing it.

```ts
buildUrl('/items?color=red', [
  ['color', 'blue'],
  ['color', 'green'],
]);
// => "/items?color=red&color=blue&color=green"

buildUrl('/items?color=red', new URLSearchParams({ color: 'blue' }));
// => "/items?color=red&color=blue"
```

### Sorting

Parameters are always sorted by name, so a given set of inputs produces a
byte-identical URL no matter what order they were supplied in. That keeps cache
keys, request signatures, and snapshot comparisons stable.

```ts
buildUrl('/report', { to: '2026-01-31', from: '2026-01-01' });
buildUrl('/report', { from: '2026-01-01', to: '2026-01-31' });
// both => "/report?from=2026-01-01&to=2026-01-31"
```

Sorting applies to the merged result, so parameters already present on the path
are sorted too.

```ts
buildUrl('/items?z=1&a=2', { m: 3 });
// => "/items?a=2&m=3&z=1"
```

Sorting is by name only. Repeated values for the same name keep the order they
were supplied in, since that order is often meaningful.

```ts
buildUrl('/log', [
  ['at', '3'],
  ['id', 'x'],
  ['at', '1'],
  ['at', '2'],
]);
// => "/log?at=3&at=1&at=2&id=x"
```

### Values and omission

Values are coerced with `String()`, except `null`, which becomes an empty
string. Object properties set to `undefined` are skipped entirely, so an
optional parameter can be left out without any branching at the call site. A
`queryObject` of `null`, `false`, or `undefined` merges nothing.

### Encoding

The existing query string is re-encoded by `URLSearchParams`, so an equivalent
but not always identical encoding may come back — for example, `?a=%20b`
normalizes to `?a=+b`.

## Contributions and local development

[Bun](https://bun.sh) is required for testing and building the `url-forge` package.
