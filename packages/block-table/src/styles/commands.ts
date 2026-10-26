import type { Editor } from "@quirekit/core";
import type { Node } from "@quirekit/pm";
import { installWordTableStyleDefinition, resolveWordTableStyleLook, resolveWordTableStyleRegistry } from "@quirekit/classic-table-model";
import type { BlockTableTarget } from "../ui/types";
import type { BlockTableHeading, BlockTableStyle } from "./types";
import { blockTableDefaultLook, blockTableStyleIds, blockTableStyleRegistry } from "./presets";

/** @param table - Canonical source. @returns Product defaults only when no explicit look exists. */
export function readBlockTableLook(table: Node) {
  if (table.attrs.tableLook !== null) return resolveWordTableStyleLook(table.attrs.tableLook);
  return table.attrs.tableStyle === null || table.attrs.tableStyle === "TableGrid" || table.attrs.tableStyle === "TableNormal"
    ? { ...blockTableDefaultLook, firstRow: false } : blockTableDefaultLook;
}
/** @param editor - Session. @param target - Captured table. @returns Whether it is still safe to apply an intent. */
function current(editor: Editor, target: BlockTableTarget): boolean {
  return !editor.isDestroyed && editor.isEditable && editor.state.doc === target.doc;
}

/**
 * Installs the product definition and delegates the complete change to the canonical style command.
 * @param editor - Session.
 * @param target - Captured table and source document.
 * @param kind - Whole-table appearance.
 * @param dryRun - Validate without dispatching.
 * @param heading - Optional independent emphasis change, preserving direct formatting.
 * @returns Whether the intent is applicable or committed.
 */
export function applyBlockTableStyle(editor: Editor, target: BlockTableTarget, kind: BlockTableStyle, dryRun = false,
  heading?: { readonly key: BlockTableHeading; readonly value: boolean }): boolean {
  if (!current(editor, target) || !Object.hasOwn(blockTableStyleIds, kind)) return false;
  const table = target.doc.nodeAt(target.tablePos)!;
  const styleId = blockTableStyleIds[kind];
  const registry = resolveWordTableStyleRegistry(target.doc.attrs.wordTableStyleRegistry);
  const installed = registry.styles[styleId] ? registry : installWordTableStyleDefinition(registry, blockTableStyleRegistry.styles[styleId]!);
  const initialLook = heading || table.attrs.tableLook !== null ? readBlockTableLook(table) : blockTableDefaultLook;
  const look = { ...initialLook, bandedRows: kind === "banded", ...(heading ? { [heading.key]: heading.value } : {}) };
  const chain = dryRun ? editor.can().chain() : editor.chain().closeHistory();
  // The registry and first application enter the same transaction and undo step.
  return chain.command(({ tr }) => { if (installed !== registry) tr.setDocAttribute("wordTableStyleRegistry", installed); return true; })
    .applyWordTableStyle({ tablePos: target.tablePos, styleId, look,
      mode: heading ? "keep-direct-formatting" : "clear-direct-formatting" }).run();
}

/** @param editor - Session. @param target - Captured table. @param key - Region to emphasize. @param value - Requested state. @returns Whether the canonical look changed. */
export function setBlockTableHeading(editor: Editor, target: BlockTableTarget, key: BlockTableHeading, value: boolean): boolean {
  if (!current(editor, target)) return false;
  const table = target.doc.nodeAt(target.tablePos)!;
  const kind = (Object.keys(blockTableStyleIds) as BlockTableStyle[]).find(candidate => blockTableStyleIds[candidate] === table.attrs.tableStyle);
  if (!kind && (table.attrs.tableStyle === null || table.attrs.tableStyle === "TableGrid")) {
    return applyBlockTableStyle(editor, target, "grid", false, { key, value });
  }
  return editor.chain().closeHistory().setWordTableLook({ tablePos: target.tablePos, look: { [key]: value } }).run();
}
