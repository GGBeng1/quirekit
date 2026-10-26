import { collectQuireExtensionContributions, type Editor } from "@quirekit/core";
import type { EditorBlockMenuLease, EditorBlockMenuProvider } from "./types";

const registries = new WeakMap<Editor, Map<string, EditorBlockMenuLease>>();
/** @param registry - Editor-local namespace. @param provider - New feature. @returns Its revocable lease. */
function add(registry: Map<string, EditorBlockMenuLease>, provider: EditorBlockMenuProvider): EditorBlockMenuLease {
  if (!provider.id || provider.id.includes("/") || registry.has(provider.id)) throw new Error(`Invalid or duplicate block menu provider: ${provider.id}`);
  const lease = { provider, active: true }; registry.set(provider.id, lease); return lease;
}
/** @param editor - Canonical extension owner. @returns Once-collected registry without a document/hover subscription. */
function registryFor(editor: Editor): Map<string, EditorBlockMenuLease> {
  let registry = registries.get(editor);
  if (!registry) {
    registry = new Map();
    for (const entry of collectQuireExtensionContributions<EditorBlockMenuProvider>(editor.extensions, "addBlockMenuProviders")) add(registry, entry.contribution);
    registries.set(editor, registry);
  }
  return registry;
}
/** @param editor - Mounted task owner. @param provider - Panel-backed contribution. @returns Idempotent release, invalidating existing snapshots too. */
export function registerEditorBlockMenuProvider(editor: Editor, provider: EditorBlockMenuProvider): () => void {
  const registry = registryFor(editor), lease = add(registry, provider);
  return () => { lease.active = false; if (registry.get(provider.id) === lease) registry.delete(provider.id); };
}
/** @param editor - Menu owner. @returns Stable feature order at the menu-open boundary. */
export function readEditorBlockMenuProviders(editor: Editor): readonly EditorBlockMenuLease[] {
  return [...registryFor(editor).values()].sort((a, b) => (a.provider.order ?? 0) - (b.provider.order ?? 0));
}
