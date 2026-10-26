import type { QuireLayoutProviderRegistration } from "@quirekit/core/layout-provider";
import type { QuireLayoutProvider } from "./types";

/** Typed Core registration produced for one view layout algorithm. */
export type QuireViewLayoutProviderRegistration =
  QuireLayoutProviderRegistration<QuireLayoutProvider>;

/**
 * Wraps one typed layout provider in renderer-neutral Core registration metadata.
 *
 * Core can diagnose provider ids and node ownership without opening the
 * provider payload. View authority later verifies that the repeated metadata
 * still agrees with the typed payload before execution.
 *
 * @param provider - Provider algorithm and its explicit capability declaration.
 * @returns Core registration carrying the unchanged typed provider payload.
 */
export function createQuireLayoutProviderRegistration(
  provider: QuireLayoutProvider
): QuireViewLayoutProviderRegistration {
  return {
    id: provider.id,
    nodeTypes: provider.nodeTypes,
    capabilities: provider.capabilities,
    provider
  };
}
