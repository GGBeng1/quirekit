import type { QuireSelectionCommandRoute } from "@quirekit/view-engine";
import type {
  QuireSourceRangeCommandCapability,
  QuireSourceRangeCommandGuard
} from "./types";

/**
 * Reads and validates the source range and capability required for a command.
 *
 * @param commandRoute - Routed command facts.
 * @param capability - Capability required by the command.
 * @returns Either a validated range or the effect that explains why it is absent.
 */
export function readQuireSourceRangeCommandGuard(
  commandRoute: QuireSelectionCommandRoute,
  capability: QuireSourceRangeCommandCapability
): QuireSourceRangeCommandGuard {
  if (commandRoute.activeCapabilities === undefined) {
    return { effect: "missing-command-capability" };
  }

  if (!commandRoute.activeCapabilities[capability]) {
    return { effect: "blocked-capability" };
  }

  const range = commandRoute.activeSource?.range;

  if (range === undefined || range.from >= range.to) {
    return { effect: "missing-command-source" };
  }

  return { range };
}
