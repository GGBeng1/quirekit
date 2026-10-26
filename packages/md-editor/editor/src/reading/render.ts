import type { EditorState } from "@quirekit/cm-state";
import type { VNodeChild } from "vue";
import { renderMarkdown, type MarkdownRenderer, type MarkdownRenderOptions } from "@quirekit/incremark/vue";
import type { MdEditorLocale } from "../vue/types";
import type { MdReadingError } from "./contributions/types";
import { renderProductNode } from "./product";

/** @returns The product adapter reads only the candidate fence and its immediate parent kind. */
function productKey(): null { return null; }

/** @param state - Existing accepted editor snapshot. @param locale - Control language. @param prefix - Instance-local navigation namespace.
 * @param onError - Local reading failure observer. @param options - Consumer component/HTML overrides. @param renderer - Optional instance-owned block cache.
 * @returns Shared Markdown output with the editor product's optional diagram adapter. */
export function renderMdProse(state: EditorState, locale: MdEditorLocale, prefix = "md-note",
  onError: (failure: MdReadingError) => void = console.error, options: MarkdownRenderOptions = {}, renderer?: MarkdownRenderer): VNodeChild {
  const policy = { ...options, renderNode: renderProductNode, renderNodeKey: productKey };
  return renderer ? renderer.render(state, locale, prefix, onError, policy) : renderMarkdown(state, locale, prefix, onError, policy);
}
