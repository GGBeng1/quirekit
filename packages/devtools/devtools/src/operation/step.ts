import {
  collectSliceNodeTypes,
  collectSliceTextPreview,
  readSliceJson
} from "./slice";
import { isPlainObject } from "./preview";
import type { QuireDevtoolsOperationStepSummary } from "../types";

/**
 * Summarizes one ProseMirror step.
 *
 * @param step - Step instance.
 * @param index - Step index.
 * @returns Step summary.
 */
export function summarizeTransactionStep(
  step: unknown,
  index: number
): QuireDevtoolsOperationStepSummary {
  const json = readStepJson(step);
  const slice = readSliceJson(json);
  const nodeTypes = collectSliceNodeTypes(slice);
  const textPreview = collectSliceTextPreview(slice);
  const from = readNumber(json.from);
  const to = readNumber(json.to);
  const insertedSize = readInsertedSize(step, slice);

  return {
    index,
    type: readStepType(step, json),
    ...(from !== undefined ? { from } : {}),
    ...(to !== undefined ? { to } : {}),
    ...(readNumber(json.pos) !== undefined ? { position: readNumber(json.pos) } : {}),
    ...(readNumber(json.gapFrom) !== undefined ? { gapFrom: readNumber(json.gapFrom) } : {}),
    ...(readNumber(json.gapTo) !== undefined ? { gapTo: readNumber(json.gapTo) } : {}),
    ...(from !== undefined && to !== undefined ? { deletedSize: Math.max(0, to - from) } : {}),
    ...(insertedSize !== undefined ? { insertedSize } : {}),
    ...(typeof json.attr === "string" ? { attr: json.attr } : {}),
    ...(readMarkName(json) ? { mark: readMarkName(json)! } : {}),
    ...(nodeTypes.length > 0 ? { nodeTypes } : {}),
    ...(textPreview ? { textPreview } : {})
  };
}

/**
 * Reads a step JSON object.
 *
 * @param step - Step to inspect.
 * @returns Step JSON object.
 */
function readStepJson(step: unknown): Record<string, unknown> {
  try {
    const json = (step as { readonly toJSON?: (() => unknown) | undefined }).toJSON?.();

    return isPlainObject(json) ? json : {};
  } catch {
    return {};
  }
}

/**
 * Reads a human-readable step type.
 *
 * @param step - Step instance.
 * @param json - Step JSON object.
 * @returns Step type.
 */
function readStepType(step: unknown, json: Record<string, unknown>): string {
  return typeof json.stepType === "string"
    ? json.stepType
    : (step as { readonly constructor?: { readonly name?: string } }).constructor?.name ??
        "Step";
}

/**
 * Reads a numeric field.
 *
 * @param value - Raw value.
 * @returns Number when present.
 */
function readNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

/**
 * Reads approximate inserted size.
 *
 * @param step - Step instance.
 * @param sliceJson - Slice JSON object.
 * @returns Inserted size when known.
 */
function readInsertedSize(
  step: unknown,
  sliceJson: Record<string, unknown> | undefined
): number | undefined {
  const slice = (step as { readonly slice?: { readonly size?: number | undefined } }).slice;

  if (typeof slice?.size === "number") {
    return slice.size;
  }

  return Array.isArray(sliceJson?.content) ? sliceJson.content.length : undefined;
}

/**
 * Reads a mark name from step JSON.
 *
 * @param json - Step JSON object.
 * @returns Mark name when available.
 */
function readMarkName(json: Record<string, unknown>): string | undefined {
  const mark = json.mark;

  return isPlainObject(mark) && typeof mark.type === "string" ? mark.type : undefined;
}
