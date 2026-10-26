import type { QuireEditor } from "../Editor";
import type { QuireEditorState } from "../types";
import { appendLayoutDependencyTokens } from "./declaration";
import { appendLayoutMetadata } from "./metadata";
import { appendStyleAuthority } from "./styles";
import type { QuireLayoutAuthoritySnapshot } from "./types";

/**
 * Reads current layout contribution evidence after PM apply has completed.
 *
 * This does not run layout/style/selection callbacks. Engine owns document,
 * geometry, font, materialization and cache-lifetime checks beyond these tokens.
 *
 * @param editor - Editor whose installed registries own layout contributions.
 * @param state - Exact current or speculative state consumed by this frame.
 * @returns Current comparison tokens or the first unknown contribution reason.
 */
export function readQuireEditorLayoutAuthority(
  editor: QuireEditor,
  state: QuireEditorState
): QuireLayoutAuthoritySnapshot {
  const manager = editor.extensionManager;
  const tokens: unknown[] = [editor, state.extensions, manager];
  for (const extension of state.extensions) {
    const unknown = appendStyleAuthority(extension, { editor, state, extension }, tokens);
    if (unknown !== undefined) return { known: false, reason: unknown };
  }

  // Registries capture contribution ownership once; compare live payload and
  // callback identities as well as the current declared external version values.
  if (manager.layoutProviderRegistry === null) return { known: false, reason: "invalid-layout-registry" };
  tokens.push(manager.layoutProviderRegistry);
  for (const entry of manager.layoutProviderRegistry.entries) {
    tokens.push(entry, entry.id, entry.extensionName);
    if (![entry.nodeTypes, entry.capabilities, entry.provider].every((value) => appendLayoutMetadata(tokens, value))) {
      return { known: false, reason: `unknown-layout-metadata:${entry.id}` };
    }
    if (!appendLayoutDependencyTokens(tokens, entry.layoutDependency, { editor, state })) {
      return { known: false, reason: `unknown-layout-provider:${entry.id}` };
    }
  }
  if (manager.selectionAdapterRegistry === null) return { known: false, reason: "invalid-selection-registry" };
  tokens.push(manager.selectionAdapterRegistry);
  for (const entry of manager.selectionAdapterRegistry.entries) {
    tokens.push(entry, entry.id, entry.extensionName, entry.priority);
    if (![entry.nodeTypes, entry.adapter].every((value) => appendLayoutMetadata(tokens, value))) {
      return { known: false, reason: `unknown-selection-metadata:${entry.id}` };
    }
    if (!appendLayoutDependencyTokens(tokens, entry.layoutDependency, { editor, state })) {
      return { known: false, reason: `unknown-selection-adapter:${entry.id}` };
    }
  }
  return { known: true, tokens };
}
