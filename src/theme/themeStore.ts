import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const KEY = 'diagrammer.theme';
const ORDER: ThemeMode[] = ['system', 'light', 'dark'];

const systemDark = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
const resolve = (m: ThemeMode): ResolvedTheme => (m === 'system' ? (systemDark() ? 'dark' : 'light') : m);

function readMode(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return 'system';
}

function apply(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

interface ThemeState {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (m: ThemeMode) => void;
  cycle: () => void;
}

export const useThemeStore = create<ThemeState>()((set, get) => {
  const mode = readMode();
  return {
    mode,
    resolved: resolve(mode),
    setMode: (m) => {
      try {
        localStorage.setItem(KEY, m);
      } catch {
        /* ignore */
      }
      const resolved = resolve(m);
      apply(resolved);
      set({ mode: m, resolved });
    },
    cycle: () => get().setMode(ORDER[(ORDER.indexOf(get().mode) + 1) % ORDER.length]),
  };
});

/** Apply the current theme and follow OS changes while in "system" mode. */
export function startTheme(): void {
  apply(useThemeStore.getState().resolved);
  if (typeof matchMedia !== 'function') return;
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { mode } = useThemeStore.getState();
    if (mode !== 'system') return;
    const resolved = resolve(mode);
    apply(resolved);
    useThemeStore.setState({ resolved });
  });
}
