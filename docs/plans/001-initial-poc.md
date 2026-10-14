# 001 — Initial PoC: Mermaid flowchart editor (SPA)

Status: implemented (milestones 1-7). See "Deviations" at the end.

## Goal
A single-page app where a user draws a flowchart on a canvas and converts to and from Mermaid text, with a live Mermaid preview.

## Stack
- Vite + React + TypeScript
- React Flow (`@xyflow/react`) for the canvas, nodes, handles and edges
- `mermaid` for the preview render
- Zustand for the store (single source of truth)
- dagre for auto-layout on import
- Vitest for parser and serializer tests

## Model
`{ nodes[{id, label, shape, style, position}], edges[{id, from, to, label?, style?}], direction }`

The canvas, the Mermaid text and the preview are all views of this model.

```
src/
  model/        types.ts, store.ts
  mermaid/      serialize.ts (model -> text), parse.ts (text -> model)
  components/   Canvas, FlowNode, FlowEdge, Toolbar, StyleDialog,
                EdgePopover, ConfirmDialog, MermaidPanel, Preview
  theme/        tokens.css, themeStore.ts
```

## Features

### Nodes
- Toolbar "Add node" button adds a node at a free position with an auto id (`A`, `B`, ...) and a default label.
- Double-click edits the label.
- Node shapes: rectangle, rounded, stadium, circle, diamond, hexagon, parallelogram. These map to `A[..]`, `A(..)`, `A([..])`, `A((..))`, `A{..}`, `A{{..}}`, `A[/../]`.
- Node style: fill, stroke, stroke width, text color. Exported as `style A fill:#..,stroke:#..`.

### Edges
- Drag from one node's handle to another to create an edge.
- Edge properties: line style (solid, dashed, dotted), thickness, arrowhead (arrow, none, circle, cross), color, label, delete.
- Link types map to `-->`, `---`, `-.->`, `==>`, `--o`, `--x`.
- Colors are exported as `linkStyle <index> stroke:#..,stroke-width:..`, indexed by export order.
- A wide invisible stroke (~20px) makes thin edges easy to click.

### Selection and property buttons
- Click selects one. Shift/Cmd/Ctrl-click toggles. Drag a box on empty canvas to select many. Cmd/Ctrl+A selects all. Esc or an empty-canvas click clears the selection.
- Nodes and edges share one selection model, kept in the store.
- Dragging one selected node moves every selected node.
- The node vertical-dots (⋮) button and the edge property button render only while their node or edge is selected.
- With several nodes selected, shape and style changes apply to all of them.
- When the selection clears, buttons disappear and open menus or popovers close.

### Delete
- Delete or Backspace with a selection opens a confirmation dialog, for example "Delete N node(s) and M connection(s)?". It also covers selected edges and mixed selections.
- Confirming removes the nodes and every edge attached to them.
- The dialog's focus defaults to Cancel.
- React Flow's built-in delete is turned off (`deleteKeyCode={null}`).
- Shortcuts are ignored while a text field has focus.
- The ⋮ menu's Delete item uses the same dialog.

### Copy, cut, paste
- Cmd/Ctrl+C copies the selected nodes (label, shape, style, relative positions) to an in-app clipboard, and also writes the Mermaid snippet to the system clipboard as text.
- Cmd/Ctrl+X copies, then goes through the delete confirmation.
- Cmd/Ctrl+V pastes new nodes with new unique ids, offset about 24px per repeated paste. The pasted nodes become the selection.
- Pasted nodes have no connections. Only nodes are copied, so even edges between two copied nodes are dropped.
- Undo/redo (Cmd/Ctrl+Z) covers add, delete, paste and style changes.

### Mermaid import, export, preview
- Export: a panel shows the generated text, with Copy and Download `.mmd`.
- Import: a textarea or file picker parses the text into the model. Supported:
  - `flowchart` and `graph` with a direction (TD, LR, ...)
  - the node shapes above
  - `-->`, `---`, `-.->`, `==>`, `--o`, `--x` links with labels
  - `style` and `linkStyle` lines
- Unrecognized lines produce a clear error and a list of skipped lines, never silent failure.
- Imported graphs are positioned with dagre.
- Preview: debounced `mermaid.render()` of the current text, with syntax errors shown inline.
- Text editing is one-way. The text pane is read-only, and changes come in through an explicit Import button.

### Theme (light, dark, system)
- CSS custom property tokens on `:root`, overridden under `[data-theme="dark"]`.
- A toolbar toggle cycles System, Light, Dark. The default is System and it follows `prefers-color-scheme` live.
- An explicit choice is saved in `localStorage` (wrapped in try/catch).
- A tiny inline script sets `data-theme` before React mounts, to avoid a flash.
- React Flow `colorMode` is driven from the same theme state.
- Mermaid is re-initialized with `theme: 'default'` or `'dark'` on a theme change and then re-rendered.
- Custom node and edge colors are explicit and never inverted. Theme colors are never written into exported Mermaid, so exports stay portable.

### Persistence
- Autosave the model to `localStorage`.

## Out of scope for v1
- Subgraphs, click events, and non-flowchart diagram types.
- Reordering nodes (stacking or declaration order), explicitly dropped.
- Two-way live editing of the Mermaid text.

## Milestones
1. Scaffold, model, store, theme tokens, no-flash script.
2. Canvas, add node, label editing, edge drawing, multi-select, edge selection and hit area.
3. Shapes, ⋮ menu, style dialog, selection-only property buttons, edge popover, delete confirmation.
4. Copy, cut, paste, undo/redo.
5. Serializer (including `linkStyle` and link types), export panel, live preview with theme-aware Mermaid.
6. Parser (including `linkStyle`), import, auto-layout.
7. Tests and polish.

## Tests (Vitest)
- Round-trip `serialize(parse(text))` for every shape and link type, including `style` and `linkStyle`.
- Delete cascades to attached edges.
- Pasted nodes have no edges and ids never collide.
- Property buttons are hidden when their node or edge is not selected.
- An edge-style change can be undone.
- Shortcuts are ignored while a text field has focus.
- Manual check of both themes for contrast, with a screenshot of each.

## Defaults (confirm or change)
- Multi-selection applies shape and style changes to every selected node.
- `linkStyle` indexes follow export order.
- Flowcharts only.
- Undo/redo included.

## Deviations from the plan
- **Edge line style** is solid, dotted or thick (the three line types Mermaid has), instead of dashed plus a separate thickness control. Mermaid cannot express "dashed", and thick is its own link type (`==>`). Edge colors are exported with `linkStyle`.
- **Readable text on custom fills.** A node with a custom fill and no explicit text color gets a dark or light text color chosen from the fill, on the canvas and in the exported `style` line (`color:`). Without this, light-on-light text appears in dark theme.
- **No duplicate connections.** Dragging a second A to B connection is ignored.
- **New nodes stack downward** from the viewport center so they never overlap.
- **Extras added:** direction selector, Auto-layout button, Cmd/Ctrl+Y redo.

## Known limitations
- Back edges (for example `D --> S` in a left-to-right flow) are drawn as plain curves and can pass behind nodes.
- The parser reports but skips subgraphs, `classDef`/`class`, `click`, the `&` operator and `linkStyle default`.
- `linkStyle` stroke width is read but not kept; thickness comes from the `==>` link type.
