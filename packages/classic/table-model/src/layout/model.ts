import { createWordTableMap } from "../map";
import { createWordTableDocumentStyleSignature, createWordTableStyleRegistrySignature, readWordTableDocumentStyleRegistry, resolveWordTableChildCellStyleLayer } from "../style";
import type { WordTableMap } from "../map/types";
import { WordTableSelection } from "../selection";
import { usesLegacyWordTableOrigin } from "./compatibility";
import { createQuireTableSourceFromWordMap } from "./source";
import type { WordTableAttributeImpact, WordTableLayoutContextToken, WordTableLayoutModel, WordTableLayoutSourceRequest } from "./types";

/** Table, row and cell attributes that alter semantic grid identity. */
const structuralAttributes = new Set([
  "grid", "legacyColumns", "columns", "gridBefore", "gridAfter", "colspan", "gridSpan", "rowspan", "vMerge", "hMerge"
]);

/** Attributes whose earliest dependent product is narrower than full table style. */
const narrowAttributeImpacts: ReadonlyMap<string, WordTableAttributeImpact> = new Map([
  ["borders", "border-style"], ["height", "row-layout"], ["cellMargins", "cell-layout"], ["noWrap", "cell-layout"]
]);

/**
 * Creates Word table semantics for a layout engine's table model.
 *
 * The engine keeps grid layout, caching and cell content collection; this
 * model owns the Word grid map, table-style resolution and OOXML-to-pixel
 * normalization of table, row and cell properties.
 *
 * @returns Table model for `wordTable` nodes.
 */
export function createWordTableLayoutModel(): WordTableLayoutModel {
  return {
    tableNodeType: "wordTable",
    cellNodeType: "wordTableCell",
    styleContext: (doc) => {
      const registry = readWordTableDocumentStyleRegistry(doc);
      const legacyOrigin = usesLegacyWordTableOrigin(doc.attrs);
      const signature = registry === undefined ? null : createWordTableStyleRegistrySignature(registry);
      const blockSignature = createWordTableDocumentStyleSignature(doc) ?? null;
      return {
        token: { document: doc, registry, legacyOrigin } satisfies WordTableLayoutContextToken,
        signature: legacyOrigin ? `${signature ?? ""}:legacy-origin` : signature,
        blockSignature: legacyOrigin ? `${blockSignature ?? ""}:legacy-origin` : blockSignature
      };
    },
    map: (table) => createWordTableMap(table),
    source: (request) => createQuireTableSourceFromWordMap({
      tableId: request.tableId,
      tableRange: request.tableRange,
      tableNode: request.tableNode,
      tableMap: request.map as WordTableMap,
      tableStyleRegistry: (request.styleContext.token as WordTableLayoutContextToken | undefined)?.registry,
      legacyFloatingOrigin: usesLegacyOriginForTable(request)
    }),
    cellStyleLayer: (doc, table, childPath) => resolveWordTableChildCellStyleLayer(doc, table, childPath),
    attributeImpact: (attribute) => structuralAttributes.has(attribute)
      ? "structure"
      : narrowAttributeImpacts.get(attribute) ?? "style",
    semanticCellAt: (map, relativeCellPos) => (map as WordTableMap).findSemanticCell(relativeCellPos),
    isContinuationCell: (cell) => cell.attrs.vMerge === "continue",
    createCellSelection: (doc, cells) => WordTableSelection.create(doc, { ...cells, mode: "cell" })
  };
}

/**
 * Excludes nested tables with an ancestor walk rather than a document scan.
 * @param request - Table and its Word-owned document context.
 * @returns Whether this table uses the legacy text-edge reference.
 */
function usesLegacyOriginForTable(request: WordTableLayoutSourceRequest): boolean {
  const context = request.styleContext.token as WordTableLayoutContextToken | undefined;
  if (!context?.legacyOrigin || request.tableNode.attrs.floating == null) return false;
  const position = context.document.resolve(request.tableRange.from);
  for (let depth = position.depth; depth > 0; depth--) {
    if (position.node(depth).type.name === "wordTableCell") return false;
  }
  return true;
}
