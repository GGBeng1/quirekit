import type {
  QuireSelectionAdapter,
  QuireSelectionAdapterRegistrationOptions,
  QuireTypedSelectionAdapterRegistration
} from "./types";

/**
 * Wraps a typed selection adapter in Core's opaque contribution envelope.
 *
 * @param adapter - Renderer-neutral adapter compiled by View Engine.
 * @param options - Optional registration precedence.
 * @returns Core-compatible registration with repeated validation metadata.
 */
export function createQuireSelectionAdapterRegistration(
  adapter: QuireSelectionAdapter,
  options: QuireSelectionAdapterRegistrationOptions = {}
): QuireTypedSelectionAdapterRegistration {
  return {
    id: adapter.id,
    nodeTypes: adapter.nodeTypes,
    ...(options.priority === undefined
      ? {}
      : { priority: options.priority }),
    adapter
  };
}
