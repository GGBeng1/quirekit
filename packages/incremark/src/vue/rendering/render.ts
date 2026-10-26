import type { VNodeChild } from "vue";
import type { EditorState } from "@quirekit/cm-state";
import { renderMarkdown as renderCore, projectMarkdown as projectCore } from "@quirekit/incremark-core";
import type { MarkdownLocale, MarkdownReadingError } from "../../types";
import type { MarkdownRenderOptions } from "../types";
import type { ReadingProjection } from "./types";
import { vueAdapter } from "./adapter";

/** @param state - Accepted source. @param locale - Control language. @param prefix - Instance namespace.
 * @param onError - Failure observer. @param options - Presentation configuration.
 * @returns Ordinary safe Vue projection over the shared core walker. */
export function renderMarkdown(state: EditorState, locale: MarkdownLocale, prefix = "md-note", onError: (error: MarkdownReadingError) => void = console.error,
  options: MarkdownRenderOptions = {}): VNodeChild {
  return renderCore(vueAdapter, state, locale, prefix, onError, options);
}

/** @param state - Accepted source. @param locale - Control language. @param prefix - Instance namespace.
 * @param onError - Failure observer. @param options - Presentation configuration. @param projection - Optional retention/instrumentation.
 * @returns Vue output with source fallback for unknown or incomplete syntax. */
export function projectMarkdown(state: EditorState, locale: MarkdownLocale, prefix: string, onError: (error: MarkdownReadingError) => void,
  options: MarkdownRenderOptions, projection?: ReadingProjection): VNodeChild {
  return projectCore(vueAdapter, state, locale, prefix, onError, options, projection);
}
