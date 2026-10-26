import type { Mark, MarkType, Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireFormattingCaptureContext } from "../types";
import type { CharacterFormattingSnapshot } from "./types";

/**
 * Reads marks from the first text node at or after the source point.
 *
 * @param document - Current document.
 * @param from - Source selection start.
 * @param empty - Whether the source is a caret.
 * @param fallback - Marks active at the resolved source position.
 * @returns Source marks used to build the character snapshot.
 */
export function readSourceMarks(
  document: ProseMirrorNode,
  from: number,
  empty: boolean,
  fallback: readonly Mark[]
): readonly Mark[] {
  if (empty) return fallback;
  let marks: readonly Mark[] | undefined;
  document.nodesBetween(from, document.content.size, (node, position) => {
    if (marks !== undefined) return false;
    if (node.isText && position + node.nodeSize > from) {
      marks = node.marks;
      return false;
    }
    return true;
  });
  return marks ?? fallback;
}

/**
 * Builds an explicit present/absent snapshot for every formatting mark.
 *
 * @param context - Source editor state and normalized selection.
 * @param marks - Source marks.
 * @param preservedMarks - Semantic mark names excluded from formatting tools.
 * @param preservedTextStyleAttributes - Semantic textStyle fields excluded from snapshots.
 * @returns Canonical character formatting snapshot.
 */
export function captureCharacterFormatting(
  context: QuireFormattingCaptureContext,
  marks: readonly Mark[],
  preservedMarks: ReadonlySet<string>,
  preservedTextStyleAttributes: ReadonlySet<string>
): CharacterFormattingSnapshot {
  const markTypes = context.state.schema.marks;
  const byName = new Map(marks.map(mark => [mark.type.name, mark]));
  const snapshot: Record<string, Readonly<Record<string, unknown>> | null> = {};
  for (const name of Object.keys(markTypes)) {
    if (preservedMarks.has(name)) continue;
    const mark = byName.get(name);
    if (mark === undefined) {
      snapshot[name] = null;
      continue;
    }
    const attrs = name === "textStyle"
      ? omitAttributes(mark.attrs, preservedTextStyleAttributes)
      : { ...mark.attrs };
    snapshot[name] = name === "textStyle" && Object.keys(attrs).length === 0
      ? null
      : Object.freeze(attrs);
  }
  projectInheritedCharacterStyle(context, byName, snapshot);
  return Object.freeze(snapshot);
}

/**
 * Creates an all-off snapshot for direct character formatting.
 *
 * @param markTypes - Schema mark registry.
 * @param preservedMarks - Semantic mark names excluded from clearing.
 * @returns Snapshot that explicitly removes every owned mark.
 */
export function createEmptyCharacterSnapshot(
  markTypes: Readonly<Record<string, MarkType>>,
  preservedMarks: ReadonlySet<string>
): CharacterFormattingSnapshot {
  return Object.freeze(Object.fromEntries(
    Object.keys(markTypes)
      .filter(name => !preservedMarks.has(name))
      .map(name => [name, null])
  ));
}

/**
 * Projects node-level typography when no direct character value overrides it.
 *
 * @param context - Source editor state and selection.
 * @param directMarks - Direct marks keyed by type name.
 * @param snapshot - Mutable explicit character snapshot.
 */
function projectInheritedCharacterStyle(
  context: QuireFormattingCaptureContext,
  directMarks: ReadonlyMap<string, Mark>,
  snapshot: Record<string, Readonly<Record<string, unknown>> | null>
): void {
  const textblock = findClosestTextblock(
    context.state.doc,
    context.selection.from
  );
  if (textblock === null) return;
  let style: import("@quirekit/core").QuireNodeCanvasTextStyle | null = null;
  for (const extension of context.editorState.extensions) {
    const resolve = extension.canvasTextStyle?.[textblock.type.name];
    if (resolve === undefined) continue;
    style = resolve(textblock);
    break;
  }
  if (style === null) return;

  const directTextStyle = directMarks.get("textStyle")?.attrs ?? {};
  if (
    snapshot.bold !== undefined
    && !directMarks.has("bold")
    && directTextStyle.bold == null
    && style.fontWeight === "bold"
  ) {
    snapshot.bold = Object.freeze({});
  }
  if (
    snapshot.italic !== undefined
    && !directMarks.has("italic")
    && directTextStyle.italic == null
    && style.fontStyle === "italic"
  ) {
    snapshot.italic = Object.freeze({});
  }
  if (
    snapshot.textStyle !== undefined
    && directTextStyle.fontFamily == null
    && typeof style.fontFamily === "string"
  ) {
    snapshot.textStyle = Object.freeze({
      ...(snapshot.textStyle ?? {}),
      fontFamily: style.fontFamily
    });
  }
}

/**
 * Finds the closest textblock owning one source document position.
 *
 * @param document - Current document.
 * @param position - Source position.
 * @returns Closest textblock or null outside editable text.
 */
function findClosestTextblock(
  document: ProseMirrorNode,
  position: number
): ProseMirrorNode | null {
  const resolved = document.resolve(Math.max(
    0,
    Math.min(position, document.content.size)
  ));
  for (let depth = resolved.depth; depth >= 0; depth -= 1) {
    const node = resolved.node(depth);
    if (node.isTextblock) return node;
  }
  return null;
}

/**
 * Omits named attributes and null schema defaults from a captured mark.
 *
 * @param source - Complete mark attributes.
 * @param names - Attribute names excluded from formatting capture.
 * @returns Captured visual attribute bag.
 */
function omitAttributes(
  source: Readonly<Record<string, unknown>>,
  names: ReadonlySet<string>
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(source).filter(
    ([name, value]) => !names.has(name) && value !== null && value !== undefined
  ));
}
