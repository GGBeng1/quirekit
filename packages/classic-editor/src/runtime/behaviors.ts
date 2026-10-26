import type {
  ClassicEditorBehavior,
  ClassicEditorBehaviorContext
} from "../types";

/**
 * Reports whether one directly bound contribution behavior is available.
 *
 * @param behavior - Typed contribution behavior.
 * @param context - Current mounted behavior context.
 * @returns Whether the behavior is installed for this editor assembly.
 */
export function isClassicEditorContributionAvailable(
  behavior: ClassicEditorBehavior,
  context: ClassicEditorBehaviorContext | undefined
): boolean {
  return context !== undefined && (behavior.isAvailable?.(context) ?? true);
}

/**
 * Reports whether one directly bound contribution behavior can execute.
 *
 * @param behavior - Typed contribution behavior.
 * @param context - Current mounted behavior context.
 * @returns Whether the behavior is currently executable.
 */
export function canExecuteClassicEditorContribution(
  behavior: ClassicEditorBehavior,
  context: ClassicEditorBehaviorContext | undefined
): boolean {
  return context !== undefined
    && (behavior.isAvailable?.(context) ?? true)
    && (behavior.canExecute?.(context) ?? true);
}

/**
 * Executes one directly bound contribution behavior.
 *
 * @param behavior - Typed contribution behavior.
 * @param context - Current mounted behavior context.
 * @returns Whether the behavior handled the request.
 */
export function executeClassicEditorContribution(
  behavior: ClassicEditorBehavior,
  context: ClassicEditorBehaviorContext | undefined
): boolean | Promise<boolean> {
  if (
    context === undefined
    || behavior.isAvailable?.(context) === false
    || behavior.canExecute?.(context) === false
  ) return false;
  return behavior.execute(context);
}
