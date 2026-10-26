import type { QuireEditor, QuireMountedEditorView } from "@quirekit/core";
import type { MarkView, NodeView } from "@quirekit/pm-view";
import type { DomViewRenderers } from "./types";

/**
 * Adapts already-resolved extension factories to native PM renderer callbacks.
 * @param editor - Owner of the canonical extension factories and HTML attributes.
 * @returns Stable maps; PM owns creation, reconciliation and destruction.
 */
export function createDomRenderers(editor: QuireEditor): DomViewRenderers {
  const nodeViews: DomViewRenderers["nodeViews"] = {};
  const markViews: DomViewRenderers["markViews"] = {};

  // Core stores renderer-neutral factories. This is the interpretation boundary:
  // DOM extensions receive the actual PM view, with its full native DOM API.
  for (const [name, factory] of Object.entries(editor.extensionManager.nodeViews)) {
    nodeViews[name] = (node, view, getPos, decorations, innerDecorations) => {
      const result = factory(node, view as unknown as QuireMountedEditorView, getPos, decorations, innerDecorations);
      assertDomRenderer(result, name);
      return result as NodeView;
    };
  }
  for (const [name, factory] of Object.entries(editor.extensionManager.markViews)) {
    markViews[name] = (mark, view, inline) => {
      const result = factory(mark, view as unknown as QuireMountedEditorView, inline);
      assertDomRenderer(result, name);
      return result as MarkView;
    };
  }
  return { nodeViews, markViews };
}

/**
 * Rejects non-DOM extension renderers at the native backend boundary.
 * @param value - Renderer result to validate without cross-realm instanceof checks.
 * @param name - Extension name used in the actionable diagnostic.
 */
function assertDomRenderer(value: unknown, name: string): void {
  if (!value || typeof value !== "object" || !("dom" in value)
    || !value.dom || typeof value.dom !== "object" || !("nodeType" in value.dom)) {
    throw new TypeError(`Native DOM view requires a DOM renderer for extension: ${name}`);
  }
}
