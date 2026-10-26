import { QuireLayoutJobExecutionError } from "../errors";
import type {
  QuireRemainderPaginationJobOutput,
  QuireRemainderPaginationJobPayload
} from "./types";

/**
 * Validates the clone-safe remainder pagination payload boundary.
 *
 * @param payload - Unknown request payload.
 * @returns Validated payload.
 */
export function requireRemainderPaginationPayload(
  payload: unknown
): QuireRemainderPaginationJobPayload {
  requireStructuredClonePayload(payload);
  if (
    !isRecord(payload)
    || typeof payload.requestKey !== "string"
    || !isMeasuredContainer(payload.container)
    || !isPageGeometry(payload.pageGeometry)
    || typeof payload.geometryKey !== "string"
    || !isOptionalPositiveInteger(payload.widows)
    || !isOptionalPositiveInteger(payload.orphans)
  ) {
    throw invalidPayload("Remainder pagination requires measured flow and page geometry.");
  }
  return payload as unknown as QuireRemainderPaginationJobPayload;
}

/**
 * Proves that main-thread fallback input can cross the eventual Worker boundary.
 *
 * @param payload - Unknown request payload.
 */
function requireStructuredClonePayload(payload: unknown): void {
  try {
    structuredClone(payload);
  } catch {
    throw invalidPayload("Remainder pagination payload is not structured-clone safe.");
  }
}

/**
 * Validates accepted remainder pagination output.
 *
 * @param output - Unknown executor output.
 * @returns Validated renderer-neutral output.
 */
export function requireRemainderPaginationOutput(
  output: unknown
): QuireRemainderPaginationJobOutput {
  if (
    !isRecord(output)
    || typeof output.requestKey !== "string"
    || typeof output.geometryKey !== "string"
    || !Array.isArray(output.fragments)
    || !output.fragments.every(isPageFragment)
  ) {
    throw invalidPayload("Remainder pagination output requires a complete page stream.");
  }
  return output as unknown as QuireRemainderPaginationJobOutput;
}

/** @param value - Unknown value. @returns Whether it is a record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** @param value - Unknown container. @returns Whether required measured facts exist. */
function isMeasuredContainer(value: unknown): boolean {
  if (!isRecord(value) || typeof value.id !== "string" || !isRange(value.range)
    || !Array.isArray(value.items)) {
    return false;
  }
  return value.items.every((item) => isRecord(item)
    && typeof item.id === "string"
    && isRange(item.range)
    && isFiniteNumber(item.height));
}

/** @param value - Unknown geometry. @returns Whether both page rectangles are finite. */
function isPageGeometry(value: unknown): boolean {
  return isRecord(value)
    && isRect(value.pageRect)
    && isRect(value.bodyRect)
    && isOptionalPageBodyRectVariants(value.bodyRectVariants)
    && (value.pageGap === undefined || isFiniteNumber(value.pageGap));
}

/**
 * Checks optional first/even/odd body rectangles at the Worker boundary.
 *
 * @param value - Unknown body-variant record.
 * @returns Whether every provided page-position rectangle is finite.
 */
function isOptionalPageBodyRectVariants(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }
  return isRecord(value)
    && (value.first === undefined || isRect(value.first))
    && (value.odd === undefined || isRect(value.odd))
    && (value.even === undefined || isRect(value.even));
}

/** @param value - Unknown page fragment. @returns Whether required fragment facts exist. */
function isPageFragment(value: unknown): boolean {
  return isRecord(value)
    && Number.isInteger(value.pageIndex)
    && isRange(value.range)
    && isRect(value.pageRect)
    && isRect(value.bodyRect)
    && isRect(value.rect)
    && isRecord(value.endInfo)
    && Array.isArray(value.endInfo.openMarks)
    && Array.isArray(value.endInfo.openNodes);
}

/** @param value - Unknown range. @returns Whether it is finite and ordered. */
function isRange(value: unknown): boolean {
  return isRecord(value)
    && isFiniteNumber(value.from)
    && isFiniteNumber(value.to)
    && value.from <= value.to;
}

/** @param value - Unknown rectangle. @returns Whether all geometry is finite. */
function isRect(value: unknown): boolean {
  return isRecord(value)
    && isFiniteNumber(value.x)
    && isFiniteNumber(value.y)
    && isFiniteNumber(value.width)
    && isFiniteNumber(value.height);
}

/** @param value - Unknown value. @returns Whether it is finite. */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** @param value - Unknown policy value. @returns Whether it is absent or positive. */
function isOptionalPositiveInteger(value: unknown): boolean {
  return value === undefined || (Number.isInteger(value) && Number(value) > 0);
}

/** @param message - Failure detail. @returns Explicit invalid-payload error. */
function invalidPayload(message: string): QuireLayoutJobExecutionError {
  return new QuireLayoutJobExecutionError("invalid-payload", message);
}
