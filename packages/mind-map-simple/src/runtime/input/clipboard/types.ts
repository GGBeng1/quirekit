import type { MindMapClipboard, MindMapDocument, MindMapPoint } from "@quirekit/mind-map";

/** Canvas clipboard operations supplied by the instance controller. */
export interface MindMapClipboardActions {
  /** @returns Explicit source read, only when clipboard data is actually consumed. */ read(): MindMapDocument;
  /** @param ids - Captured topmost selection. @returns Atomic removal completion. */ remove(ids: readonly string[]): Promise<void>;
  /** @param fragment - Validated source fragment. @param target - Captured destination. @returns Atomic paste completion. */
  paste(fragment: MindMapClipboard, target: string | MindMapPoint): Promise<void>;
  /** @returns Whether a source operation is pending. */ busy(): boolean;
  /** @returns Current authoring permission. */ readOnly(): boolean;
  /** @returns Whether native composition currently owns the input. */ composing(): boolean;
  /** @param error - Validation or event failure. */ report(error: unknown): void;
}
