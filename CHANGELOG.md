# Changelog

## 1.1.0 - Aug 29, 2026

Changed

- Query parameters are now always sorted by name so that a given set of inputs
  produces a byte-identical URL. Repeated values for the same name keep their
  insertion order.
- Object values that are arrays now overwrite an existing parameter of the same
  name instead of appending to it, matching the behavior of scalar values. An
  empty array clears the parameter.
- Invalid `queryObject` values now throw a `TypeError` rather than an `Error`.
  The message is unchanged.
- A malformed entry such as `[[]]` now throws instead of producing a parameter
  literally named `undefined`. Entry names that are not strings are coerced
  with `String()`.

Fixed

- A fragment containing additional `#` characters is no longer truncated at the
  second `#`.
- A query string containing a `?` is no longer truncated at the second `?`.

## 1.0.0 - Aug 29, 2026

- Initial release
