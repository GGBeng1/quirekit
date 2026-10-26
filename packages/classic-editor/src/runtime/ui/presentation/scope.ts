import type { ClassicEditorRenderContext } from "../../../types";
import { computed } from "vue";
import type { ClassicEditorPresentationQueryNode, ClassicEditorPresentationScope } from "./types";

const scopes = new WeakMap<ClassicEditorRenderContext, ClassicEditorPresentationScope>();

/**
 * Reports whether runtime owns this context's presentation lifecycle.
 * @param context - Candidate render context.
 * @returns Whether queries may share the registered presentation epoch.
 */
export function hasClassicEditorPresentationScope(context: ClassicEditorRenderContext): boolean {
  return scopes.has(context);
}

/** @returns An empty node that distinguishes missing and undefined results. */
function createNode(): ClassicEditorPresentationQueryNode {
  return { children: new Map() };
}

/**
 * Registers a private presentation epoch without changing the public context shape.
 * @param context - Fresh context published by the mounted product runtime.
 */
export function registerClassicEditorPresentationScope(context: ClassicEditorRenderContext): void {
  scopes.set(context, {
    pm: context.editor.state?.pm,
    ui: context.ui.state,
    editable: context.editor.isEditable,
    registry: context.instance.registry,
    queries: createNode()
  });
}

/**
 * Shares a query within one known presentation epoch, never across accepted state.
 * Unknown caller contexts retain their existing live-query behavior. Explicit UI
 * refresh publishes a new context even when host permissions are the only change.
 * @param context - Current presentation context.
 * @param keys - Private namespace followed by identity-sensitive occurrence keys.
 * @param read - Side-effect-free presentation query evaluated on a cache miss.
 * @returns Current query result owned by this presentation epoch.
 */
export function readClassicEditorPresentationValue<Value>(
  context: ClassicEditorRenderContext,
  keys: readonly unknown[],
  read: () => Value
): Value {
  let scope = scopes.get(context);
  if (scope === undefined) return read();

  // A retained context can also be read after a metadata-only transaction or a
  // synchronous product update. Its old capability result is not authoritative.
  if (scope.pm !== context.editor.state?.pm
    || scope.ui !== context.ui.state
    || scope.editable !== context.editor.isEditable
    || scope.registry !== context.instance.registry) {
    registerClassicEditorPresentationScope(context);
    scope = scopes.get(context)!;
  }

  let node = scope.queries;
  for (const key of keys) {
    let child = node.children.get(key);
    if (child === undefined) {
      child = createNode();
      node.children.set(key, child);
    }
    node = child;
  }
  if (node.value === undefined) {
    // Imperative Shell reads can precede Vue rendering. A computed keeps the
    // callback's reactive dependencies available to every later consumer.
    node.value = computed(read);
  }
  try {
    return node.value.value as Value;
  } catch (error) {
    // Vue can refresh a nested computed without reentering its scope reader.
    // Discard the whole epoch so failed dependencies cannot return stale values
    // when the next presentation attempt retries the outer query.
    registerClassicEditorPresentationScope(context);
    throw error;
  }
}
