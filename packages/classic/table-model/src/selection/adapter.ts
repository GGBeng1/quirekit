import { selectionPreset } from "@quirekit/core";
import type { Node as ProseMirrorNode } from "@quirekit/pm";

/** High-level selection contribution for Word Classic table crossings. */
export const wordTableSelectionContribution = selectionPreset.semanticUnits({
  id: "word-table-rows",
  nodeTypes: ["wordTable"],
  priority: 200,
  // This compiler reads only canonical table children; no selection or storage.
  layoutDependency: { kind: "document" },
  commandDomain: "word-table",
  clipboardDomain: "word-table",
  compileUnits: compileWordTableSelectionUnits
});

/**
 * Compiles direct table rows into ordered owner-relative semantic units.
 *
 * @param context - Exact Word table source node.
 * @returns One source range for every direct table row.
 */
function compileWordTableSelectionUnits(
  context: { readonly node: ProseMirrorNode }
): readonly {
  readonly id: string;
  readonly kind: string;
  readonly range: { readonly from: number; readonly to: number };
}[] {
  const units = [];
  let offset = 1;

  for (let rowIndex = 0; rowIndex < context.node.childCount; rowIndex += 1) {
    const row = context.node.child(rowIndex);
    units.push({
      id: `row-${rowIndex}`,
      kind: "table-row",
      range: {
        from: offset,
        to: offset + row.nodeSize
      }
    });
    offset += row.nodeSize;
  }

  return units;
}
