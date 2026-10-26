import type { fixture } from "./fixture";

declare global {
  /** Public fixture probes, deliberately excluding private mounted runtime objects. */
  interface Window {
    /** Consumer-owned fixture exposing canonical editor commands and diagnostics. */
    accessibilityFixture: typeof fixture;
  }
}
