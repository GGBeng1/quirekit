import type { SelectionRange } from "@quirekit/cm-state";
import type { QuireKitSelectionHandle } from "@quirekit/ui";

/** Captured directed range; endpoint identity survives crossing. */
export interface MobileSelectionSession {
  /** Endpoint captured by the public handle, or focus for a surface hold. */
  readonly handle: QuireKitSelectionHandle;
  /** Native selection at acquisition, before any handle movement. */
  readonly range: SelectionRange;
}
