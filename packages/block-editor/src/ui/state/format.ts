import { readFormatPainterState } from "@quirekit/extensions";
import { readUnderlineAttributes } from "@quirekit/extension-underline";
import type { EditorState, Mark, Node } from "@quirekit/pm";
import type { BlockFormattingState } from "./types";
import type { BlockParagraphFeature, BlockParagraphValues } from "../../paragraph/types";
import type { BlockListFeature } from "../../lists/types";

const markNames = ["bold", "italic", "underline", "strike", "code", "superscript", "subscript"];

/**
 * Reads all visible formatting controls in one bounded selection traversal.
 * @param state - Canonical PM state.
 * @param budget - Maximum inspected nodes, independent of document size.
 * @param lists - Optional canonical list projection.
 * @param paragraphs - Optional paragraph owner projection.
 * @returns A uniform/mixed summary; uninspected ranges remain unknown.
 */
export function readBlockFormatting(state: EditorState, budget = 256, lists: BlockListFeature | null = null, paragraphs: BlockParagraphFeature | null = null): BlockFormattingState {
  const { selection } = state;
  const samples: Array<{ marks: readonly Mark[]; block: string; node: Node }> = [];
  let visited = 0;
  let truncated = false;
  /** @param node - Textblock containing the sample. @returns Toolbar block value. */
  function blockName(node: Node): string {
    return node.type.name === "heading" ? `heading:${node.attrs.level}` : node.type.name;
  }
  if (selection.empty) {
    samples.push({ marks: state.storedMarks ?? selection.$from.marks(), block: blockName(selection.$from.parent), node: selection.$from.parent });
  } else {
    // Start at the already-resolved selection path. Do not walk preceding blocks
    // just to reach a caret near the end of a long document.
    /** @param node - Current container. @param start - Its content position. @param depth - Resolved depth. */
    function visit(node: Node, start: number, depth: number): void {
      const onStartPath = depth <= selection.$from.depth && selection.$from.node(depth) === node;
      let index = onStartPath ? selection.$from.index(depth) : 0;
      let pos = onStartPath
        ? depth < selection.$from.depth ? selection.$from.before(depth + 1) : selection.from - selection.$from.textOffset
        : start;
      for (; index < node.childCount && pos < selection.to; index += 1) {
        if (visited >= budget) { truncated = true; return; }
        const child = node.child(index);
        visited += 1;
        if (child.isInline) samples.push({ marks: child.marks, block: blockName(node), node });
        else if (child.isTextblock && child.content.size === 0) samples.push({ marks: [], block: blockName(child), node: child });
        else visit(child, pos + 1, depth + 1);
        pos += child.nodeSize;
        if (truncated) return;
      }
    }
    visit(state.doc, 0, 0);
  }
  /** @param read - Attribute reader for a sample. @returns Uniform value, or null for mixed/unknown. */
  function uniform(read: (sample: typeof samples[number]) => string): string | null {
    const values = samples.map(read);
    if (!truncated && !values.length) return "";
    return !truncated && values.length > 0 && values.every(value => value === values[0]) ? values[0]! : null;
  }
  /** @param marks - Sample marks. @param name - Mark name. @param key - Attribute name. @returns CSS value. */
  function attribute(marks: readonly Mark[], name: string, key: string): string {
    return String(marks.find(mark => mark.type.name === name)?.attrs[key] ?? "");
  }
  const kinds = [...new Set(samples.map(sample => sample.node))].map(node => lists?.kind(node, state.doc) ?? null);
  // Reuse the bounded samples, including stored marks, rather than scanning the selection per control.
  const underlines = new Map(samples.map(sample => {
    const mark = sample.marks.find(mark => mark.type.name === "underline");
    return [sample, mark ? readUnderlineAttributes(mark.attrs) : { underlineType: "none", color: null }];
  }));
  const paragraphValues = [...new Set(samples.map(sample => sample.node))].map(node => paragraphs?.read(node)).filter(Boolean) as BlockParagraphValues[];
  const paragraph = paragraphValues.length ? Object.fromEntries(Object.keys(paragraphValues[0]!).map(key => {
    const field = key as keyof BlockParagraphValues, value = paragraphValues[0]![field];
    return [field, !truncated && paragraphValues.every(item => item[field] === value) ? value : null];
  })) as BlockParagraphValues : null;
  return {
    paragraph,
    underlineStyle: uniform(sample => underlines.get(sample)!.underlineType),
    underlineColor: uniform(sample => underlines.get(sample)!.color ?? ""),
    list: truncated || kinds.some(kind => kind !== kinds[0]) ? "mixed" : kinds[0] ?? null,
    marks: Object.fromEntries(markNames.map(name => {
      const values = samples.map(sample => name === "underline" ? underlines.get(sample)!.underlineType !== "none" : sample.marks.some(mark => mark.type.name === name));
      return [name, truncated || (values.some(Boolean) && !values.every(Boolean)) ? "mixed" : values.length > 0 && values.every(Boolean)];
    })),
    block: uniform(sample => sample.block) || (samples.length ? "mixed" : "paragraph"),
    font: uniform(sample => attribute(sample.marks, "textStyle", "fontFamily")),
    fonts: {
      latin: uniform(sample => attribute(sample.marks, "textStyle", "fontFamilyLatin") || attribute(sample.marks, "textStyle", "fontFamily")),
      eastAsia: uniform(sample => attribute(sample.marks, "textStyle", "fontFamilyEastAsia") || attribute(sample.marks, "textStyle", "fontFamily")),
      complexScript: uniform(sample => attribute(sample.marks, "textStyle", "fontFamilyComplexScript") || attribute(sample.marks, "textStyle", "fontFamily"))
    },
    painter: readFormatPainterState(state).mode !== "off",
    hasCopiedFormat: readFormatPainterState(state).hasSnapshot,
    size: uniform(sample => attribute(sample.marks, "textStyle", "fontSize")),
    color: uniform(sample => attribute(sample.marks, "textStyle", "color")),
    background: uniform(sample => attribute(sample.marks, "textStyle", "backgroundColor")),
    href: uniform(sample => attribute(sample.marks, "link", "href")) ?? "",
    visited, truncated
  };
}
