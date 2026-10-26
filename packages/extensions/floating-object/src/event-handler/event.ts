import type { QuireViewPointerSession } from "@quirekit/renderer";
import type {
  FloatingObjectManipulation,
  FloatingObjectResizeDirection
} from "../types";

/**
 * Reads a document range from one renderer-neutral event target.
 *
 * @param event - Candidate qkView event.
 * @returns Exact target range, when complete.
 */
export function readEventTargetRange(
  event: unknown
): { readonly from: number; readonly to: number } | undefined {
  const range = (event as { readonly target?: { readonly range?: unknown } }).target?.range;
  if (typeof range !== "object" || range === null) return undefined;
  const value = range as { readonly from?: unknown; readonly to?: unknown };
  return typeof value.from === "number" && Number.isFinite(value.from)
    && typeof value.to === "number" && Number.isFinite(value.to)
    ? { from: value.from, to: value.to }
    : undefined;
}

/**
 * Reads a valid manipulation payload from the current event binding.
 *
 * @param event - Candidate qkView event.
 * @returns Move or exact directional resize payload.
 */
export function readManipulationPayload(
  event: unknown
): FloatingObjectManipulation | undefined {
  const payload = (event as { readonly payload?: unknown }).payload;
  if (isRecord(payload) && payload.kind === "move") return { kind: "move" };
  return isRecord(payload)
    && payload.kind === "resize"
    && isResizeDirection(payload.direction)
    ? { kind: "resize", direction: payload.direction }
    : undefined;
}

/**
 * Reads stable captured pointer facts from one runtime event.
 *
 * @param event - Candidate qkView event.
 * @returns Valid pointer session, when present.
 */
export function readPointerSession(
  event: unknown
): QuireViewPointerSession | undefined {
  const session = (event as { readonly pointerSession?: unknown }).pointerSession;
  if (
    !isRecord(session)
    || !isRecord(session.point)
    || !isRecord(session.previousPoint)
  ) {
    return undefined;
  }
  return isPointerPhase(session.phase)
    && isFinitePoint(session.point)
    && isFinitePoint(session.previousPoint)
    ? session as unknown as QuireViewPointerSession
    : undefined;
}

/**
 * Prevents browser default behavior when supported by the mounted event.
 *
 * @param event - Candidate qkView event.
 */
export function preventEventDefault(event: unknown): void {
  const candidate = event as { readonly preventDefault?: unknown };
  if (typeof candidate.preventDefault === "function") candidate.preventDefault();
}

/**
 * Keeps a manipulation gesture on the exact captured target path.
 *
 * @param event - Candidate qkView event.
 */
export function stopEventPropagation(event: unknown): void {
  const candidate = event as { readonly stopPropagation?: unknown };
  if (typeof candidate.stopPropagation === "function") {
    candidate.stopPropagation();
  }
}

/**
 * Requests shared runtime pointer capture on gesture start.
 *
 * @param event - Candidate qkView event.
 */
export function captureEventPointer(event: unknown): void {
  const candidate = event as { readonly capturePointer?: unknown };
  if (typeof candidate.capturePointer === "function") candidate.capturePointer();
}

/**
 * Reports whether a value is one canonical resize direction.
 *
 * @param value - Candidate direction.
 * @returns Whether the direction is supported by a visible handle.
 */
function isResizeDirection(value: unknown): value is FloatingObjectResizeDirection {
  return value === "north"
    || value === "north-east"
    || value === "east"
    || value === "south-east"
    || value === "south"
    || value === "south-west"
    || value === "west"
    || value === "north-west";
}

/**
 * Reports whether a value is one captured pointer lifecycle phase.
 *
 * @param value - Candidate phase.
 * @returns Whether the phase belongs to the shared session contract.
 */
function isPointerPhase(value: unknown): boolean {
  return value === "start"
    || value === "update"
    || value === "end"
    || value === "cancel";
}

/**
 * Reports whether a record contains finite x and y coordinates.
 *
 * @param value - Candidate point record.
 * @returns Whether both coordinates are finite.
 */
function isFinitePoint(value: Readonly<Record<string, unknown>>): boolean {
  return typeof value.x === "number" && Number.isFinite(value.x)
    && typeof value.y === "number" && Number.isFinite(value.y);
}

/**
 * Reports whether a value is a non-null record.
 *
 * @param value - Candidate value.
 * @returns Whether record access is safe.
 */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}
