import type { Node as PMNode } from "@quirekit/pm";
import type {
  ProofingBlockContext,
  ProofingDocumentPolicy,
  ProofingInlineRole,
  ProofingLanguageSlots,
  ProofingRange,
  ProofingSurface
} from "../types";
import { ProofingSegmentBuilder } from "./builder";
import { classifyProofingCharacter } from "./scripts";
import type { ExtractedProofingBlock, ExtractedProofingSegment } from "./types";

/** Table cell node names recognised by the default surface rule. */
const tableCellNames = new Set(["tableCell", "tableHeader"]);

/**
 * Extracts the proofing segments of one textblock.
 *
 * Phase order: the surface decides whether the block is checked at all; the
 * inline walk then turns every node into checked text, a word boundary, or
 * nothing, and splits text by the language its script slot resolves to.
 * Offsets stay UTF-16 so providers and PM positions agree code unit by code unit.
 *
 * @param context - Textblock and its position.
 * @param policy - Host document policy.
 * @param excluded - Sorted intervals whose text is never checked.
 * @returns Extracted block.
 */
export function extractProofingBlock(
  context: ProofingBlockContext,
  policy: ProofingDocumentPolicy | null,
  excluded: readonly ProofingRange[]
): ExtractedProofingBlock {
  const from = context.pos;
  const to = context.pos + context.node.nodeSize;
  // Code is never prose, whatever the host policy says.
  const surface = context.node.type.spec.code === true ? null : policy?.blockSurface === undefined
    ? resolveDefaultSurface(context)
    : policy.blockSurface(context);
  if (surface === null) return { from, to, surface, segments: [], key: "skip" };
  const builder = new ProofingSegmentBuilder();
  appendInline(context.node, context.pos + 1, context, policy, excluded, builder);
  const segments = builder.finish();
  return { from, to, surface, segments, key: createBlockKey(surface, segments) };
}

/**
 * Appends the inline children of one node.
 *
 * @param parent - Textblock or inline container.
 * @param contentStart - Document position of the first child.
 * @param context - Owning textblock.
 * @param policy - Host document policy.
 * @param excluded - Sorted excluded intervals.
 * @param builder - Segment accumulator.
 */
function appendInline(
  parent: PMNode,
  contentStart: number,
  context: ProofingBlockContext,
  policy: ProofingDocumentPolicy | null,
  excluded: readonly ProofingRange[],
  builder: ProofingSegmentBuilder
): void {
  parent.forEach((child, offset) => {
    const pos = contentStart + offset;
    const role = !child.isText && isExcluded(excluded, pos) ? "boundary"
      : child.marks.some((mark) => mark.type.spec.code === true) ? "boundary"
        : resolveRole(child, context, policy);
    if (role === "transparent") return;
    if (role === "boundary") {
      builder.boundary();
      return;
    }
    if (!child.isText) {
      if (child.isLeaf) builder.boundary();
      else appendInline(child, pos + 1, context, policy, excluded, builder);
      return;
    }
    appendText(child, pos, policy?.languages?.(child, context) ?? {}, excluded, builder);
  });
}

/**
 * Appends one text node, choosing each letter's language from its script slot.
 *
 * East Asian text without an explicit language becomes a boundary, so it is
 * never checked against a Latin dictionary.
 *
 * @param node - Text node.
 * @param pos - Document position of the node.
 * @param slots - Resolved languages of the node.
 * @param excluded - Sorted excluded intervals, which a text node may cross.
 * @param builder - Segment accumulator.
 */
function appendText(
  node: PMNode,
  pos: number,
  slots: ProofingLanguageSlots,
  excluded: readonly ProofingRange[],
  builder: ProofingSegmentBuilder
): void {
  const latin = slots.latin ?? null;
  const end = pos + node.nodeSize;
  const overlap = findFirstOverlap(excluded, pos, end);
  if (overlap !== undefined && overlap.from <= pos && overlap.to >= end) {
    builder.boundary();
    return;
  }
  const crossesExcluded = overlap !== undefined;
  let offset = 0;
  for (const character of node.text ?? "") {
    const kind = classifyProofingCharacter(character);
    if (crossesExcluded && isExcluded(excluded, pos + offset)) {
      builder.boundary();
    } else if (kind === "east-asian" && (slots.eastAsia ?? null) === null) {
      builder.boundary();
    } else if (kind === "neutral") {
      const open = builder.openLanguage;
      // Whitespace never starts a segment, so text after East Asian runs does not begin with a space.
      if (open !== undefined || !/\s/u.test(character)) {
        builder.append(character, pos + offset, open === undefined ? latin : open, false);
      }
    } else {
      const language = kind === "east-asian"
        ? slots.eastAsia ?? null
        : kind === "complex" ? slots.complexScript ?? latin : latin;
      builder.append(character, pos + offset, language, true);
    }
    offset += character.length;
  }
}

/**
 * Resolves the role of one inline node.
 *
 * @param node - Inline node.
 * @param context - Owning textblock.
 * @param policy - Host document policy.
 * @returns Node role.
 */
function resolveRole(
  node: PMNode,
  context: ProofingBlockContext,
  policy: ProofingDocumentPolicy | null
): ProofingInlineRole {
  if (policy?.inlineRole !== undefined) return policy.inlineRole(node, context);
  return node.isText || !node.isLeaf ? "check" : "boundary";
}

/**
 * Classifies a textblock as table text or body text.
 *
 * @param context - Textblock and its position.
 * @returns Default surface.
 */
function resolveDefaultSurface(context: ProofingBlockContext): ProofingSurface {
  const $pos = context.doc.resolve(context.pos);
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if (tableCellNames.has($pos.node(depth).type.name)) return "table-cell";
  }
  return "body";
}

/**
 * Finds the first sorted interval overlapping a span.
 *
 * @param excluded - Sorted, non-overlapping intervals.
 * @param from - Span start.
 * @param to - Span end.
 * @returns First overlapping interval, or undefined.
 */
function findFirstOverlap(excluded: readonly ProofingRange[], from: number, to: number): ProofingRange | undefined {
  let low = 0;
  let high = excluded.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (excluded[middle]!.to <= from) low = middle + 1;
    else high = middle;
  }
  const candidate = excluded[low];
  return candidate !== undefined && candidate.from < to ? candidate : undefined;
}

/**
 * Tests whether a position lies inside a sorted excluded interval.
 *
 * @param excluded - Sorted, non-overlapping intervals.
 * @param pos - Document position.
 * @returns Whether the position is excluded.
 */
function isExcluded(excluded: readonly ProofingRange[], pos: number): boolean {
  let low = 0;
  let high = excluded.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const range = excluded[middle]!;
    if (pos < range.from) high = middle - 1;
    else if (pos >= range.to) low = middle + 1;
    else return true;
  }
  return false;
}

/**
 * Builds the exact content identity of a block.
 *
 * @param surface - Block surface.
 * @param segments - Extracted segments.
 * @returns Content key.
 */
function createBlockKey(surface: ProofingSurface, segments: readonly ExtractedProofingSegment[]): string {
  return `${surface}\u0001${segments.map((segment) => `${segment.language ?? ""}\u0002${segment.text}`).join("\u0003")}`;
}
