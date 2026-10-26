import {
  AttrStep,
  Fragment,
  Mark,
  ReplaceStep,
  Slice,
  type Node as PMNode,
  type Step,
  type Transform
} from "@quirekit/pm";
import { alignWordTableChildren } from "./lineage";

/**
 * Writes the minimal steps that turn one node into its continuation.
 *
 * Positions are read from the node before any of its own steps: attributes do
 * not move positions, and children are written right to left, so every earlier
 * child offset stays valid while later siblings change size.
 *
 * @param transform - Scratch transform positioned on the previous document.
 * @param pos - Absolute position before the node in the transform document.
 * @param previous - Node before the transform.
 * @param next - Required node after the transform.
 * @returns Whether every difference was expressed by an applicable step.
 */
export function writeWordTableNodeUpdate(
  transform: Transform,
  pos: number,
  previous: PMNode,
  next: PMNode
): boolean {
  if (previous === next) return true;
  if (previous.type !== next.type || !Mark.sameSet(previous.marks, next.marks)) {
    return false;
  }
  for (const key of Object.keys(next.attrs)) {
    if (equalAttrValue(previous.attrs[key], next.attrs[key])) continue;
    if (!applyStep(transform, new AttrStep(pos, key, next.attrs[key]))) return false;
  }
  if (previous.content === next.content || previous.content.eq(next.content)) {
    return true;
  }
  return next.inlineContent
    ? writeInlineUpdate(transform, pos + 1, previous.content, next.content)
    : writeChildrenUpdate(transform, pos, previous, next);
}

/**
 * Writes block children as kept, updated, inserted, and deleted runs.
 *
 * @param transform - Scratch transform.
 * @param pos - Absolute position before the container.
 * @param previous - Container before the transform.
 * @param next - Container after the transform.
 * @returns Whether every child difference was applied.
 */
function writeChildrenUpdate(
  transform: Transform,
  pos: number,
  previous: PMNode,
  next: PMNode
): boolean {
  const offsets = readChildOffsets(previous);
  const alignment = alignWordTableChildren(previous, next);

  for (let index = alignment.length - 1; index >= 0; index -= 1) {
    const entry = alignment[index]!;
    if (entry.kind === "same") continue;
    if (entry.kind === "update") {
      const updated = writeWordTableNodeUpdate(
        transform,
        pos + 1 + offsets[entry.previousIndex]!,
        previous.child(entry.previousIndex),
        next.child(entry.nextIndex)
      );
      if (!updated) return false;
      continue;
    }
    const inserted: PMNode[] = [];
    for (let child = entry.nextFrom; child < entry.nextTo; child += 1) {
      inserted.push(next.child(child));
    }
    const replaced = applyStep(transform, new ReplaceStep(
      pos + 1 + offsets[entry.previousFrom]!,
      pos + 1 + offsets[entry.previousTo]!,
      new Slice(Fragment.fromArray(inserted), 0, 0)
    ));
    if (!replaced) return false;
  }
  return true;
}

/**
 * Replaces only the differing span of textblock inline content.
 *
 * @param transform - Scratch transform.
 * @param contentPos - Absolute position of the textblock content start.
 * @param previous - Inline content before the transform.
 * @param next - Inline content after the transform.
 * @returns Whether the replacement applied.
 */
function writeInlineUpdate(
  transform: Transform,
  contentPos: number,
  previous: Fragment,
  next: Fragment
): boolean {
  const start = previous.findDiffStart(next);
  const end = previous.findDiffEnd(next);
  if (start === null || end === null) return true;
  // Repeated characters can make the two scans overlap; widen both ends equally.
  const overlap = Math.max(0, start - Math.min(end.a, end.b));
  return applyStep(transform, new ReplaceStep(
    contentPos + start,
    contentPos + end.a + overlap,
    new Slice(next.cut(start, end.b + overlap), 0, 0)
  ));
}

/**
 * Lists child start offsets plus the content end.
 *
 * @param node - Container node.
 * @returns Offsets relative to the container content start.
 */
function readChildOffsets(node: PMNode): readonly number[] {
  const offsets: number[] = [];
  node.forEach((_child, offset) => offsets.push(offset));
  offsets.push(node.content.size);
  return offsets;
}

/**
 * Applies one step when it is valid for the current scratch document.
 *
 * @param transform - Scratch transform.
 * @param step - Candidate step.
 * @returns Whether the step applied.
 */
function applyStep(transform: Transform, step: Step): boolean {
  return !transform.maybeStep(step).failed;
}

/**
 * Compares attribute values with the deep semantics used by node equality.
 *
 * @param left - Previous attribute value.
 * @param right - Next attribute value.
 * @returns Whether both values are deeply equal.
 */
function equalAttrValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (
    left === null || right === null
    || typeof left !== "object" || typeof right !== "object"
    || Array.isArray(left) !== Array.isArray(right)
  ) {
    return false;
  }
  if (Array.isArray(left)) {
    const values = right as readonly unknown[];
    return left.length === values.length
      && left.every((value, index) => equalAttrValue(value, values[index]));
  }
  const leftRecord = left as Readonly<Record<string, unknown>>;
  const rightRecord = right as Readonly<Record<string, unknown>>;
  const keys = Object.keys(leftRecord);
  return keys.length === Object.keys(rightRecord).length
    && keys.every(key => key in rightRecord && equalAttrValue(leftRecord[key], rightRecord[key]));
}
