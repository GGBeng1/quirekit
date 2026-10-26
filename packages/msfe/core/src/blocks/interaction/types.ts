import type { MsfeCommand } from "../../state/types";
import type { MsfeEditor, MsfeTarget } from "../../editor/types";
import type { SourceBlock, SourceBlockSide, SourceBlankLine } from "../types";

/** Client-space geometry read from the canonical view, never a layout authority. */
export interface SourceBlockRect {
  /** Left visual boundary in CSS pixels. */ readonly left: number;
  /** Top visual boundary in CSS pixels. */ readonly top: number;
  /** Rendered block width. */ readonly width: number;
  /** Rendered block height. */ readonly height: number;
}

/** Passive block and first-row geometry, measured together on the native ancestor path. */
export interface SourceBlockGeometry {
  /** Complete bounds used for selection and drop targets. */ readonly rect: SourceBlockRect;
  /** First rendered native text row, or null for an opaque block widget. */ readonly firstLine: SourceBlockRect | null;
}

/** Current validated insertion boundary during a pointer gesture. */
export interface SourceBlockDrop {
  /** Neighbor in the same structural flow. */ readonly block: SourceBlock;
  /** Before or after that neighbor. */ readonly side: SourceBlockSide;
  /** Passive insertion indicator in client coordinates. */ readonly rect: SourceBlockRect;
}

/** Small transient snapshot for a host-rendered block handle and menu. */
export interface SourceBlockControls {
  /** Canonical editor owning source and history. */ readonly editor: MsfeEditor;
  /** Complete hovered or keyboard-active source block. */ readonly block: SourceBlock;
  /** Current visual bounds. */ readonly rect: SourceBlockRect;
  /** First visual text row for control alignment, or null for an opaque block widget. */ readonly firstLine: SourceBlockRect | null;
  /** Frozen revision and block selection for explicit commands. */ readonly target: MsfeTarget;
  /** True only after crossing the drag threshold. */ readonly dragging: boolean;
  /** Current legal insertion line; null when no move is allowed. */ readonly drop: SourceBlockDrop | null;
  /** Client position of the pointer during drag. */ readonly pointer: { readonly x: number; readonly y: number } | null;
  /** @param event - Real primary pointerdown on the host's drag handle. */
  press(event: PointerEvent): void;
  /** @param open - Host menu state, pinning the current block until closed. */
  pin(open: boolean): void;
  /** @param command - Source planner for the captured block. @returns Whether the exact still-current intent was accepted. */
  run(command: MsfeCommand): boolean;
  /** Restores the native caret after menu dismissal or cancellation. */
  focus(): void;
}

/** Framework-neutral observers; UI remains in the consumer's component/provider tree. */
export interface SourceBlockControlsOptions {
  /** @param controls - Current snapshot, or null after exit/read-only/composition/unmount. */
  readonly change: (controls: SourceBlockControls | null) => void;
  /** @param controls - Exact block pinned by a click or keyboard request. */
  readonly openMenu: (controls: SourceBlockControls) => void;
  /** @param controls - Editable blank line snapshot, or null when no insertion entry is active. */
  readonly insertionChange?: (controls: SourceInsertionControls | null) => void;
  /** @param controls - Blank line pinned by the block-menu keyboard shortcut. */
  readonly openInsertionMenu?: (controls: SourceInsertionControls) => void;
}

/** Host insertion entry for empty source, sharing the block observer without drag semantics. */
export interface SourceInsertionControls {
  /** Canonical editor owning source and history. */ readonly editor: MsfeEditor;
  /** Exact editable empty line and its enclosing flow. */ readonly line: SourceBlankLine;
  /** Native first-row geometry in viewport CSS pixels. */ readonly rect: SourceBlockRect;
  /** Frozen revision and empty-line selection for insertion. */ readonly target: MsfeTarget;
  /** @param open - Pin the insertion position while its menu is open. */ pin(open: boolean): void;
  /** Restores native editing focus after dismissal. */ focus(): void;
}
