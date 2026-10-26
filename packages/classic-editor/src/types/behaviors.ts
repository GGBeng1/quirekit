import type { ClassicEditorBehaviorContext } from "./context";

/** Product behavior that may edit the document, mutate UI state, or call a host service. */
export interface ClassicEditorBehavior {
  /**
   * Reports whether the installed product has the behavior's required capability.
   *
   * @param context - Mounted product, UI, trigger, and caller payload.
   * @returns Whether the capability exists in this product assembly.
   */
  isAvailable?(context: ClassicEditorBehaviorContext): boolean;
  /**
   * Executes through product, editor, UI, or host authorities.
   *
   * @param context - Mounted product, UI, trigger, and caller payload.
   * @returns Whether the behavior handled the request.
   */
  execute(context: ClassicEditorBehaviorContext): boolean | Promise<boolean>;
  /**
   * Reports whether the behavior can run in the current state.
   *
   * @param context - Mounted product, UI, trigger, and caller payload.
   * @returns Whether the behavior is currently executable.
   */
  canExecute?(context: ClassicEditorBehaviorContext): boolean;
  /**
   * Reports toggle state for controls that present an active treatment.
   *
   * @param context - Mounted product, UI, trigger, and caller payload.
   * @returns Whether the behavior is active.
   */
  isActive?(context: ClassicEditorBehaviorContext): boolean;
}

/** Normalized source that invoked one product behavior. */
export interface ClassicEditorBehaviorTrigger {
  /** Product surface or programmatic source that invoked the behavior. */
  readonly source:
    | "api"
    | "keyboard"
    | "menu"
    | "toolbar"
    | "ribbon"
    | "context-menu"
    | "selection-popup"
    | "contextual-popup"
    | "semantic-popmenu"
    | "clipboard"
    | "ruler"
    | "panel"
    | "status-bar";
  /** Surface-specific normalized trigger detail. */
  readonly detail?: unknown;
}
