import type { ComputedRef, Ref, ShallowRef, WritableComputedRef } from "vue";
import type { QuireKitImagePreviewItem, QuireKitImagePreviewOptions } from "../types";

/** One mounted image supplies its own resource and eligibility state. */
export interface ImagePreviewGroupMember {
  /** Stable instance identity, independent of duplicate source URLs. */
  readonly id: string;
  /** Image-owned element used to determine document order. */
  readonly element: Readonly<Ref<HTMLElement | null>>;
  /** Original or responsive resource selected by the Image owner. */
  readonly item: ComputedRef<QuireKitImagePreviewItem>;
  /** Whether this image participates, including images still loading. */
  readonly enabled: ComputedRef<boolean>;
}

/** Internal bridge from an image to its containing preview group. */
export interface ImagePreviewGroupContext {
  /** @param member - Mounted image. @returns Unregister callback. */
  readonly register: (member: ImagePreviewGroupMember) => () => void;
  /** @param id - Clicked image identity. @param trigger - Focus restoration target. @param options - Per-image overrides. @returns Whether the group handled this request. */
  readonly open: (id: string, trigger: HTMLElement, options?: QuireKitImagePreviewOptions) => boolean;
}

/** Reactive inputs for the existing ImagePreview presentation and controls. */
export interface ImagePreviewGroupState {
  /** Registration and open bridge provided by the owning container. */
  readonly context: ImagePreviewGroupContext;
  /** Re-evaluate reading order after the owning collection reorders mounted children. */
  readonly refresh: () => void;
  /** Eligible resources in reading order. */
  readonly items: ComputedRef<readonly QuireKitImagePreviewItem[]>;
  /** Shared preview visibility. */
  readonly opened: Ref<boolean>;
  /** Current resource index, preserving identity during membership changes. */
  readonly index: WritableComputedRef<number>;
  /** Options supplied by the image that opened the group. */
  readonly options: ShallowRef<QuireKitImagePreviewOptions | undefined>;
  /** @returns Connected original trigger, if still mounted. */
  readonly finalFocusEl: () => HTMLElement | null;
}
