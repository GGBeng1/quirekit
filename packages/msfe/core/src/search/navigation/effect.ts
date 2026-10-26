import { StateEffect } from "@quirekit/cm-state";
import type { NavigationRequest } from "./types";

/** Source-neutral intent, interpreted by the sole core navigation owner. */
export const navigationEffect = StateEffect.define<NavigationRequest>({
  /** @param value - Source navigation. @param changes - Native coordinate mapping. @returns Mapped range without changing the source or selection. */
  map(value, changes) { return { ...value, range: value.range.map(changes) }; },
});
