import { useMemo, useState } from 'react';
import { serialize } from '../mermaid/serialize';
import { toGraph, useGraphStore } from '../model/store';
import { Preview } from './Preview';

type Tab = 'text' | 'preview';

export function MermaidPanel() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const direction = useGraphStore((s) => s.direction);
  const [tab, setTab] = useState<Tab>('text');
  const [copied, setCopied] = useState<'ok' | 'failed' | null>(null);

  const text = useMemo(() => serialize(toGraph(nodes, edges, direction)), [nodes, edges, direction]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied('ok');
    } catch {
      setCopied('failed');
    }
    setTimeout(() => setCopied(null), 1500);
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.mmd';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="side" aria-label="Mermaid">
      <div className="tabs" role="tablist">
        {(['text', 'preview'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t === 'text' ? 'Mermaid' : 'Preview'}
          </button>
        ))}
      </div>
      {tab === 'text' ? (
        <div className="tab-body">
          <div className="row">
            <button className="btn" onClick={copy}>
              {copied === 'ok' ? 'Copied' : copied === 'failed' ? 'Copy failed' : 'Copy'}
            </button>
            <button className="btn" onClick={download}>
              Download .mmd
            </button>
            <button className="btn" onClick={() => useGraphStore.getState().setImportOpen(true)}>
              Import…
            </button>
          </div>
          <textarea className="code-output" aria-label="Generated Mermaid" readOnly spellCheck={false} value={text} />
        </div>
      ) : (
        <div className="tab-body">
          <Preview text={text} empty={nodes.length === 0} />
        </div>
      )}
    </aside>
  );
}
