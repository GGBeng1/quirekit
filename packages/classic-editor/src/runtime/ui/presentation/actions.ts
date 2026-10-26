import type {
  ClassicEditorActionDefinition, ClassicEditorActionSource, ClassicEditorActionState,
  ClassicEditorRenderContext
} from "../../../types";
import { createActionContext, resolveClassicEditorActionState } from "../action-catalog";
import { createUnavailableClassicEditorActionState, readAvailableClassicEditorActionState } from "../action-state";
import { hasClassicEditorPresentationScope, readClassicEditorPresentationValue } from "./scope";

const occurrenceKey = Symbol("action-context");
const availabilityKey = Symbol("action-availability");
const stateKey = Symbol("action-state");

/**
 * Reads availability without preparing command-enabled or active state.
 * @param action - Direct definition being presented.
 * @param context - Runtime presentation epoch.
 * @param payload - Surface payload, compared by identity.
 * @param source - Presenting surface.
 * @param detail - Surface trigger detail, compared by identity.
 * @returns Whether this occurrence is available in the product.
 */
export function isClassicEditorPresentationActionAvailable(
  action: ClassicEditorActionDefinition,
  context: ClassicEditorRenderContext,
  payload: unknown,
  source: ClassicEditorActionSource,
  detail?: unknown
): boolean {
  const keys = [action, source, payload, detail];
  return readClassicEditorPresentationValue(context, [availabilityKey, ...keys], () => {
    const occurrence = readClassicEditorPresentationValue(context, [occurrenceKey, ...keys],
      () => createActionContext(context, payload, source, detail));
    return action.isAvailable?.(occurrence) !== false;
  });
}

/**
 * Shares display state while keeping public query and execution guards live.
 * @param action - Direct definition being presented.
 * @param context - Runtime presentation epoch.
 * @param payload - Surface payload, compared by identity.
 * @param source - Presenting surface.
 * @param detail - Surface trigger detail, compared by identity.
 * @returns Immutable state for this exact occurrence and current authorities.
 */
export function resolveClassicEditorPresentationActionState(
  action: ClassicEditorActionDefinition,
  context: ClassicEditorRenderContext,
  payload: unknown,
  source: ClassicEditorActionSource,
  detail?: unknown
): ClassicEditorActionState {
  if (!hasClassicEditorPresentationScope(context)) {
    return resolveClassicEditorActionState(action, context, payload, source, detail);
  }
  const keys = [action, source, payload, detail];
  return readClassicEditorPresentationValue(context, [stateKey, ...keys], () => {
    if (!isClassicEditorPresentationActionAvailable(action, context, payload, source, detail)) {
      return createUnavailableClassicEditorActionState();
    }
    const occurrence = readClassicEditorPresentationValue(context, [occurrenceKey, ...keys],
      () => createActionContext(context, payload, source, detail));
    return readAvailableClassicEditorActionState(action, occurrence);
  });
}
