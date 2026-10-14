import {
  DEFAULT_EDGE_STYLE,
  DIRECTIONS,
  type Direction,
  type EdgeStyle,
  type Graph,
  type GraphEdge,
  type GraphNode,
  type NodeStyle,
} from '../model/types';
import { LINK_TOKENS, NODE_OPENERS } from './serialize';

export interface ParseIssue {
  line: number;
  text: string;
  reason: string;
}
export interface ParseResult {
  graph: Graph;
  issues: ParseIssue[];
}
/** Fatal: the text is not a flowchart we can read at all. */
export class ParseError extends Error {}

const LINK_LOOKUP = new Map<string, EdgeStyle>();
for (const [line, arrows] of Object.entries(LINK_TOKENS)) {
  for (const [arrow, token] of Object.entries(arrows)) {
    LINK_LOOKUP.set(token, { ...DEFAULT_EDGE_STYLE, line: line as EdgeStyle['line'], arrow: arrow as EdgeStyle['arrow'] });
  }
}
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&');
const TOKENS = [...LINK_LOOKUP.keys()].sort((a, b) => b.length - a.length).map(escapeRe).join('|');
const PLAIN_LINK = new RegExp(`(${TOKENS})\\s*(?:\\|\\s*(?:"([^"]*)"|([^|]*?))\\s*\\|)?\\s*`, 'y');
const TEXT_LINK = /(--|-\.|==)\s+(.+?)\s+(-->|---|--o|--x|\.->|\.-o|\.-x|\.-|==>|===|==o|==x)\s*/y;
const ID = /[A-Za-z0-9_\u0080-￿]+/y;
const COLOR = /^(#[0-9a-f]{3,8}|[a-z]+)$/i;

const unescapeLabel = (s: string) => s.replace(/#quot;/g, '"').replace(/<br\s*\/?>/gi, '\n');

function sticky(re: RegExp, s: string, pos: number): RegExpExecArray | null {
  re.lastIndex = pos;
  return re.exec(s);
}

/** Split on `;` outside of quotes. */
function splitStatements(line: string): string[] {
  const parts: string[] = [];
  let cur = '';
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    if (ch === ';' && !quoted) {
      parts.push(cur);
      cur = '';
    } else cur += ch;
  }
  parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

interface ParsedNode {
  id: string;
  label?: string;
  shape?: GraphNode['shape'];
}

function parseNode(s: string, pos: number): { node: ParsedNode; end: number } {
  const m = sticky(ID, s, pos);
  if (!m) throw new Error(`expected a node id near "${s.slice(pos, pos + 12)}"`);
  const id = m[0];
  let p = pos + id.length;
  for (const { open, close, shape } of NODE_OPENERS) {
    if (!s.startsWith(open, p)) continue;
    const start = p + open.length;
    let rest = start;
    while (s[rest] === ' ') rest++;
    let label: string;
    let closeAt: number;
    if (s[rest] === '"') {
      const q = s.indexOf('"', rest + 1);
      if (q < 0) throw new Error('unterminated quoted label');
      label = s.slice(rest + 1, q);
      closeAt = s.indexOf(close, q + 1);
    } else {
      closeAt = s.indexOf(close, start);
      label = closeAt < 0 ? '' : s.slice(start, closeAt).trim();
    }
    if (closeAt < 0) throw new Error(`missing "${close}" for node ${id}`);
    return { node: { id, label: unescapeLabel(label), shape }, end: closeAt + close.length };
  }
  return { node: { id }, end: p };
}

function parseStyleProps(
  text: string,
  onIssue: (reason: string) => void,
): { fill?: string; stroke?: string; strokeWidth?: number; color?: string } {
  const out: { fill?: string; stroke?: string; strokeWidth?: number; color?: string } = {};
  for (const pair of text.split(/,(?![^(]*\))/)) {
    const i = pair.indexOf(':');
    if (i < 0) {
      if (pair.trim()) onIssue(`ignored "${pair.trim()}"`);
      continue;
    }
    const key = pair.slice(0, i).trim();
    const value = pair.slice(i + 1).trim();
    if (key === 'fill' || key === 'stroke' || key === 'color') {
      if (COLOR.test(value)) out[key] = value;
      else onIssue(`unsupported ${key} value "${value}"`);
    } else if (key === 'stroke-width') {
      const n = parseFloat(value);
      if (Number.isFinite(n) && n > 0) out.strokeWidth = n;
      else onIssue(`unsupported stroke-width "${value}"`);
    } else onIssue(`ignored property "${key}"`);
  }
  return out;
}

export function parseMermaid(src: string): ParseResult {
  const issues: ParseIssue[] = [];
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const nodeStyles: { id: string; style: NodeStyle; line: number; text: string }[] = [];
  const linkStyles: { indexes: number[]; color?: string; line: number; text: string }[] = [];
  let direction: Direction = 'TD';
  let headerSeen = false;
  let inFrontMatter = false;

  const upsert = (p: ParsedNode) => {
    let n = nodes.get(p.id);
    if (!n) {
      n = { id: p.id, label: p.id, shape: 'rect', style: {}, position: { x: 0, y: 0 } };
      nodes.set(p.id, n);
    }
    if (p.shape) {
      n.shape = p.shape;
      n.label = p.label ?? n.label;
    }
  };

  src.split(/\r?\n/).forEach((raw, idx) => {
    const lineNo = idx + 1;
    const line = raw.trim();
    if (!line || line.startsWith('%%')) return;

    if (!headerSeen) {
      if (line === '---') {
        inFrontMatter = !inFrontMatter;
        return;
      }
      if (inFrontMatter) return;
      const h = /^(?:flowchart|graph)(?:\s+(TB|TD|BT|RL|LR))?\s*;?$/i.exec(line);
      if (!h) throw new ParseError(`Line ${lineNo}: expected a "flowchart TD" or "graph LR" header, found "${line}"`);
      headerSeen = true;
      const d = (h[1] ?? 'TD').toUpperCase();
      direction = (d === 'TB' ? 'TD' : DIRECTIONS.includes(d as Direction) ? d : 'TD') as Direction;
      return;
    }

    for (const stmt of splitStatements(line)) {
      const issue = (reason: string) => issues.push({ line: lineNo, text: stmt, reason });

      let m = /^style\s+(\S+)\s+(.+)$/i.exec(stmt);
      if (m) {
        nodeStyles.push({ id: m[1], style: parseStyleProps(m[2], issue), line: lineNo, text: stmt });
        continue;
      }
      m = /^linkStyle\s+(\S+)\s+(.+)$/i.exec(stmt);
      if (m) {
        if (m[1] === 'default') {
          issue('linkStyle default is not supported');
          continue;
        }
        const indexes = m[1].split(',').map((x) => Number(x));
        if (indexes.some((x) => !Number.isInteger(x) || x < 0)) {
          issue(`invalid linkStyle index "${m[1]}"`);
          continue;
        }
        const p = parseStyleProps(m[2], (r) => (r.startsWith('ignored property "stroke-width"') ? undefined : issue(r)));
        linkStyles.push({ indexes, color: p.stroke, line: lineNo, text: stmt });
        continue;
      }
      if (/^(subgraph|classDef|class|click|direction|accTitle|accDescr)\b/i.test(stmt) || /^end$/i.test(stmt)) {
        issue('unsupported statement');
        continue;
      }

      // A chain: node (link node)*
      try {
        const parsed: { node: ParsedNode; link?: EdgeStyle; label: string }[] = [];
        let { node, end } = parseNode(stmt, 0);
        parsed.push({ node, label: '' });
        for (;;) {
          while (stmt[end] === ' ') end++;
          if (end >= stmt.length) break;
          if (stmt[end] === '&') throw new Error('the "&" operator is not supported');
          let token: string;
          let label = '';
          const text = sticky(TEXT_LINK, stmt, end);
          const plain = sticky(PLAIN_LINK, stmt, end);
          if (plain) {
            token = plain[1];
            label = plain[2] ?? plain[3] ?? '';
            end += plain[0].length;
          } else if (text) {
            token = text[1] === '-.' ? '-' + text[3] : text[3];
            label = text[2];
            end += text[0].length;
          } else throw new Error(`unexpected "${stmt.slice(end, end + 12)}"`);
          const link = LINK_LOOKUP.get(token);
          if (!link) throw new Error(`unsupported link "${token}"`);
          const next = parseNode(stmt, end);
          end = next.end;
          parsed.push({ node: next.node, link, label: unescapeLabel(label.trim()) });
        }
        parsed.forEach((p) => upsert(p.node));
        for (let i = 1; i < parsed.length; i++) {
          edges.push({
            from: parsed[i - 1].node.id,
            to: parsed[i].node.id,
            label: parsed[i].label,
            style: { ...parsed[i].link! },
          });
        }
      } catch (e) {
        issue(e instanceof Error ? e.message : 'could not parse');
      }
    }
  });

  if (!headerSeen) throw new ParseError('Empty input: expected a "flowchart TD" or "graph LR" header');

  for (const s of nodeStyles) {
    const n = nodes.get(s.id);
    if (n) n.style = { ...n.style, ...s.style };
    else issues.push({ line: s.line, text: s.text, reason: `style refers to unknown node "${s.id}"` });
  }
  for (const s of linkStyles) {
    for (const i of s.indexes) {
      if (edges[i]) {
        if (s.color) edges[i].style.color = s.color;
      } else issues.push({ line: s.line, text: s.text, reason: `linkStyle index ${i} has no matching link` });
    }
  }

  issues.sort((a, b) => a.line - b.line);
  return { graph: { direction, nodes: [...nodes.values()], edges }, issues };
}
