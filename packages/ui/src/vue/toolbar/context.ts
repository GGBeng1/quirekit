import type { ComputedRef, InjectionKey, ShallowRef } from "vue";
import type { QuireKitToolbarOrientation } from "../../components/toolbar/types";

/** One mounted toolbar control registered with its nearest root. */
export interface QuireKitToolbarItemRegistration {
  /** Stable control identity used by the roving-focus model. */
  readonly id: string;
  /** Mounted native button used for DOM order and imperative focus. */
  readonly element: Readonly<ShallowRef<HTMLButtonElement | null>>;
  /** Returns the current disabled state without duplicating child state. */
  readonly isDisabled: () => boolean;
}

/** Private coordination contract shared by one Toolbar root and its controls. */
export interface QuireKitToolbarContext {
  /** Current layout and keyboard-navigation direction. */
  readonly orientation: ComputedRef<QuireKitToolbarOrientation>;
  /** Registers one mounted control with this toolbar. */
  readonly registerItem: (item: QuireKitToolbarItemRegistration) => void;
  /** Removes one unmounted control from this toolbar. */
  readonly unregisterItem: (id: string) => void;
  /** Reconciles the current Tab stop after a disabled-state change. */
  readonly reconcileTabStop: () => void;
  /** Returns the native tabIndex owned by one control. */
  readonly tabIndexFor: (id: string) => 0 | -1;
  /** Makes one pointer- or keyboard-focused control the current Tab stop. */
  readonly setCurrentItem: (id: string) => void;
  /** Applies an owned navigation key and focuses the resolved control. */
  readonly moveFocus: (id: string, key: string) => boolean;
}

/** Typed Vue injection key for one Toolbar coordination scope. */
export const toolbarContextKey = Symbol(
  "QuireKitToolbarContext"
) as InjectionKey<QuireKitToolbarContext>;

/** Inherited availability for a Split Button's custom ColorPicker disclosure. */
export const toolbarSplitDisclosureDisabledKey = Symbol(
  "QuireKitToolbarSplitDisclosureDisabled"
) as InjectionKey<ComputedRef<boolean>>;

/** Width model chosen by the nearest Toolbar root. */
export const toolbarSizingKey = Symbol(
  "QuireKitToolbarSizing"
) as InjectionKey<ComputedRef<"natural" | "units">>;

/** Touch presentation inherited by every built-in control, including Tooltip and overflow. */
export const toolbarMobileKey = Symbol("ToolbarMobile") as InjectionKey<ComputedRef<boolean>>;

/** A mobile vertical command surface supplies visible names without changing entry identity. */
export const toolbarLabelsKey = Symbol("ToolbarLabels") as InjectionKey<ComputedRef<boolean>>;
