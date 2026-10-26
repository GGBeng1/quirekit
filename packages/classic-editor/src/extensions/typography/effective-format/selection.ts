import type {
  QuireEditor,
  QuireNodeCanvasTextStyle
} from "@quirekit/core";
import type {
  ClassicEffectiveFormatSample,
  ClassicEffectiveFormatState,
  ClassicPmNode,
  ClassicPmMark,
  ClassicSelectedTextSegment
} from "./types";

/**
 * Collects the text and inheritance context covered by the current selection.
 *
 * @param editor - Mounted editor whose ProseMirror selection should be read.
 * @returns At least one segment, including a synthetic caret segment when empty.
 */
export function collectClassicSelectedTextSegments(
  editor: QuireEditor
): readonly ClassicSelectedTextSegment[] {
  const selection = editor.state.pm.selection;
  if (selection.empty) {
    const head = selection.$head;
    return [{
      text: readClassicCaretTextHint(head.nodeAfter?.textContent, head.nodeBefore?.textContent),
      marks: editor.state.pm.storedMarks ?? head.marks(),
      ...findClassicCaretTextblock(head)
    }];
  }

  const segments: ClassicSelectedTextSegment[] = [];
  for (const range of selection.ranges) editor.state.doc.nodesBetween(
    range.$from.pos,
    range.$to.pos,
    (node, position, parent) => {
      if (!node.isText || parent === null) return;
      const source = node.text ?? "";
      const from = Math.max(0, range.$from.pos - position);
      const to = Math.min(source.length, range.$to.pos - position);
      if (to <= from) return;
      segments.push({
        text: source.slice(from, to),
        marks: node.marks,
        ...findClassicCaretTextblock(editor.state.doc.resolve(position + from))
      });
    }
  );

  if (segments.length > 0) return segments;
  const head = selection.$head;
  return [{
    text: readClassicCaretTextHint(head.nodeAfter?.textContent, head.nodeBefore?.textContent),
    marks: editor.state.pm.storedMarks ?? head.marks(),
    ...findClassicCaretTextblock(head)
  }];
}

/**
 * Resolves one extension-owned node text style with View Engine ordering.
 *
 * @param editor - Editor containing resolved extensions.
 * @param node - Owning text block.
 * @returns First declared node text style or null.
 */
export function resolveClassicNodeTextStyle(
  editor: QuireEditor,
  node: ClassicPmNode
): QuireNodeCanvasTextStyle | null {
  for (const extension of editor.extensions) {
    const resolve = extension.canvasTextStyle?.[node.type.name];
    if (resolve !== undefined) return resolve(node);
  }
  return null;
}

/**
 * Finds the canonical textStyle mark in one mark set.
 *
 * @param marks - Active inline marks.
 * @returns Text-style mark or undefined.
 */
export function findClassicTextStyleMark(
  marks: readonly ClassicPmMark[]
): ClassicPmMark | undefined {
  return marks.find((mark) => mark.type.name === "textStyle");
}

/**
 * Compares effective samples without conflating inheritance and mixed state.
 *
 * @param samples - Resolved values in source order.
 * @param equal - Field-specific equality predicate.
 * @returns One single value or explicit mixed result.
 */
export function compareClassicEffectiveSamples<Value>(
  samples: readonly ClassicEffectiveFormatSample<Value>[],
  equal: (left: Value, right: Value) => boolean
): ClassicEffectiveFormatState<Value> {
  const first = samples[0];
  if (first === undefined) {
    throw new Error("Classic effective format projection requires one sample.");
  }
  const hasDirect = samples.some((sample) => sample.hasDirect);
  return samples.every((sample) => equal(first.value, sample.value))
    ? { kind: "single", value: first.value, hasDirect }
    : { kind: "mixed", hasDirect };
}

/**
 * Finds the closest text block that owns a collapsed selection.
 *
 * @param position - Resolved ProseMirror selection head.
 * @returns Closest textblock and its content start, or the structural parent.
 */
function findClassicCaretTextblock(
  position: QuireEditor["state"]["pm"]["selection"]["$head"]
): Pick<ClassicSelectedTextSegment, "textblock" | "contentStart"> {
  for (let depth = position.depth; depth >= 0; depth -= 1) {
    const node = position.node(depth);
    if (node.isTextblock) return { textblock: node, contentStart: position.start(depth) };
  }
  return { textblock: position.parent, contentStart: position.start() };
}

/**
 * Reads one nearby text hint around a collapsed selection.
 *
 * @param after - Text after the caret, if any.
 * @param before - Text before the caret, if any.
 * @returns One nearby Unicode character or an empty string.
 */
function readClassicCaretTextHint(
  after: string | undefined,
  before: string | undefined
): string {
  const afterCharacter = Array.from(after ?? "")[0];
  if (afterCharacter !== undefined) return afterCharacter;
  return Array.from(before ?? "").at(-1) ?? "";
}
