import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { WordTableStyleTextLayer } from "@quirekit/classic-styles-model";
import { createWordTableMap } from "../../map/build";
import { resolveWordTableStyleAppearance } from "./appearance";
import { readWordTableDocumentStyleRegistry } from "../catalog/document";
import type { WordTableStyleAppearance, WordTableStyleRegistry } from "../types";

const appearances = new WeakMap<ProseMirrorNode, WeakMap<WordTableStyleRegistry, {
  readonly appearance: WordTableStyleAppearance;
  readonly semanticByExplicit: ReadonlyMap<string, string>;
}>>();

/**
 * Resolves the table-style paragraph/text layer for one explicit cell.
 *
 * Appearance is cached per immutable table node and registry, so collecting
 * every cell of a table resolves the table style once.
 *
 * @param tableNode - Word table node.
 * @param rowIndex - Explicit row index.
 * @param cellIndex - Explicit cell index within the row.
 * @param registry - Document table-style registry.
 * @returns Layer, or undefined when the table style contributes no text deltas.
 */
export function resolveWordTableCellStyleLayer(
  tableNode: ProseMirrorNode,
  rowIndex: number,
  cellIndex: number,
  registry: WordTableStyleRegistry
): WordTableStyleTextLayer | undefined {
  let byRegistry = appearances.get(tableNode);
  if (byRegistry === undefined) {
    byRegistry = new WeakMap();
    appearances.set(tableNode, byRegistry);
  }
  let entry = byRegistry.get(registry);
  if (entry === undefined) {
    const map = createWordTableMap(tableNode);
    entry = {
      appearance: resolveWordTableStyleAppearance({
        registry,
        map,
        styleId: tableNode.attrs.tableStyle,
        tableLook: tableNode.attrs.tableLook,
        styleBandSize: tableNode.attrs.styleBandSize
      }),
      semanticByExplicit: new Map(map.explicitCells.flatMap(cell => cell.semanticCellId === null
        ? []
        : [[`${cell.rowIndex}:${cell.cellIndex}`, cell.semanticCellId] as const]))
    };
    byRegistry.set(registry, entry);
  }
  const semanticId = entry.semanticByExplicit.get(`${rowIndex}:${cellIndex}`);
  const cell = semanticId === undefined ? undefined : entry.appearance.cells.get(semanticId);
  if (cell === undefined || (cell.paragraph === null && cell.text === null)) return undefined;
  return {
    paragraph: cell.paragraph as WordTableStyleTextLayer["paragraph"],
    text: cell.text as WordTableStyleTextLayer["text"]
  };
}

/**
 * Resolves the table-style text layer for a table child container by source path.
 *
 * @param documentNode - Document node owning the table-style registry.
 * @param tableNode - Word table node that owns the child container.
 * @param childPath - Child container path ending in row and cell index.
 * @returns Layer, or undefined when the document or style contributes none.
 */
export function resolveWordTableChildCellStyleLayer(
  documentNode: ProseMirrorNode,
  tableNode: ProseMirrorNode,
  childPath: readonly number[]
): WordTableStyleTextLayer | undefined {
  const registry = readWordTableDocumentStyleRegistry(documentNode);
  const rowIndex = childPath.at(-2);
  const cellIndex = childPath.at(-1);
  return registry === undefined || rowIndex === undefined || cellIndex === undefined
    ? undefined
    : resolveWordTableCellStyleLayer(tableNode, rowIndex, cellIndex, registry);
}
