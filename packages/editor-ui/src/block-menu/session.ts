import type { Editor } from "@quirekit/core";
import { readBlockCatalog } from "@quirekit/extensions";
import type { QuireKitMenuEntry } from "@quirekit/ui";
import type { EditorBlockMenuContext, EditorBlockMenuItem, EditorBlockMenuSession } from "./types";
import { readEditorBlockMenuProviders } from "./registry";

/**
 * Prepares feature menus for one explicit canonical block without modifying selection.
 * @param editor - Command and permission owner.
 * @param position - Boundary of the block the user actually invoked.
 * @returns A revocable snapshot, or null when the target is unavailable.
 */
export function prepareEditorBlockMenu(editor: Editor, position: number): EditorBlockMenuSession | null {
  if (editor.isDestroyed || !editor.isEditable) return null;
  const catalog = readBlockCatalog(editor), block = catalog?.byFrom.get(position);
  if (!catalog || !block) return null;
  const context: EditorBlockMenuContext = { editor, block, range: { anchor: block, focus: block, expectedDocumentRevision: catalog.revision } };
  let active = true;
  const actions = new Map<string, () => boolean>();
  const items: QuireKitMenuEntry[] = [];
  /** @returns Whether this session still owns exactly the original mutable target. */
  function current(): boolean {
    if (!active || editor.isDestroyed || !editor.isEditable || editor.state.doc !== catalog!.doc) return false;
    const next = readBlockCatalog(editor);
    return next?.revision === catalog!.revision && next.rootId === block!.rootId && next.byFrom.get(position)?.blockId === block!.blockId;
  }
  // Factories are static; applicability and UI state are projected only for this
  // opening. Namespace validation prevents one feature from replacing another.
  for (const lease of readEditorBlockMenuProviders(editor)) {
    const seen = new Set<string>();
    /** @param source - Feature tree. @param parents - Ancestor availability. @returns Public menu rows without command callbacks. */
    function project(source: readonly EditorBlockMenuItem[], parents: readonly EditorBlockMenuItem[] = []): QuireKitMenuEntry[] {
      return source.map(item => {
        if (!item.value || seen.has(item.value)) throw new Error(`Invalid or duplicate block menu item: ${lease.provider.id}/${item.value}`);
        seen.add(item.value);
        const { children, run, isEnabled: _isEnabled, ...entry } = item;
        const value = `${lease.provider.id}/${item.value}`, lineage = [...parents, item];
        /** @returns Current feature availability, including disabled submenu ancestors. */
        const enabled = () => lineage.every(row => !row.disabled && (row.isEnabled?.() ?? true));
        if (run && !children) actions.set(value, () => {
          if (!current() || !lease.active || !enabled()) return false;
          // Restore the captured range only at activation. Menus must never
          // redirect a command to a caret moved while they owned native focus.
          if (!editor.commands.selectBlockRange(context.range) || !current() || !lease.active) return false;
          return run() !== false;
        });
        return { ...entry, value, disabled: !enabled() || (!children && !run && entry.kind !== "separator"),
          ...(entry.selectedValue === undefined ? {} : { selectedValue: `${lease.provider.id}/${entry.selectedValue}` }),
          ...(children ? { children: project(children, lineage) } : {}) };
      });
    }
    items.push(...project(lease.provider.getItems(context)));
  }
  return {
    items,
    /** @param value - Public leaf identity. @returns Acceptance after revalidating the original target. */
    execute(value) {
      if (!current()) return false;
      return actions.get(value)?.() ?? false;
    },
    /** Releases action closures while making all retained references inert. */
    dispose() { active = false; actions.clear(); }
  };
}
