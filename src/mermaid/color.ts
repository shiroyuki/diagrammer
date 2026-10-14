const DARK = '#111827';
const LIGHT = '#ffffff';

function rgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Text color that stays readable on a custom fill, whatever the app theme is.
 * Returns undefined for fills we can't read (named colors), so the theme default applies.
 */
export function readableTextColor(fill: string | undefined): string | undefined {
  const c = fill ? rgb(fill) : null;
  if (!c) return undefined;
  const fillL = luminance(c);
  const contrast = (l: number) => (Math.max(fillL, l) + 0.05) / (Math.min(fillL, l) + 0.05);
  return contrast(luminance(rgb(DARK)!)) >= contrast(luminance(rgb(LIGHT)!)) ? DARK : LIGHT;
}
