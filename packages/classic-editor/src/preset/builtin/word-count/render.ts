import { resolveBuiltinClassicEditorMessage } from "../../../localization";
import type { ClassicEditorRenderContext } from "../../../types";
import { summarizeClassicDocumentWords } from "./summary";

/**
 * Renders document word count from retained per-node text summaries.
 * @param context - Mounted product context.
 * @returns Human-readable count under the current product locale's rules.
 */
export function renderBuiltinWordCount(context: ClassicEditorRenderContext): string {
  const { editor, locale } = context;
  const summary = summarizeClassicDocumentWords(editor.state.doc);
  // Chinese counts non-whitespace characters; other locales count whitespace-separated words.
  const count = locale === "zh-CN" ? summary.characters : summary.runs;
  return resolveBuiltinClassicEditorMessage(
    locale,
    count === 1 ? "wordCountOne" : "wordCountMany",
    { count }
  );
}
