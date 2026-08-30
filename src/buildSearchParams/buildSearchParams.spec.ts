import { describe, expect, it } from 'bun:test';
import buildSearchParams from './buildSearchParams';

describe('buildSearchParams', () => {
  it('should return empty params when called with no arguments', () => {
    const params = buildSearchParams();
    expect(params).toBeInstanceOf(URLSearchParams);
    expect(params.toString()).toBe('');
  });

  it('should merge an object queryObject', () => {
    const params = buildSearchParams({ name: 'alice', age: 30 });
    expect(params.toString()).toBe('name=alice&age=30');
  });

  it('should overwrite an existing parameter when using object', () => {
    const params = buildSearchParams({ name: 'alice' }, 'name=bob');
    expect(params.toString()).toBe('name=alice');
  });

  it('should ignore undefined values in object queryObject', () => {
    const params = buildSearchParams({ age: undefined }, 'name=bob');
    expect(params.toString()).toBe('name=bob');
  });

  it('should support array values in object queryObject', () => {
    const params = buildSearchParams({ tag: ['admin', 'active'] });
    expect(params.getAll('tag')).toEqual(['admin', 'active']);
  });

  it('should overwrite an existing parameter with array values', () => {
    const params = buildSearchParams({ tag: ['admin', 'active'] }, 'tag=guest');
    expect(params.getAll('tag')).toEqual(['admin', 'active']);
  });

  it('should clear an existing parameter given an empty array', () => {
    const params = buildSearchParams({ tag: [] }, 'tag=guest');
    expect(params.toString()).toBe('');
  });

  it('should append entries instead of overwriting', () => {
    const params = buildSearchParams(
      [
        ['filter', 'new'],
        ['filter', 'popular'],
      ],
      'filter=old'
    );
    expect(params.getAll('filter')).toEqual(['old', 'new', 'popular']);
  });

  it('should append URLSearchParams instead of overwriting', () => {
    const params = buildSearchParams(
      new URLSearchParams([
        ['k', 'v1'],
        ['k', 'v2'],
      ]),
      'k=v0'
    );
    expect(params.getAll('k')).toEqual(['v0', 'v1', 'v2']);
  });

  it('should allow entries without a value', () => {
    const params = buildSearchParams([['preview']]);
    expect(params.toString()).toBe('preview=');
  });

  it('should coerce non-string entry names', () => {
    // @ts-expect-error entry names are typed as strings but coerced at runtime
    const params = buildSearchParams([[42, 'answer']]);
    expect(params.toString()).toBe('42=answer');
  });

  it('should stringify boolean values', () => {
    const params = buildSearchParams({ active: true, archived: false });
    expect(params.toString()).toBe('active=true&archived=false');
  });

  it('should treat null values as empty strings', () => {
    const params = buildSearchParams({ q: null });
    expect(params.toString()).toBe('q=');
  });

  it('should merge nothing for a falsy queryObject', () => {
    expect(buildSearchParams(null, 'a=1').toString()).toBe('a=1');
    expect(buildSearchParams(false, 'a=1').toString()).toBe('a=1');
    expect(buildSearchParams(undefined, 'a=1').toString()).toBe('a=1');
  });

  it('should return raw unsorted params', () => {
    const params = buildSearchParams({ b: 2, a: 1, c: 3 });
    expect(params.toString()).toBe('b=2&a=1&c=3');
  });

  it('should keep base parameters unsorted as well', () => {
    const params = buildSearchParams({ m: 3 }, 'z=1&a=2');
    expect(params.toString()).toBe('z=1&a=2&m=3');
  });

  it('should accept a base with a leading question mark', () => {
    const params = buildSearchParams({ b: 2 }, '?a=1');
    expect(params.toString()).toBe('a=1&b=2');
  });

  it('should accept a URLSearchParams base without modifying it', () => {
    const base = new URLSearchParams('a=1');
    const params = buildSearchParams({ b: 2 }, base);
    expect(params).not.toBe(base);
    expect(params.toString()).toBe('a=1&b=2');
    expect(base.toString()).toBe('a=1');
  });

  it('should not modify a URLSearchParams queryObject', () => {
    const queryObject = new URLSearchParams('b=2');
    const params = buildSearchParams(queryObject, 'a=1');
    expect(params).not.toBe(queryObject);
    expect(queryObject.toString()).toBe('b=2');
  });

  it('should throw error for non-object queryObject', () => {
    expect(() => {
      // @ts-expect-error queryObject must be an object, entries, or params
      buildSearchParams('invalid');
    }).toThrow(
      'Invalid queryObject. Expected object, array of entries, or URLSearchParams.'
    );
  });

  it('should throw error for a malformed entry', () => {
    expect(() => {
      // @ts-expect-error entries must have at least a name
      buildSearchParams([[]]);
    }).toThrow(
      'Invalid queryObject. Expected object, array of entries, or URLSearchParams.'
    );
  });
});
