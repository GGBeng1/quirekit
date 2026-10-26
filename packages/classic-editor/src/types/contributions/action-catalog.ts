import type { ClassicEditorText } from "../base";
import type { ClassicEditorRenderContext } from "../context";

/** Product surface that invokes a typed Classic Editor action. */
export type ClassicEditorActionSource =
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

/** Source and optional product detail for one typed action invocation. */
export interface ClassicEditorActionTrigger {
  /** Surface or programmatic caller that invoked the action. */
  readonly source: ClassicEditorActionSource;
  /** Surface-specific normalized trigger detail. */
  readonly detail?: unknown;
}

/** Context supplied to a typed action without a behavior runtime adapter. */
export interface ClassicEditorActionContext extends ClassicEditorRenderContext {
  /** Optional typed payload resolved by the owning surface. */
  readonly payload: unknown;
  /** Normalized source of this action invocation. */
  readonly trigger: ClassicEditorActionTrigger;
}

/** Declarative state resolved for one action on one product surface. */
export interface ClassicEditorActionState {
  /** Whether the action is available in the installed product. */
  readonly available: boolean;
  /** Whether the action can run against the current editor state. */
  readonly canExecute: boolean;
  /** Whether the action is active for the current editor state. */
  readonly active: boolean;
  /** Stable localizable reason shown only for visible disabled actions. */
  readonly reason: ClassicEditorActionReason | null;
}

/** Stable localizable reason for a visible direct action that cannot execute. */
export interface ClassicEditorActionReason {
  /** Machine-stable reason key for analytics, ARIA wiring, and product policy. */
  readonly code: string;
  /** Localizable user-facing explanation. */
  readonly message: ClassicEditorText;
}

/** One typed command definition shared by every projected product surface. */
export interface ClassicEditorActionDefinition {
  /** Stable action id used for diagnostics, not DOM string dispatch. */
  readonly id: string;
  /** Localized default label available to projected controls. */
  readonly label: ClassicEditorText;
  /** Optional compact icon id available to projected controls. */
  readonly icon?: string | undefined;
  /** Optional semantic action group for catalog presentation. */
  readonly group?: string | undefined;
  /** Stable action order inside its semantic group. */
  readonly order: number;
  /** Optional visible shortcut hint. */
  readonly shortcut?: ClassicEditorText | undefined;
  /** Checks whether the installed product provides this action. */
  readonly isAvailable?: ((context: ClassicEditorActionContext) => boolean) | undefined;
  /** Checks whether the action can mutate the current editor state. */
  readonly canExecute?: ((context: ClassicEditorActionContext) => boolean) | undefined;
  /** Checks toggle state without mutating the editor. */
  readonly isActive?: ((context: ClassicEditorActionContext) => boolean) | undefined;
  /** Explains why a visible but disabled action cannot run. */
  readonly disabledReason?: ((
    context: ClassicEditorActionContext
  ) => ClassicEditorActionReason | undefined) | undefined;
  /** Executes exactly once through editor commands, chains, or product UI authority. */
  readonly run: (context: ClassicEditorActionContext) => boolean | Promise<boolean>;
}
