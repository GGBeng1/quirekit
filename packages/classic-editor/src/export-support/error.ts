import type { ClassicEditorFixedLayoutFrameErrorCode } from "./types";

/** Typed failure raised by format-neutral Classic frame compilation. */
export class ClassicEditorFixedLayoutFrameError extends Error {
  /** Stable machine-readable failure reason. */
  readonly code: ClassicEditorFixedLayoutFrameErrorCode;

  /**
   * Creates a fixed-layout frame compilation error.
   *
   * @param code - Stable failure reason.
   * @param message - Human-readable format-neutral explanation.
   */
  constructor(
    code: ClassicEditorFixedLayoutFrameErrorCode,
    message: string
  ) {
    super(message);
    this.name = "ClassicEditorFixedLayoutFrameError";
    this.code = code;
  }
}
