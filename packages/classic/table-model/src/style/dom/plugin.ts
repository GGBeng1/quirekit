import {
  Decoration,
  DecorationSet,
  Plugin,
  PluginKey,
  type EditorState,
  type Node as PMNode
} from "@quirekit/pm";
import { markQuireDomOnlyDecorations, type QuireDecorationSpec } from "@quirekit/core";
import {
  createWordStylesTableCellParagraphCss,
  resolveWordDocumentStyleRegistry,
  type WordParagraphStyleRegistry,
  type WordTableStyleTextLayer
} from "@quirekit/classic-styles-model";
import { createWordTableMap } from "../../map";
import { resolveWordTableCellHtmlStyles, type WordTableCellHtmlStyle } from "./projection";
import { resolveWordTableStyleRegistry } from "../catalog/registry";
import type { WordTableStyleRegistry } from "../types";

const wordTableStyleHtmlPluginKey = new PluginKey<DecorationSet>("wordTableStyleHtml");

// Canvas and SVG paint table styles from layout; these decorations serve DOM views only.
const domOnlySpec: QuireDecorationSpec = Object.freeze({ quireRenderTarget: "dom" });

/**
 * Projects table-style appearance into DOM views as cell node decorations.
 *
 * Canvas and SVG read the same resolver through layout and never request these
 * decorations; DOM views receive the result as inline cell styles, built when
 * read and kept per document. Per-table results are cached by node and
 * registry identity, so an edit only re-resolves the tables it replaced.
 *
 * @returns ProseMirror plugin owning table-style cell decorations.
 */
export function createWordTableStyleHtmlPlugin(): Plugin<DecorationSet> {
  const cache = new WeakMap<object, WeakMap<PMNode, readonly WordTableCellHtmlStyle[] | null>>();

  /**
   * Builds decorations for every table in one document.
   *
   * @param state - Editor state.
   * @returns Decoration set.
   */
  const build = (state: EditorState): DecorationSet => {
    if (!Object.prototype.hasOwnProperty.call(state.doc.attrs, "wordTableStyleRegistry")) {
      return DecorationSet.empty;
    }
    const registry = resolveWordTableStyleRegistry(state.doc.attrs.wordTableStyleRegistry);
    if (Object.keys(registry.styles).length === 0) return DecorationSet.empty;
    const tables = cache.get(registry) ?? new WeakMap();
    cache.set(registry, tables);
    const paragraphStyles = Object.prototype.hasOwnProperty.call(state.doc.attrs, "wordStyleRegistry")
      ? resolveWordDocumentStyleRegistry(state.doc.attrs)
      : null;
    const decorations: Decoration[] = [];
    state.doc.descendants((node, pos) => {
      if (node.type.name !== "wordTable") return true;
      appendTableDecorations(decorations, node, pos, readStyles(tables, node, registry), paragraphStyles);
      return true;
    });
    return DecorationSet.create(state.doc, decorations);
  };

  // The registry lives in document attrs, so each document determines its set.
  const byDocument = new WeakMap<PMNode, DecorationSet>();
  return markQuireDomOnlyDecorations(new Plugin<DecorationSet>({
    key: wordTableStyleHtmlPluginKey,
    props: {
      decorations: (state: EditorState) => {
        let set = byDocument.get(state.doc);
        if (set === undefined) {
          set = build(state);
          byDocument.set(state.doc, set);
        }
        return set;
      }
    }
  }));
}

/**
 * Reads or resolves the cached cell styles of one table node.
 *
 * @param tables - Cache for the active registry.
 * @param node - Table node.
 * @param registry - Active registry.
 * @returns Cell styles, or null when no style applies.
 */
function readStyles(
  tables: WeakMap<PMNode, readonly WordTableCellHtmlStyle[] | null>,
  node: PMNode,
  registry: WordTableStyleRegistry
): readonly WordTableCellHtmlStyle[] | null {
  if (tables.has(node)) return tables.get(node) ?? null;
  const styles = resolveWordTableCellHtmlStyles(node, createWordTableMap(node), registry);
  tables.set(node, styles);
  return styles;
}

/**
 * Converts cell styles into absolute node decorations.
 *
 * @param decorations - Mutable output.
 * @param table - Table node.
 * @param tablePos - Absolute table position.
 * @param styles - Resolved cell styles.
 * @param paragraphStyles - Paragraph style registry, when the document declares one.
 */
function appendTableDecorations(
  decorations: Decoration[],
  table: PMNode,
  tablePos: number,
  styles: readonly WordTableCellHtmlStyle[] | null,
  paragraphStyles: WordParagraphStyleRegistry | null
): void {
  if (styles === null) return;
  const byRow = new Map<number, Map<number, WordTableCellHtmlStyle>>();
  for (const style of styles) {
    const row = byRow.get(style.rowIndex) ?? new Map<number, WordTableCellHtmlStyle>();
    row.set(style.cellIndex, style);
    byRow.set(style.rowIndex, row);
  }
  table.forEach((row, rowOffset, rowIndex) => {
    const cells = byRow.get(rowIndex);
    if (cells === undefined) return;
    row.forEach((cell, cellOffset, cellIndex) => {
      const style = cells.get(cellIndex);
      if (style === undefined) return;
      const from = tablePos + 1 + rowOffset + 1 + cellOffset;
      decorations.push(Decoration.node(from, from + cell.nodeSize, { style: style.style }, domOnlySpec));
      if (style.paragraph !== null || style.text !== null) {
        appendParagraphDecorations(decorations, cell, from + 1, paragraphStyles, {
          paragraph: style.paragraph as WordTableStyleTextLayer["paragraph"],
          text: style.text as WordTableStyleTextLayer["text"]
        });
      }
    });
  });
}

/**
 * Projects the cell's table-style text layer onto its paragraphs.
 *
 * Nested tables are skipped: their paragraphs belong to their own cells.
 *
 * @param decorations - Mutable output.
 * @param cell - Styled cell node.
 * @param contentStart - Absolute position of the cell content.
 * @param registry - Paragraph style registry, or null when none is installed.
 * @param layer - Table-style text layer of the cell.
 */
function appendParagraphDecorations(
  decorations: Decoration[],
  cell: PMNode,
  contentStart: number,
  registry: WordParagraphStyleRegistry | null,
  layer: WordTableStyleTextLayer
): void {
  cell.descendants((node, offset) => {
    if (node.type.name === "wordTable") return false;
    if (!node.isTextblock) return true;
    const css = createWordStylesTableCellParagraphCss(registry, node.attrs.wordParagraph, layer, node);
    if (css.length > 0) {
      const from = contentStart + offset;
      decorations.push(Decoration.node(from, from + node.nodeSize, { style: css }, domOnlySpec));
    }
    return false;
  });
}
