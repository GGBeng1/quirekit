import { intersectQuireRects } from "@quirekit/renderer";
import type { QuirePoint } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../../layout";
import { mapQuireEditableTextNodePointToCaret } from "../../text";
import { mapPointToLayoutNodePosition } from "../layout-hit/node-position";
import { measureQuireSubLayoutLineDistanceY } from "../../sub-layout-query/shared";
import { isQuirePageBodyCaretPosition, readQuirePageBodyCaretLine } from "./line";
import type { QuirePageBodyCaretScope, QuirePageBodyRawCaret } from "./types";

/**
 * Resolves ordinary text through its existing line and trailing-blank mapping.
 * @param source - Ordinary text node, excluding source-only helper geometry.
 * @param scope - Page geometry and admitted source intervals.
 * @param point - Original page-edge pointer coordinate.
 * @returns Mapped raw caret with comparable line geometry, or null without text.
 */
export function resolveQuirePageBodyRawCaret(
  source: QuireLayoutNode,
  scope: QuirePageBodyCaretScope,
  point: QuirePoint
): QuirePageBodyRawCaret | null {
  const fragments = (source.textFragments ?? []).flatMap((fragment) => {
    const line = readQuirePageBodyCaretLine(scope, fragment.rect, fragment.range);
    if (line === null) return [];
    const caretStops = fragment.caretStops.filter((stop) =>
      isQuirePageBodyCaretPosition(line, stop.position.pos));
    return caretStops.length === 0 && fragment.caretStops.length > 0
      ? [] : [{ ...fragment, caretStops }];
  });
  const empty = source.kind === "block" && source.range.to - source.range.from === 2
    && (source.children?.length ?? 0) === 0 && source.subLayoutQueryProducts === undefined;
  if (fragments.length === 0 && (!empty
    || readQuirePageBodyCaretLine(scope, source.rect, source.range) === null)) return null;

  const node = { ...source, textFragments: fragments, children: [] };
  const lines = fragments.length > 0 ? fragments.map((fragment) => fragment.rect) : [source.rect];
  const lineRect = lines.reduce((nearest, rect) =>
    measureQuireSubLayoutLineDistanceY(rect, point.y) < measureQuireSubLayoutLineDistanceY(nearest, point.y)
      ? rect : nearest);
  let mappedPoint = point;
  let mapping = empty
    ? mapPointToLayoutNodePosition(node, point)
    : mapQuireEditableTextNodePointToCaret({ node, point });
  if (mapping === null) {
    mappedPoint = { x: point.x, y: lineRect.y + lineRect.height / 2 };
    mapping = mapQuireEditableTextNodePointToCaret({ node, point: mappedPoint });
  }
  if (mapping === null) return null;
  const fragment = fragments.find((entry) => entry.rect === mapping.rect);
  const admittedLine = readQuirePageBodyCaretLine(scope, mapping.rect, fragment?.range ?? source.range);
  if (admittedLine === null || !isQuirePageBodyCaretPosition(admittedLine, mapping.position.pos)) return null;
  const stop = fragment?.caretStops.find((entry) =>
    entry.position.pos === mapping.position.pos && entry.position.bias === mapping.position.bias);
  const clipped = intersectQuireRects(mapping.rect, scope.page.bodyRect);
  if (clipped === null) return null;
  return {
    node, point: mappedPoint, lineRect: clipped,
    caretX: fragment === undefined ? mapping.rect.x : stop !== undefined
      ? fragment.rect.x + stop.localX
      : fragment.rect.x + (mapping.position.pos >= fragment.range.to ? fragment.rect.width : 0)
  };
}
