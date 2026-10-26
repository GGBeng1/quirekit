import type { Node as PMNode } from "@quirekit/pm";
import { createWordTableLookAttrs, resolveWordTableStyleLook } from "../resolve/look";
import { wordTableBuiltinStyles } from "./presets";
import { installWordTableStyleDefinition } from "./registry";
import type {
  ApplyWordTableStyleOptions,
  SetWordTableLookOptions,
  WordTableStyleRegistry
} from "../types";

/**
 * Returns the registry with a style and its `basedOn` ancestors available.
 *
 * Definitions already in the document win; only missing ids are filled from
 * the built-in gallery, so an imported definition is never rewritten.
 *
 * @param registry - Current document registry.
 * @param styleId - Style id to make available.
 * @returns Registry containing the style, or null when the id is unknown.
 */
export function ensureWordTableStyleAvailable(
  registry: WordTableStyleRegistry,
  styleId: string
): WordTableStyleRegistry | null {
  let next = registry;
  let id: string | null = styleId;
  const visited = new Set<string>();
  while (id !== null && !visited.has(id)) {
    visited.add(id);
    const existing: WordTableStyleRegistry["styles"][string] | undefined = next.styles[id];
    const definition: WordTableStyleRegistry["styles"][string] | undefined = existing ?? wordTableBuiltinStyles.find(style => style.id === id);
    if (definition === undefined) return id === styleId ? null : next;
    if (existing === undefined) next = installWordTableStyleDefinition(next, definition);
    id = definition.basedOn;
  }
  return next;
}

/**
 * Applies a table style to one table node.
 *
 * The default mode clears direct table, row, and cell borders, shading, and
 * cell margins so the style shows; alignment, indentation, widths, heights,
 * merges, and cell content formatting stay unchanged.
 *
 * @param tableNode - Word table node.
 * @param options - Style id, mode, and optional look switches.
 * @returns Replacement table node.
 */
export function applyWordTableStyleToNode(
  tableNode: PMNode,
  options: ApplyWordTableStyleOptions
): PMNode {
  const clear = (options.mode ?? "clear-direct-formatting") === "clear-direct-formatting";
  const tableAttrs = {
    ...tableNode.attrs,
    tableStyle: options.styleId,
    ...(options.look === undefined ? {} : { tableLook: mergeLook(tableNode.attrs.tableLook, options.look) }),
    ...(clear ? { borders: null, shading: null, defaultCellMargins: null } : {})
  };
  if (!clear) return tableNode.type.create(tableAttrs, tableNode.content, tableNode.marks);
  const rows: PMNode[] = [];
  tableNode.forEach(row => {
    const cells: PMNode[] = [];
    row.forEach(cell => {
      cells.push(cell.type.create(
        { ...cell.attrs, borders: null, shading: null, backgroundColor: null, cellMargins: null },
        cell.content,
        cell.marks
      ));
    });
    rows.push(row.type.create({ ...row.attrs, borders: null }, cells, row.marks));
  });
  return tableNode.type.create(tableAttrs, rows, tableNode.marks);
}

/**
 * Changes look switches on one table node.
 *
 * @param tableNode - Word table node.
 * @param options - Look switches to change.
 * @returns Replacement table node.
 */
export function setWordTableLookOnNode(
  tableNode: PMNode,
  options: SetWordTableLookOptions
): PMNode {
  return tableNode.type.create(
    { ...tableNode.attrs, tableLook: mergeLook(tableNode.attrs.tableLook, options.look) },
    tableNode.content,
    tableNode.marks
  );
}

/**
 * Merges look switches over a table's effective look.
 *
 * @param current - Current `tableLook` attribute.
 * @param patch - Switches to change.
 * @returns Canonical look attribute with a synchronized bitmask.
 */
function mergeLook(
  current: unknown,
  patch: ApplyWordTableStyleOptions["look"]
): Readonly<Record<string, unknown>> {
  return createWordTableLookAttrs({ ...resolveWordTableStyleLook(current), ...patch });
}
