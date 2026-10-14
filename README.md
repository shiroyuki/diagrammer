# diagrammer
Visually draw a Mermaid-based diagram.

A single-page flowchart editor: draw nodes and connections on a canvas, then export, preview, or import Mermaid text.

## Run
```sh
npm install
npm run dev      # prints the URL (default http://localhost:5173; the next free port if that is taken)
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Typecheck and production build into `dist/` |
| `npm test` | Unit and component tests (Vitest) |

## Using it
- **Add node** in the toolbar. Double-click a node to edit its label.
- **Drag from a node's edge handle onto another node** to connect them.
- Select a node to show its **⋮** menu (shape, style, delete). Select an edge to show its **⚙** button (line, arrowhead, color, label).
- Click, Shift/Cmd/Ctrl-click, or drag a box to select. **Delete/Backspace** asks before deleting. **Cmd/Ctrl+C / X / V** copy, cut and paste nodes (pasted nodes have no connections). **Cmd/Ctrl+Z** undoes.
- The side panel shows the generated **Mermaid** text (copy or download `.mmd`) and a live **Preview**. **Import…** loads Mermaid text or a file.
- The theme button cycles System, Light and Dark. The diagram is saved in your browser automatically.

Design notes: [docs/plans/001-initial-poc.md](docs/plans/001-initial-poc.md)
