import type {
  AddMarkStep,
  AddNodeMarkStep,
  AttrStep,
  DocAttrStep,
  Fragment,
  NodeSelection,
  RemoveMarkStep,
  RemoveNodeMarkStep,
  ReplaceAroundStep,
  ReplaceStep,
  Slice,
  Step,
  StepResult
} from "@quirekit/pm";

/** Structural table-cell selection contract used without a PM tables runtime dependency. */
export interface ProseMirrorCellSelection {
  /** Iterates selected cells using the table selection protocol. */
  readonly forEachCell: (...args: any[]) => unknown;
}

/** @param value - Candidate value. @returns Whether it exposes the ProseMirror Step protocol. */
export function isProseMirrorStep(value: unknown): value is Step {
  if (!isRecord(value)) return false;
  return ["apply", "getMap", "invert", "map", "merge", "toJSON"]
    .every((name) => typeof value[name] === "function");
}

/** @param value - Candidate value. @returns Whether it is an AddMarkStep. */
export function isProseMirrorAddMarkStep(value: unknown): value is AddMarkStep {
  return hasStepJsonType(value, "addMark");
}

/** @param value - Candidate value. @returns Whether it is an AddNodeMarkStep. */
export function isProseMirrorAddNodeMarkStep(value: unknown): value is AddNodeMarkStep {
  return hasStepJsonType(value, "addNodeMark");
}

/** @param value - Candidate value. @returns Whether it is an AttrStep. */
export function isProseMirrorAttrStep(value: unknown): value is AttrStep {
  return hasStepJsonType(value, "attr");
}

/** @param value - Candidate value. @returns Whether it is a DocAttrStep. */
export function isProseMirrorDocAttrStep(value: unknown): value is DocAttrStep {
  return hasStepJsonType(value, "docAttr");
}

/** @param value - Candidate value. @returns Whether it is a RemoveMarkStep. */
export function isProseMirrorRemoveMarkStep(value: unknown): value is RemoveMarkStep {
  return hasStepJsonType(value, "removeMark");
}

/** @param value - Candidate value. @returns Whether it is a RemoveNodeMarkStep. */
export function isProseMirrorRemoveNodeMarkStep(value: unknown): value is RemoveNodeMarkStep {
  return hasStepJsonType(value, "removeNodeMark");
}

/** @param value - Candidate value. @returns Whether it is a ReplaceAroundStep. */
export function isProseMirrorReplaceAroundStep(value: unknown): value is ReplaceAroundStep {
  return hasStepJsonType(value, "replaceAround");
}

/** @param value - Candidate value. @returns Whether it is a ReplaceStep. */
export function isProseMirrorReplaceStep(value: unknown): value is ReplaceStep {
  return hasStepJsonType(value, "replace");
}

/** @param value - Candidate value. @returns Whether it exposes table CellSelection iteration. */
export function isProseMirrorCellSelection(
  value: unknown
): value is ProseMirrorCellSelection {
  return isRecord(value) && typeof value.forEachCell === "function";
}

/** @param value - Candidate value. @returns Whether it exposes a selected node. */
export function isProseMirrorNodeSelection(value: unknown): value is NodeSelection {
  return isRecord(value) && "node" in value && value.node != null;
}

/** @param value - Candidate value. @returns Whether it exposes the Fragment protocol. */
export function isProseMirrorFragment(value: unknown): value is Fragment {
  if (!isRecord(value) || !Array.isArray(value.content) || typeof value.size !== "number") {
    return false;
  }
  return ["nodesBetween", "descendants", "textBetween", "append", "cut", "eq", "child", "forEach"]
    .every((name) => typeof value[name] === "function");
}

/** @param value - Candidate value. @returns Whether it exposes the Slice protocol. */
export function isProseMirrorSlice(value: unknown): value is Slice {
  if (!isRecord(value)) return false;
  return Number.isInteger(value.openStart)
    && Number(value.openStart) >= 0
    && Number.isInteger(value.openEnd)
    && Number(value.openEnd) >= 0
    && typeof value.size === "number"
    && typeof value.eq === "function"
    && typeof value.toJSON === "function"
    && isProseMirrorFragment(value.content);
}

/** @param value - Candidate value. @returns Whether it is a valid StepResult union member. */
export function isProseMirrorStepResult(value: unknown): value is StepResult {
  if (!isRecord(value)) return false;
  return (isRecord(value.doc) && value.failed === null)
    || (typeof value.failed === "string" && value.doc === null);
}

/**
 * Checks one Step using the stable JSON step discriminator.
 *
 * @param value - Candidate step.
 * @param stepType - Expected JSON discriminator.
 * @returns Whether the step matches the requested family.
 */
function hasStepJsonType(value: unknown, stepType: string): boolean {
  if (!isProseMirrorStep(value)) return false;
  const json = value.toJSON();
  return isRecord(json) && json.stepType === stepType;
}

/** @param value - Candidate value. @returns Whether it is a non-null record. */
function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === "object";
}
