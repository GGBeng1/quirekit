import type { QuireRetainedRegionSelectionPolicyKind } from "../../layout";
import type {
  QuireInteractionSelectionCommandTargetKind,
  QuireInteractionSelectionTarget
} from "./types";

/** Explicit selection-domain and command-target pair. */
export interface QuireInteractionSelectionDomainRoute {
  /** Selection domain that interprets the retained hit. */
  readonly domain: QuireInteractionSelectionTarget["domain"];
  /** Command target that receives commands for the retained hit. */
  readonly commandTarget: QuireInteractionSelectionCommandTargetKind;
}

/**
 * Applies an explicit retained-region policy above interaction-hit semantics.
 *
 * @param policy - Region-owned selection policy, when declared.
 * @param fallback - Domain represented by the concrete interaction hit.
 * @returns Domain and command target selected by the canonical policy.
 */
export function resolveQuireSelectionPolicyDomain(
  policy: QuireRetainedRegionSelectionPolicyKind | undefined,
  fallback: QuireInteractionSelectionDomainRoute
): QuireInteractionSelectionDomainRoute {
  switch (policy) {
    case "delegate-to-text":
      // Delegation classifies generic caret/text hits inside an editable region;
      // it must not erase a concrete structural target such as a table cell.
      return fallback.domain === "text"
        ? { domain: "text", commandTarget: "editable-text" }
        : fallback;
    case "readonly-text":
      return { domain: "readonly-text", commandTarget: "readonly-text" };
    case "node-selection":
      return { domain: "node", commandTarget: "node" };
    case "object-selection":
      return { domain: "object", commandTarget: "object" };
    case "control-dispatch":
      return { domain: "control", commandTarget: "control" };
    default:
      return fallback;
  }
}

/**
 * Maps retained interaction hit kinds to selection domains and command targets.
 *
 * @param hitKind - Retained interaction hit kind to classify.
 * @returns Selection domain and command target pair for the hit.
 */
export function resolveQuireInteractionHitSelectionDomain(
  hitKind: QuireInteractionSelectionTarget["hitKind"]
): QuireInteractionSelectionDomainRoute {
  switch (hitKind) {
    case "text":
      return { domain: "text", commandTarget: "editable-text" };
    case "cell":
      return { domain: "cell", commandTarget: "table-cells" };
    case "node":
      return { domain: "node", commandTarget: "node" };
    case "object":
      return { domain: "object", commandTarget: "object" };
    case "media":
      return { domain: "object", commandTarget: "media" };
    case "embed":
      return { domain: "object", commandTarget: "embed" };
    case "content-control":
      return { domain: "control", commandTarget: "content-control" };
    case "widget":
      return { domain: "control", commandTarget: "widget" };
    case "field":
      return { domain: "text", commandTarget: "field" };
    case "readonly-text":
      return { domain: "readonly-text", commandTarget: "readonly-text" };
    case "boundary-caret":
      return { domain: "boundary-caret", commandTarget: "editable-text" };
    case "control":
      return { domain: "control", commandTarget: "control" };
    case "position":
      return { domain: "text", commandTarget: "editable-text" };
    default:
      return { domain: "unknown", commandTarget: "unknown" };
  }
}
