import type { QuireLayoutJobRejectionReason } from "../../shared";

/** Canvas action selected after any accelerator job rejection. */
export type CanvasLayoutJobRejectionAction = "fallback" | "retry" | "stop";

/**
 * Resolves how mounted Canvas should react to one layout job rejection.
 *
 * @param reason - Stable rejection reason emitted by layout job authority.
 * @returns Retry, synchronous fallback, or terminal stop policy.
 */
export function resolveCanvasLayoutJobRejectionAction(
  reason: QuireLayoutJobRejectionReason
): CanvasLayoutJobRejectionAction {
  switch (reason) {
    case "canceled":
    case "stale-layout":
    case "stale-state":
    case "superseded":
      return "retry";
    case "failed":
    case "invalid-result":
    case "protocol-mismatch":
      return "fallback";
    case "destroyed":
      return "stop";
  }
}
