import type {
  QuireExtensionViewEventHandler,
  QuireExtensionViewEventHandlerMap
} from "@quirekit/core";
import type {
  WordNumberingMarkerEventPayload,
  WordNumberingMarkerMenuEventDetail
} from "../types";
import {
  wordListMarkerMenuHandlerId,
  wordNumberingMarkerMenuEventName,
  wordTaskMarkerToggleHandlerId
} from "./constants";

/** Minimal renderer event facts consumed by Word numbering events. */
interface WordNumberingViewEvent {
  /** Semantic payload declared by the retained marker target. */
  readonly payload?: unknown;
  /** Browser point supplied by the mounted View runtime. */
  readonly clientPoint?: { readonly x?: unknown; readonly y?: unknown };
  /** Prevents the marker click from becoming a text-selection click. */
  readonly preventDefault?: (() => void) | undefined;
  /** Keeps the marker control from bubbling into document selection routing. */
  readonly stopPropagation?: (() => void) | undefined;
}

/**
 * Toggles one semantic task marker through the exact paragraph position.
 *
 * @param context - Mounted editor event context.
 * @param event - Renderer-neutral target event.
 * @returns Whether the exact task paragraph was changed.
 */
const toggleTaskMarker: QuireExtensionViewEventHandler = (context, event) => {
  if (context.status !== "primary") return false;
  const viewEvent = readViewEvent(event);
  const payload = readMarkerPayload(viewEvent?.payload);
  if (viewEvent === undefined || payload?.kind !== "task") return false;
  const handled = context.editor.commands.toggleWordTaskAtPosition({
    position: payload.position
  });
  if (handled) consumeViewEvent(viewEvent);
  return handled;
};

/**
 * Bridges renderer-neutral marker identity into the product-owned popmenu host.
 *
 * @param context - Mounted editor and View context.
 * @param event - Renderer-neutral marker event.
 * @returns Whether a browser product event was emitted.
 */
const openMarkerMenu: QuireExtensionViewEventHandler = (context, event) => {
  if (context.status !== "primary") return false;
  const viewEvent = readViewEvent(event);
  const marker = readMarkerPayload(viewEvent?.payload);
  const clientPoint = readClientPoint(viewEvent?.clientPoint);
  if (viewEvent === undefined || marker === undefined || clientPoint === undefined) {
    return false;
  }
  const root = context.view.elements.root;
  const EventConstructor = root.ownerDocument.defaultView?.CustomEvent;
  if (EventConstructor === undefined) return false;
  const detail: WordNumberingMarkerMenuEventDetail = { marker, clientPoint };
  root.dispatchEvent(new EventConstructor(wordNumberingMarkerMenuEventName, {
    bubbles: true,
    composed: true,
    detail
  }));
  consumeViewEvent(viewEvent);
  return true;
};

/** qkView event handlers owned by the Word numbering extension. */
export const wordNumberingViewEventHandlers: QuireExtensionViewEventHandlerMap = {
  [wordTaskMarkerToggleHandlerId]: toggleTaskMarker,
  [wordListMarkerMenuHandlerId]: openMarkerMenu
};

/**
 * Reads the narrow renderer event surface used by these handlers.
 *
 * @param value - Unknown renderer event argument.
 * @returns Event-like object, or undefined for invalid input.
 */
function readViewEvent(value: unknown): WordNumberingViewEvent | undefined {
  return value !== null && typeof value === "object"
    ? value as WordNumberingViewEvent
    : undefined;
}

/**
 * Validates semantic marker payload identity.
 *
 * @param value - Unknown target payload.
 * @returns Complete marker payload, or undefined when malformed.
 */
function readMarkerPayload(
  value: unknown
): WordNumberingMarkerEventPayload | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const payload = value as Partial<WordNumberingMarkerEventPayload>;
  if (
    !Number.isInteger(payload.position)
    || typeof payload.kind !== "string"
    || typeof payload.numId !== "string"
    || !Number.isInteger(payload.level)
    || typeof payload.text !== "string"
    || payload.range === undefined
    || !Number.isInteger(payload.range.from)
    || !Number.isInteger(payload.range.to)
  ) {
    return undefined;
  }
  return payload as WordNumberingMarkerEventPayload;
}

/**
 * Reads a finite browser client point.
 *
 * @param value - Candidate point supplied by the renderer event.
 * @returns Finite point or undefined.
 */
function readClientPoint(
  value: WordNumberingViewEvent["clientPoint"]
): WordNumberingMarkerMenuEventDetail["clientPoint"] | undefined {
  return typeof value?.x === "number"
    && Number.isFinite(value.x)
    && typeof value.y === "number"
    && Number.isFinite(value.y)
    ? { x: value.x, y: value.y }
    : undefined;
}

/**
 * Prevents a handled marker control from falling through to text selection.
 *
 * @param event - Validated renderer event.
 */
function consumeViewEvent(event: WordNumberingViewEvent): void {
  event.preventDefault?.();
  event.stopPropagation?.();
}
