import type { ShallowRef } from "vue";
import type { QuireKitToolbarDirection, QuireKitToolbarOrientation, QuireKitToolbarOverflow } from "../../../components/toolbar/types";

/** Reactive public options consumed by the horizontal viewport. */
export interface ToolbarScrollOptions {
  /** Existing element that owns the single toolbar role and keyboard scope. */
  readonly root: ShallowRef<HTMLElement | null>;
  /** Current layout axis; vertical toolbars do not use this viewport behavior. */
  readonly orientation: () => QuireKitToolbarOrientation;
  /** Whether horizontal content should scroll or remain visible. */
  readonly overflow: () => QuireKitToolbarOverflow;
  /** Explicit direction, falling back to the root's inherited CSS direction. */
  readonly direction: () => QuireKitToolbarDirection | undefined;
}

/** Shared native scroll bindings; Toolbar retains ownership of its keyboard scope. */
export type { HorizontalScrollBindings as ToolbarScrollBindings } from "../../shared/horizontal-scroll/types";
