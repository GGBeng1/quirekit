import type { MsfeEditor } from "../editor/types";
import type { CompiledExtensions, MsfeExtensionContext } from "./types";
import type { Transaction } from "@quirekit/cm-state";

/**
 * Allocates per-editor storage and invokes hooks in dependency order, disposing in reverse.
 * @param compiled - Validated graph.
 * @param report - Host error sink.
 * @returns Editor-lifetime owner with no module-global state.
 */
export function extensionLifecycle(compiled: CompiledExtensions, report: (error: unknown) => void) {
  const storage = Object.create(null) as Record<string, unknown>;
  for (const feature of compiled.ordered) storage[feature.id] = feature.createStorage?.();
  let contexts: MsfeExtensionContext[] = [];
  let disposed = false;
  const cleanups: (() => void)[] = [];
  return {
    storage: Object.freeze(storage),
    /** @param editor - Constructed editor, with state available but no DOM mounted yet. */
    beforeCreate(editor: MsfeEditor): void {
      if (disposed) return;
      contexts = compiled.ordered.map(feature => ({ editor, storage: storage[feature.id] }));
      compiled.ordered.forEach((feature, index) => {
        if (disposed) return;
        try { feature.onBeforeCreate?.(contexts[index]!); } catch (error) { report(error); }
      });
    },
    /** @param editor - Fully mounted canonical editor. */
    start(editor: MsfeEditor): void {
      if (disposed) return;
      // All observers exist before a create hook can issue the first canonical command.
      compiled.ordered.forEach((feature, index) => {
        if (feature.onChange) cleanups.push(editor.onChange(event => feature.onChange!(contexts[index]!, event)));
      });
      compiled.ordered.forEach((feature, index) => {
        if (disposed) return;
        try {
          const context = contexts[index]!;
          const cleanup = feature.onCreate?.(context);
          // Creation hooks may synchronously close the host; their returned resource still needs release.
          if (cleanup) { if (disposed) cleanup(); else cleanups.push(cleanup); }
        } catch (error) { report(error); }
      });
    },
    /** @param editor - Canonical editor. @param transaction - Accepted transaction. */
    transaction(editor: MsfeEditor, transaction: Transaction): void {
      const event = { editor, transaction };
      compiled.ordered.forEach((feature, index) => {
        const context = contexts[index];
        if (disposed || !context) return;
        try { feature.onTransaction?.(context, event); } catch (error) { report(error); }
        if (!disposed && !transaction.startState.selection.eq(transaction.newSelection)) {
          try { feature.onSelectionUpdate?.(context, event); } catch (error) { report(error); }
        }
      });
    },
    /** Disposes subscriptions and extension hooks exactly once. */
    destroy(): void {
      if (disposed) return;
      disposed = true;
      for (const cleanup of cleanups.splice(0).reverse()) { try { cleanup(); } catch (error) { report(error); } }
      for (let index = contexts.length - 1; index >= 0; index--) {
        try { compiled.ordered[index]!.onDestroy?.(contexts[index]!); } catch (error) { report(error); }
      }
      contexts = [];
    },
  };
}
