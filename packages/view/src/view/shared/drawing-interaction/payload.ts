import type {
  QuireDrawingControlReference,
  QuireDrawingEnterTextEventPayload,
  QuireDrawingManipulationEventPayload,
  QuireDrawingResizeHandle
} from "@quirekit/view-engine";

/**
 * Validates a renderer-neutral drawing text-entry payload.
 *
 * @param value - Candidate payload supplied by selected-object chrome.
 * @returns Typed payload, or undefined when malformed.
 */
export function readQuireDrawingEnterTextEventPayload(
  value: unknown
): QuireDrawingEnterTextEventPayload | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const candidate = value as Readonly<Record<string, unknown>>;
  return isNonEmptyText(candidate.objectId)
    && isNonEmptyText(candidate.drawingId)
    && isNonEmptyText(candidate.storyId)
    ? {
        objectId: candidate.objectId,
        drawingId: candidate.drawingId,
        storyId: candidate.storyId
      }
    : undefined;
}

const resizeHandles = new Set<QuireDrawingResizeHandle>([
  "north-west",
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west"
]);

/**
 * Validates a renderer-neutral selected drawing event payload.
 *
 * @param value - Candidate payload supplied by a compiled target.
 * @returns Typed payload, or undefined when malformed.
 */
export function readQuireDrawingManipulationEventPayload(
  value: unknown
): QuireDrawingManipulationEventPayload | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const candidate = value as Readonly<Record<string, unknown>>;
  const operation = candidate.operation;
  const handle = candidate.handle;
  if (
    !isNonEmptyText(candidate.objectId)
    || !isNonEmptyText(candidate.drawingId)
    || (operation !== "move" && operation !== "resize" && operation !== "rotate" && operation !== "control")
    || typeof candidate.lockAspectRatio !== "boolean"
    || (operation === "resize" && !isResizeHandle(handle))
    || (operation !== "resize" && handle !== undefined)
    || (operation === "control" && !isControlReference(candidate.control))
  ) {
    return undefined;
  }
  return {
    objectId: candidate.objectId,
    drawingId: candidate.drawingId,
    operation,
    ...(operation === "resize" ? { handle: handle as QuireDrawingResizeHandle } : {}),
    ...(operation === "control" ? { control: candidate.control as QuireDrawingControlReference } : {}),
    lockAspectRatio: candidate.lockAspectRatio
  };
}

/**
 * Reports whether a value is non-empty text.
 *
 * @param value - Candidate text.
 * @returns Whether the candidate is non-empty text.
 */
function isNonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Reports whether a value names one directional resize handle.
 *
 * @param value - Candidate handle.
 * @returns Whether the candidate is a resize handle.
 */
function isResizeHandle(value: unknown): value is QuireDrawingResizeHandle {
  return typeof value === "string"
    && resizeHandles.has(value as QuireDrawingResizeHandle);
}

/** @param value - Untrusted control payload. @returns Whether it identifies an endpoint or preset handle. */
function isControlReference(value: unknown): value is QuireDrawingControlReference {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const reference = value as Record<string, unknown>;
  return reference.kind === "endpoint" ? reference.end === "start" || reference.end === "end"
    : reference.kind === "adjustment" && Number.isInteger(reference.index) && (reference.index as number) >= 0;
}
