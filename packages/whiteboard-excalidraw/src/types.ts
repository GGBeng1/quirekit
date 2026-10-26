import type { WhiteboardDocument, WhiteboardInlinePreview, WhiteboardScene } from "@quirekit/whiteboard";
/** Public tools supported through the upstream imperative API. */
export type WhiteboardTool = "selection" | "hand" | "rectangle" | "diamond" | "ellipse" | "arrow" | "line" | "freedraw" | "text" | "eraser";
/** Small presentation state; no serialized scene during pointer movement. */
export interface WhiteboardEditorState {
  /** Current tool. */ readonly tool: string;
  /** Current viewport zoom. */ readonly zoom: number;
  /** Whether native composition is active. */ readonly composing: boolean;
}
/** One exact source and its static representation. */
export interface WhiteboardSnapshot {
  /** Frozen source. */ readonly scene: WhiteboardScene;
  /** PNG from this same source. */ readonly preview: WhiteboardInlinePreview;
}
/** Browser mount inputs, isolated per instance. */
export interface WhiteboardEditorOptions {
  /** Empty host owned by the caller. */ readonly container: HTMLElement;
  /** Detached initial document. */ readonly document: WhiteboardDocument;
  /** Host interface language; defaults to Simplified Chinese. */ readonly locale?: string;
  /** Host color scheme. */ readonly theme?: "light" | "dark";
  /** Current permission. */ readonly readOnly?: boolean;
  /** Optional lifecycle cancellation. */ readonly signal?: AbortSignal;
  /** Lightweight source invalidation. */ readonly onChange?: () => void;
  /** @param state - Tool and viewport projection. */ readonly onStateChange?: (state: WhiteboardEditorState) => void;
}
/** Isolated whiteboard runtime, loaded only while authoring. */
export interface WhiteboardEditor {
  /** @returns Passive native source, or null during IME/pointer input; never blurs, paints PNGs or changes history. */ captureDraft(): WhiteboardScene | null;
  /** @returns Frozen source after native input has committed. */ getScene(): Promise<WhiteboardScene>;
  /** @returns Source and PNG produced together. */ snapshot(): Promise<WhiteboardSnapshot>;
  /** @param source - Native upstream file contents. @returns Completion after validation and replacement. */ importScene(source: string): Promise<void>;
  /** @param tool - Drawing mode. */ setTool(tool: WhiteboardTool): void;
  /** @param value - Current permission. */ setReadOnly(value: boolean): void;
  /** @param value - Presentation theme; never persisted in source. */ setTheme(value: "light" | "dark"): void;
  /** @param value - Host interface language; never changes document content. */ setLocale(value: string): void;
  /** Fits all content to the visible host. */ fit(): void;
  /** @param factor - Relative zoom multiplier. */ zoom(factor: number): void;
  /** Returns keyboard input to the drawing surface. */ focus(): void;
  /** Releases React, resize observation and native event listeners exactly once. */ destroy(): void;
}
