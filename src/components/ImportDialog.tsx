import { useEffect, useState } from 'react';
import { parseMermaid, ParseError, type ParseIssue } from '../mermaid/parse';
import { useGraphStore } from '../model/store';
import { Modal } from './Modal';

export function ImportDialog() {
  const open = useGraphStore((s) => s.importOpen);
  const hasContent = useGraphStore((s) => s.nodes.length > 0);
  const { setImportOpen, importGraph } = useGraphStore.getState();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ParseIssue[] | null>(null);

  useEffect(() => {
    if (open) {
      setText('');
      setError(null);
      setIssues(null);
    }
  }, [open]);

  const close = () => setImportOpen(false);

  const run = () => {
    try {
      const { graph, issues } = parseMermaid(text);
      importGraph(graph);
      if (issues.length) setIssues(issues);
      else close();
      setError(null);
    } catch (e) {
      setIssues(null);
      setError(e instanceof ParseError ? e.message : 'Could not read that text.');
    }
  };

  return (
    <Modal open={open} title="Import Mermaid" onClose={close}>
      {issues ? (
        <>
          <p>
            Imported, but {issues.length} line{issues.length === 1 ? ' was' : 's were'} skipped or only partly read:
          </p>
          <ul className="issues">
            {issues.map((i, n) => (
              <li key={n}>
                <code>
                  line {i.line}: {i.text}
                </code>
                <span>{i.reason}</span>
              </li>
            ))}
          </ul>
          <div className="modal-actions">
            <button className="btn primary" data-autofocus onClick={close}>
              Close
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="muted">
            Paste a flowchart or load a file.
            {hasContent && ' This replaces the current diagram (you can undo it).'}
          </p>
          <textarea
            className="code-input"
            aria-label="Mermaid text"
            data-autofocus
            spellCheck={false}
            placeholder={'flowchart TD\n    A[Start] --> B{Ok?}\n    B -->|yes| C[Done]'}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input
            type="file"
            accept=".mmd,.mermaid,.md,.txt,text/plain"
            aria-label="Load a Mermaid file"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setText(await f.text());
              e.target.value = '';
            }}
          />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button className="btn" onClick={close}>
              Cancel
            </button>
            <button className="btn primary" disabled={text.trim() === ''} onClick={run}>
              Import
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
