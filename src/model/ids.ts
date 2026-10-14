/** A, B, ... Z, A1, B1, ... — the first id not already taken. */
export function nextNodeId(taken: Iterable<string>): string {
  const used = new Set(taken);
  for (let i = 0; ; i++) {
    const id = String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '');
    if (!used.has(id)) return id;
  }
}

let edgeCounter = 0;
export function newEdgeId(): string {
  return `e${Date.now().toString(36)}${(edgeCounter++).toString(36)}`;
}

/** Move `start` down until a node-sized box there would not overlap an existing node. */
export function findFreePosition(
  taken: { x: number; y: number }[],
  start: { x: number; y: number },
): { x: number; y: number } {
  const p = { ...start };
  while (taken.some((t) => Math.abs(t.x - p.x) < 160 && Math.abs(t.y - p.y) < 72)) p.y += 84;
  return p;
}
