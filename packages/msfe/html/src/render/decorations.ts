import { Decoration, type EditorView } from "@quirekit/cm-view";
import type { Range } from "@quirekit/cm-state";
import { voidTags } from "../parse/policy";
import { HtmlTokenWidget } from "./widget";
import type { PreparedHtml } from "./types";

/**
 * Attaches vetted semantics to original CM text; delimiters never become an editable DOM copy.
 * @param view - Canonical source owner.
 * @param plan - Sanitized source-relative ranges.
 * @param offset - Candidate origin in the current Markdown.
 * @returns Marks and newline-preserving replacements compatible with the native selection model.
 */
export function htmlDecorations(view: EditorView, plan: PreparedHtml, offset: number): readonly Range<Decoration>[] {
  const ranges: Range<Decoration>[] = [], empty = new Set<number>();
  /** @param from - Original delimiter start. @param to - End on the same physical line. */
  function hide(from: number, to: number): void {
    ranges.push(Decoration.replace({}).range(offset + from, offset + to));
    const line = view.state.doc.lineAt(offset + from);
    if (!view.state.sliceDoc(line.from, offset + from).trim() && !view.state.sliceDoc(offset + to, line.to).trim()) empty.add(line.from);
  }
  for (const element of plan.fragment.elements) {
    const attributes = plan.attributes.get(element.from)!;
    if (voidTags.has(element.tag)) {
      ranges.push(Decoration.replace({ widget: new HtmlTokenWidget(element.tag as "br" | "hr" | "img", attributes) }).range(offset + element.from, offset + element.to));
      continue;
    }
    hide(element.open.from, element.open.to);
    if (element.close) hide(element.close.from, element.close.to);
    const from = offset + element.open.to, to = offset + element.close!.from;
    const splitContainer = element.multiline && /^(?:div|p|pre|blockquote|[ou]l|li|h[1-6])$/u.test(element.tag);
    if (from < to) ranges.push(Decoration.mark({ tagName: splitContainer ? "span" : element.tag,
      attributes: { ...attributes, class: `msfe-html-element msfe-html-${element.tag} qk-prose-node` } }).range(from, to));
  }
  for (const entity of plan.entities) ranges.push(Decoration.replace({ widget: new HtmlTokenWidget("span", {}, entity.text) }).range(offset + entity.from, offset + entity.to));
  for (const from of empty) ranges.push(Decoration.line({ class: "msfe-html-delimiter-line" }).range(from));
  return ranges;
}
