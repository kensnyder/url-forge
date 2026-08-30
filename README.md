# url-forge

[![NPM Link](https://badgen.net/npm/v/url-forge?v=1.1.0&cb=1)](https://npmjs.com/package/url-forge)
[![Language](https://badgen.net/static/language/TS?v=1.1.0&cb=1)](https://github.com/search?q=repo:kensnyder/url-forge++language:TypeScript&type=code)
[![Build Status](https://github.com/kensnyder/url-forge/actions/workflows/workflow.yml/badge.svg?v=1.1.0&cb=1)](https://github.com/kensnyder/url-forge/actions)
[![Code Coverage](https://codecov.io/gh/kensnyder/url-forge/branch/main/graph/badge.svg?v=1.1.0&cb=1)](https://codecov.io/gh/kensnyder/url-forge)
[![Gzipped Size](https://badgen.net/static/minzipped/3kb/green?v=1.1.0&cb=1)](https://bundlephobia.com/package/url-forge@1.1.0)
[![Tree Shakeable](https://badgen.net/static/tree%20shakeable/yes/green?v=1.1.0&cb=1)](https://bundlephobia.com/package/url-forge@1.1.0)
[![Dependency details](https://badgen.net/static/dependencies/0/green?v=1.1.0&cb=1)](https://www.npmjs.com/package/url-forge?activeTab=dependencies)
[![ISC License](https://badgen.net/github/license/kensnyder/url-forge?v=1.1.0&cb=1)](https://opensource.org/licenses/ISC)

`url-forge` is a lightweight, dependency-free TypeScript library with functions to construct urls.

```bash
npm install url-forge
```

## Usage

```ts
import { buildSearchParams, buildUrl, SafeURL } from 'url-forge';

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

// No path needed: get the URLSearchParams itself
const merged = buildSearchParams({ sort: 'asc', filter: ['a', 'b'] });
merged.getAll('filter'); // => ["a", "b"]
merged.toString(); // => "sort=asc&filter=a&filter=b"

// SafeURL: a URL that parses relative references instead of throwing
new URL('/api/search?page=1'); // throws TypeError
const url = new SafeURL('/api/search?page=1');
url.pathname; // => "/api/search"
url.hostname; // => "" (the input named no host)
url.searchParams.get('page'); // => "1"

// SafeURL: merge parameters into a URL you are holding
url.mergeSearchParams({ page: 2, sort: 'asc' });
url.href; // => "/api/search?page=2&sort=asc"

// SafeURL: or replace them outright
url.setSearchParams({ page: 3 });
url.href; // => "/api/search?page=3"
```

## API

### buildUrl(path, queryObject?)

Merges `queryObject` into `path` and returns a URL string. Any query string
already on `path` is merged, the hash is preserved, and the result is sorted by
parameter name.

| Argument | Type | Description |
| --- | --- | --- |
| `path` | `string \| URL` | Base path or URL. Its query string and hash are kept |
| `queryObject` | `QueryObject \| null \| false` | Parameters to merge. Nullish or `false` merges nothing |

### buildSearchParams(queryObject?, base?)

Merges `queryObject` into `base` and returns a new `URLSearchParams`. This is
the parameter-merging half of `buildUrl`, without any path handling.

| Argument | Type | Description |
| --- | --- | --- |
| `queryObject` | `QueryObject \| null \| false` | Parameters to merge. Nullish or `false` merges nothing |
| `base` | `string \| URLSearchParams` | Parameters to merge into. A leading `?` is allowed and ignored |

Neither argument is modified; a `URLSearchParams` passed as `base` is copied.
Unlike `buildUrl`, the returned params are raw — see
[Sorting](#sorting) below.

```ts
// Build params for a fetch body or a request you assemble yourself
const params = buildSearchParams({ grant_type: 'refresh_token', token });
await fetch('/oauth/token', { method: 'POST', body: params });

// Merge into params you already have
const existing = new URLSearchParams('page=1');
buildSearchParams({ page: 2 }, existing).toString();
// => "page=2"
```

### QueryObject

The type shared by both functions and by `mergeSearchParams` and
`setSearchParams`, exported for annotating your own helpers.

```ts
import type { QueryObject } from 'url-forge';

type QueryObject =
  | Record<string, unknown>
  | Array<[name: string, value?: unknown]>
  | URLSearchParams;
```

### new SafeURL(url, base?)

A `URL` that accepts relative references instead of throwing on them. It parses
every relative reference `URL` rejects, and reports an empty `hostname`, `host`,
`origin`, `protocol` and `port` when neither argument names a domain. See
[Parsing with SafeURL](#parsing-with-safeurl) below.

| Argument | Type | Description |
| --- | --- | --- |
| `url` | `Stringifiable` | The reference to parse. Absolute or relative |
| `base` | `Stringifiable` | Optional base to resolve against. Unlike `URL`, it may itself be relative |

`SafeURL` implements the whole `URL` interface — every getter and setter, plus
`toString()`, `toJSON()`, `SafeURL.canParse()` and `SafeURL.parse()` — so it can
be passed anywhere a `URL` is expected, `buildUrl` included.

```ts
buildUrl(new SafeURL('/api/search'), { sort: 'asc' });
// => "/api/search?sort=asc"
```

It adds three members of its own: `hasDomain`, described under
[Knowing whether there is a domain](#knowing-whether-there-is-a-domain), and
`mergeSearchParams` and `setSearchParams` below.

### url.mergeSearchParams(queryObject)

Merges `queryObject` into the parameters the URL already has, in place, and
returns the `SafeURL` so calls can be chained. It takes the same input types
`buildUrl` does and merges them by the same rules, but applies them to a URL you
are holding rather than to a string you are building, and leaves the result in
merge order instead of sorting it.

| Argument | Type | Description |
| --- | --- | --- |
| `queryObject` | `QueryObject` | Parameters to merge. An object overwrites, entries and `URLSearchParams` append |

```ts
const url = new SafeURL('/api/search?page=1');
url.mergeSearchParams({ page: 2, sort: 'asc' });
url.href; // => "/api/search?page=2&sort=asc"
```

The path and hash are untouched, and chained merges can mix the input types.

```ts
const url = new SafeURL('https://example.com/items?color=red#gallery')
  .mergeSearchParams({ color: 'blue' })
  .mergeSearchParams([['tag', 'new']]);
url.href; // => "https://example.com/items?color=blue&tag=new#gallery"
```

Merging follows the rules under [Merging](#merging), so an object replaces a
name and an empty array clears it.

```ts
const url = new SafeURL('/items?color=red');
url.mergeSearchParams({ color: [] });
url.href; // => "/items"
```

`queryObject` is never modified; only the `SafeURL` is. Passing a value that is
not one of the supported shapes throws a `TypeError`.

### url.setSearchParams(queryObject)

Replaces the parameters the URL has with `queryObject`, in place, and returns
the `SafeURL` so calls can be chained. It is `mergeSearchParams` with the
existing query dropped first: whatever was on the URL is discarded, so the
result holds exactly what you passed.

| Argument | Type | Description |
| --- | --- | --- |
| `queryObject` | `QueryObject` | Parameters to set. Anything already on the URL is discarded |

```ts
const url = new SafeURL('/api/search?page=1&sort=asc');
url.setSearchParams({ page: 2 });
url.href; // => "/api/search?page=2"
```

The merge rules still apply within `queryObject` itself, so entries and
`URLSearchParams` can still repeat a name — they just have nothing of the URL's
own to append to.

```ts
const url = new SafeURL('/items?color=red');
url.setSearchParams([
  ['color', 'blue'],
  ['color', 'green'],
]);
url.href; // => "/items?color=blue&color=green"
```

Passing nothing clears the query. The path and hash are untouched either way.

```ts
const url = new SafeURL('https://example.com/items?color=red#gallery');
url.setSearchParams({});
url.href; // => "https://example.com/items#gallery"
```

`queryObject` is never modified; only the `SafeURL` is. Passing a value that is
not one of the supported shapes throws a `TypeError`.

### Stringifiable

The type `SafeURL` accepts for both arguments, exported for annotating your own
helpers. A `URL`, a `SafeURL`, and anything else with a `toString` all qualify.

```ts
import type { Stringifiable } from 'url-forge';

type Stringifiable = string | { toString: () => string };
```

## Behavior

Merging, value coercion, and encoding work identically in both functions and in
`SafeURL#mergeSearchParams` and `SafeURL#setSearchParams`. Only sorting differs,
along with what each one merges into.

### Merging

Every input type merges into whatever parameters are already there — the query
string on the path for `buildUrl`, the `base` argument for `buildSearchParams`,
or the query already on the URL for `SafeURL#mergeSearchParams`.
`SafeURL#setSearchParams` is the exception: it discards the URL's query first,
so its input merges into nothing. What differs is whether a name is overwritten
or appended to.

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

The same rules apply to the `base` argument of `buildSearchParams`.

```ts
buildSearchParams({ color: 'blue' }, 'color=red').toString();
// => "color=blue"

buildSearchParams([['color', 'blue']], 'color=red').toString();
// => "color=red&color=blue"
```

### Sorting

`buildUrl` always sorts parameters by name, so a given set of inputs produces a
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

`buildSearchParams` returns the params raw, in merge order, because the caller
may care about that order or may be handing the params to something that sorts
on its own. Call `.sort()` yourself when you want the stable ordering.

```ts
buildSearchParams({ b: 2, a: 1 }).toString();
// => "b=2&a=1"

const params = buildSearchParams({ b: 2, a: 1 });
params.sort();
params.toString();
// => "a=1&b=2"
```

`SafeURL#mergeSearchParams` and `SafeURL#setSearchParams` leave the order alone
for the same reason. Sort through the live `searchParams` when you want it
stable.

```ts
const url = new SafeURL('/report');
url.mergeSearchParams({ to: '2026-01-31', from: '2026-01-01' });
url.search; // => "?to=2026-01-31&from=2026-01-01"

url.searchParams.sort();
url.search; // => "?from=2026-01-01&to=2026-01-31"
```

### Values and omission

Values are coerced with `String()`, except `null`, which becomes an empty
string. Object properties set to `undefined` are skipped entirely, so an
optional parameter can be left out without any branching at the call site. A
`queryObject` of `null`, `false`, or `undefined` merges nothing.

A `queryObject` that is not one of the supported shapes — a string or a number,
for instance — throws a `TypeError`, as does an entry array containing an empty
entry.

### Encoding

Existing parameters are re-encoded by `URLSearchParams`, so an equivalent but
not always identical encoding may come back — for example, `?a=%20b`
normalizes to `?a=+b`.

## Parsing with SafeURL

`URL` throws on anything without a scheme and an authority, so many of the
references a real application handles — `/api/search`, `../sibling`, `?page=2` —
cannot go through it at all, and the ones that can have to be wrapped in a
`try`.

`SafeURL` accepts all of them. Domain-less references are parsed against a
private origin that no accessor ever exposes, so a reference that named no
domain reports no domain rather than an invented one.

```ts
new URL('/api/search'); // throws TypeError
new SafeURL('/api/search').pathname; // => "/api/search"
new SafeURL('/api/search').hostname; // => ""
```

Anything `URL` already accepts is handed straight to it, so absolute URLs behave
exactly as they always have, opaque schemes included.

```ts
const url = new SafeURL('https://user:pw@example.com:8080/a/b?x=1#h');
url.origin; // => "https://example.com:8080"
url.host; // => "example.com:8080"
url.port; // => "8080"
url.pathname; // => "/a/b"

new SafeURL('mailto:me@example.com').protocol; // => "mailto:"
new SafeURL('mailto:me@example.com').pathname; // => "me@example.com"
```

### Leading slashes

How a reference begins is what separates a host from a path, and `SafeURL`
preserves that distinction — including the absence of a leading slash, which
`URL` has no way to represent.

| Input | Meaning | `hostname` | `pathname` |
| --- | --- | --- | --- |
| `//localhost` | Protocol-relative, so `localhost` is a host | `"localhost"` | `"/"` |
| `/localhost` | Absolute path, no host | `""` | `"/localhost"` |
| `localhost` | Relative path, no host | `""` | `"localhost"` |

A protocol-relative reference is exactly the URL it would be with a scheme
attached, so `//localhost` and `http://localhost` parse alike.

```ts
new SafeURL('//localhost').href; // => "http://localhost/"
new SafeURL('//localhost/a/b').hostname; // => "localhost"
```

A relative path stays relative through resolution, so `pathname` and `href`
give back what you put in.

```ts
new SafeURL('a/b/c').pathname; // => "a/b/c"
new SafeURL('./a/b').pathname; // => "a/b"
new SafeURL('a/../b').pathname; // => "b"
```

### Domain-less references

While there is no domain, every accessor that describes one reads as an empty
string, and `href` is just the path, query and hash.

```ts
const url = new SafeURL('/a/b?x=1#h');
url.protocol; // => ""
url.host; // => ""
url.hostname; // => ""
url.port; // => ""
url.origin; // => ""
url.username; // => ""
url.password; // => ""

url.pathname; // => "/a/b"
url.search; // => "?x=1"
url.hash; // => "#h"
url.href; // => "/a/b?x=1#h"
```

References with no path at all are preserved just as faithfully.

```ts
new SafeURL('').href; // => ""
new SafeURL('?x=1').href; // => "?x=1"
new SafeURL('#h').href; // => "#h"
new SafeURL('/').href; // => "/"
```

### Relative bases

`URL` requires an absolute base, which makes it useless for resolving one
relative reference against another. `SafeURL` accepts a base of any shape, and
the result keeps the shape of whichever argument determined it.

```ts
new SafeURL('c', 'a/b').href; // => "a/c"
new SafeURL('c', '/a/b').href; // => "/a/c"
new SafeURL('/c', 'a/b').href; // => "/c"
```

A domain reaches the result from wherever it appears, base included.

```ts
new SafeURL('c', '//example.com/a/b').href; // => "http://example.com/a/c"
new SafeURL('c', 'https://example.com/a/b').href; // => "https://example.com/a/c"
new SafeURL('//other.com/a', 'https://example.com/b').href;
// => "https://other.com/a"
```

### Knowing whether there is a domain

An empty `hostname` is ambiguous on its own: `mailto:` URLs have one too. The
`hasDomain` property answers the question directly.

```ts
new SafeURL('https://example.com').hasDomain; // => true
new SafeURL('//example.com').hasDomain; // => true
new SafeURL('a', '//example.com/b').hasDomain; // => true

new SafeURL('/a/b').hasDomain; // => false
new SafeURL('a/b').hasDomain; // => false
new SafeURL('').hasDomain; // => false
```

### Mutation

Every `URL` setter works, and `searchParams` is live in the same way.

```ts
const url = new SafeURL('/a');
url.searchParams.set('x', '1');
url.searchParams.append('y', '2');
url.href; // => "/a?x=1&y=2"
```

[`mergeSearchParams`](#urlmergesearchparamsqueryobject) merges a whole
`queryObject` in one call, taking the same input types `buildUrl` does.

```ts
const url = new SafeURL('/a?x=1');
url.mergeSearchParams({ x: 2, y: 3 });
url.href; // => "/a?x=2&y=3"
```

[`setSearchParams`](#urlsetsearchparamsqueryobject) takes the same input types
but replaces the query instead of merging into it.

```ts
const url = new SafeURL('/a?x=1');
url.setSearchParams({ y: 3 });
url.href; // => "/a?y=3"
```

Assigning a `hostname` or `host` gives a domain-less URL a domain. Assigning an
empty one takes it away — something `URL` silently refuses to do.

```ts
const relative = new SafeURL('/a/b');
relative.hostname = 'example.com';
relative.href; // => "http://example.com/a/b"

const absolute = new SafeURL('https://example.com/a/b?x=1');
absolute.hostname = '';
absolute.href; // => "/a/b?x=1"
```

Assigning a `pathname` re-reads its leading slash, so a path can be moved
between the rooted and relative shapes.

```ts
const url = new SafeURL('/a/b');
url.pathname = 'c/d';
url.href; // => "c/d"
```

Assigning `href` re-parses from scratch under the same rules, so unlike `URL` it
accepts a relative value.

```ts
const url = new SafeURL('https://example.com/a');
url.href = 'c/d?x=1';
url.hostname; // => ""
url.href; // => "c/d?x=1"
```

A `protocol` or `port` assigned while there is no domain is remembered but stays
hidden, since a scheme without an authority describes nothing. It surfaces once
a host makes it meaningful.

```ts
const url = new SafeURL('/a');
url.protocol = 'https:';
url.protocol; // => ""

url.hostname = 'example.com';
url.protocol; // => "https:"
url.href; // => "https://example.com/a"
```

### It accepts relative references instead of throwing

Where `URL` rejects a reference for having no scheme and authority, `SafeURL`
parses it. Malformed input is salvaged rather than rejected wherever it can be,
and round-trips through `href` wherever the text allows.

```ts
new SafeURL('http://').href; // => "http://"
new SafeURL('//').href; // => "//"
new SafeURL('ws://').href; // => "ws://"
new SafeURL('http://[').href; // => "http://["
```

`SafeURL.canParse` exists for parity with `URL.canParse` and is `true` for every
string. It returns `false` for a value that cannot be converted to a string at
all — an object with a throwing `toString`, or one created with
`Object.create(null)`.

```ts
SafeURL.canParse('https://example.com'); // => true
SafeURL.canParse('/a/b'); // => true
SafeURL.canParse(''); // => true
SafeURL.canParse(Object.create(null)); // => false
```

`SafeURL.parse` mirrors `URL.parse`, except that it never returns `null`.

```ts
SafeURL.parse('a/b', '/c/').href; // => "/c/a/b"
```

## Contributions and local development

[Bun](https://bun.sh) is required for testing and building the `url-forge` package.
