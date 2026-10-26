import { Plugin, type Slice, type Transaction } from "@quirekit/pm";
import { installWordTableStyleDefinition, resolveWordTableStyleRegistry, type WordTableStyleRegistry } from "@quirekit/classic-table-model";
import { blockTableStyleRegistry } from "./presets";

/**
 * Makes only built-in product styles available when a private copied table enters a fresh document.
 * @param slice - Prepared clipboard slice, bounded by the user's copied content.
 * @param registry - Destination definitions; existing definitions always win.
 * @returns Registry with missing built-in definitions, preserving the original identity when unchanged.
 */
export function prepareBlockTablePasteStyles(slice: Slice, registry: WordTableStyleRegistry): WordTableStyleRegistry {
  let result = registry;
  slice.content.descendants(node => {
    const id = node.type.name === "wordTable" ? node.attrs.tableStyle : null;
    const definition = typeof id === "string" && Object.hasOwn(blockTableStyleRegistry.styles, id)
      ? blockTableStyleRegistry.styles[id] : undefined;
    if (definition && !result.styles[definition.id]) result = installWordTableStyleDefinition(result, definition);
    return true;
  });
  return result;
}

/** @returns Paste-only preparation, before the shared table owner validates structural replacement. */
export function createBlockTableStylePastePlugin(): Plugin {
  return new Plugin({ props: {
    /** @param tr - Shared transaction; rejection prevents this metadata from being committed. @param slice - Prepared input. @returns False so the shared structural owner still runs. */
    quireClipboardPaste(tr: Transaction, slice: Slice): boolean {
      const registry = resolveWordTableStyleRegistry(tr.doc.attrs.wordTableStyleRegistry);
      const prepared = prepareBlockTablePasteStyles(slice, registry);
      if (prepared !== registry) tr.setDocAttribute("wordTableStyleRegistry", prepared);
      return false;
    }
  } });
}
