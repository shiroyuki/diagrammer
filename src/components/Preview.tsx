import { useEffect, useRef, useState } from 'react';
import { useThemeStore } from '../theme/themeStore';

let counter = 0;

/** Debounced Mermaid render of `text`, re-rendered with the matching theme. */
export function Preview({ text, empty }: { text: string; empty: boolean }) {
  const theme = useThemeStore((s) => s.resolved);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  useEffect(() => {
    if (empty) {
      setSvg('');
      setError(null);
      return;
    }
    const run = ++latest.current;
    const timer = setTimeout(async () => {
      const id = `mmd-${++counter}`;
      try {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: theme === 'dark' ? 'dark' : 'default' });
        await mermaid.parse(text);
        const out = await mermaid.render(id, text);
        if (run !== latest.current) return;
        setSvg(out.svg);
        setError(null);
      } catch (e) {
        document.getElementById(`d${id}`)?.remove(); // mermaid leaves its error graphic behind
        if (run !== latest.current) return;
        setError(e instanceof Error ? e.message : String(e));
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [text, theme, empty]);

  if (empty) return <p className="muted pad">The preview appears once there is something to draw.</p>;
  return (
    <div className="preview">
      {error && (
        <pre className="error" role="alert">
          {error}
        </pre>
      )}
      <div className="preview-svg" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
