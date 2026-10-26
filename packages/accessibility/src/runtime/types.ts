import type { QuireMountedViewService } from "@quirekit/view/mounted-services";
import type { QuireAccessibilityDiagnostics } from "../types";

/** Internal mounted policy controlled without touching the PM plugin list. */
export interface AccessibilitySession extends QuireMountedViewService {
  /** @param enabled - Requested policy. */
  setEnabled(enabled: boolean): void;
  /** @returns Whether the explicit reading region acquired focus. */
  focusReading(): boolean;
  /** @returns Whether the canonical text host acquired focus. */
  focusEditing(): boolean;
  /** @returns A copied diagnostic snapshot. */
  diagnostics(): QuireAccessibilityDiagnostics;
}

/** Work counters; never read to decide document behavior. */
export interface AccessibilityWork {
  /** Native context compilation attempts. */
  contextCompiles: number;
  /** Projected native UTF-16 units. */
  contextCharacters: number;
  /** Explicit reading segment compilation attempts. */
  readingCompiles: number;
  /** Reading item DOM replacements. */
  readingDomUpdates: number;
}
