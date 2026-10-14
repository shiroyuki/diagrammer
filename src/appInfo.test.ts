import { describe, expect, it } from 'vitest';
import pkg from '../package.json';
import { APP_INFO, authorName } from './appInfo';

describe('authorName', () => {
  it('handles the package.json author forms', () => {
    expect(authorName('Jane Doe')).toBe('Jane Doe');
    expect(authorName('Jane Doe <jane@example.com> (https://example.com)')).toBe('Jane Doe');
    expect(authorName({ name: 'Jane Doe' })).toBe('Jane Doe');
    expect(authorName(undefined)).toBe('');
  });
});

describe('APP_INFO', () => {
  it('comes from package.json', () => {
    expect(APP_INFO.version).toBe(pkg.version);
    expect(APP_INFO.license).toBe(pkg.license);
    expect(APP_INFO.name.toLowerCase()).toBe(pkg.name);
    expect(APP_INFO.author).toBe(authorName(pkg.author));
  });
});
