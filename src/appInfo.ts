// Named imports keep the bundler from pulling the rest of package.json (dependencies, scripts) into the app.
import { author, license, name, version } from '../package.json';

/** "Jane Doe <jane@example.com> (https://example.com)" -> "Jane Doe" */
export function authorName(a: string | { name?: string } | undefined): string {
  const raw = typeof a === 'string' ? a : (a?.name ?? '');
  return raw.replace(/<[^>]*>|\([^)]*\)/g, '').trim();
}

const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const APP_INFO = {
  name: title(name),
  version,
  license,
  author: authorName(author),
};
