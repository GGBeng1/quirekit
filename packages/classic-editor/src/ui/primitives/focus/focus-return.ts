/** Minimal focusable target contract independent of a DOM editor runtime. */
export interface ClassicPrimitiveFocusTarget {
  /** Whether the target remains connected to its owner document. */
  readonly isConnected?: boolean | undefined;
  /** Moves browser focus to the target. */
  focus(options?: FocusOptions): void;
}

/**
 * Captures a trigger focus target before a controlled surface opens.
 *
 * @param target - Current trigger or active element supplied by the caller.
 * @returns The target only when it can still receive focus.
 */
export function captureClassicPrimitiveFocusTarget(
  target: ClassicPrimitiveFocusTarget | null | undefined
): ClassicPrimitiveFocusTarget | null {
  if (target === null || target === undefined) return null;
  return typeof target.focus === "function" ? target : null;
}

/**
 * Returns focus to a captured trigger without assuming an editor DOM exists.
 *
 * @param target - Previously captured trigger focus target.
 * @returns Whether focus restoration was attempted successfully.
 */
export function restoreClassicPrimitiveFocus(
  target: ClassicPrimitiveFocusTarget | null | undefined
): boolean {
  if (target === null || target === undefined || target.isConnected === false) {
    return false;
  }
  try {
    target.focus({ preventScroll: true });
    return true;
  } catch {
    return false;
  }
}
