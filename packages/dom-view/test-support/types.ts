import type { fixture } from "./fixture";

/** Public browser fixture contract shared with browser assertions. */
export type DomFixture = typeof fixture;

declare global {
  /** Browser test access to public editor and plugin APIs. */
  interface Window {
    /** Isolated native DOM editor fixture. */
    domFixture: DomFixture;
  }
}
