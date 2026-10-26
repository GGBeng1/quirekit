import type { LitAstNode } from '../../core/contracts.js';
import type { DocxTableCellOptions } from '../types.js';

/** @param borders - Public OOXML-shaped facade borders. @returns Immutable table-specific LitAST fields without changing the public contract. */
export function normalizeCellBorders(borders: NonNullable<DocxTableCellOptions['borders']>): Readonly<Record<string, Readonly<Record<string, unknown>>>> {
  return Object.freeze(Object.fromEntries(Object.entries(borders).map(([side, border]) => {
    const { val, sz, ...rest } = border;
    return [side, Object.freeze({ ...rest, style: val, ...(sz === undefined ? {} : { size: sz }) })];
  })));
}

/** @param children - Caller-owned blocks. @returns Cell content with an explicit terminal paragraph after a nested table. */
export function normalizeCellContent(children: readonly LitAstNode[] = []): readonly LitAstNode[] {
  if (children.length && !endsWithTable(children.at(-1))) return children;
  // Word consumers retain the outer cell box only when nested table content
  // is followed by its terminal paragraph, even through tagged block wrappers.
  return [...children, Object.freeze({ type: 'paragraph', children: Object.freeze([]) })];
}

/** @param node - Last semantic block, possibly a tagged container. @returns Whether its last serialized block is a table. */
function endsWithTable(node: LitAstNode | undefined): boolean {
  return node?.type === 'table' || node?.type === 'sdt' && endsWithTable(node.children?.at(-1));
}
