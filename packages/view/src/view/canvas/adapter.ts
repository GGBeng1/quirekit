import { createCanvasMountedView } from "./mount";
import type {
  CanvasMountedView,
  CanvasViewAdapter,
  CanvasViewAdapterOptions
} from "./types";
import type { QuireMountedEditorViewOptions } from "../shared";

/** View adapter that mounts Canvas 2D editor views. */
export class CanvasEditorViewAdapter implements CanvasViewAdapter {
  /** View mode handled by this adapter. */
  readonly mode = "canvas";
  private readonly options: CanvasViewAdapterOptions;

  /**
   * Creates a Canvas 2D view adapter.
   *
   * @param options - Optional runtime defaults for mounted canvas views.
   */
  constructor(options: CanvasViewAdapterOptions = {}) {
    this.options = options;
  }

  /**
   * Mounts a Canvas 2D editor view.
   *
   * @param options - Editor state, mount element, identity, and runtime status.
   * @returns Mounted canvas editor view.
   */
  mount(options: QuireMountedEditorViewOptions): CanvasMountedView {
    if (options.mode !== this.mode) {
      throw new RangeError(`Canvas view adapter cannot mount mode: ${options.mode}`);
    }

    return createCanvasMountedView({
      editor: options.editor,
      id: options.id,
      status: options.status,
      element: options.element,
      ...(options.ownerDocument === undefined
        ? {}
        : { ownerDocument: options.ownerDocument }),
      runtime: this.options.runtime
    });
  }
}

/**
 * Creates a Canvas 2D view adapter for future editor mode registration.
 *
 * @param options - Optional runtime defaults for mounted canvas views.
 * @returns Canvas 2D view adapter.
 */
export function createCanvasViewAdapter(
  options?: CanvasViewAdapterOptions
): CanvasViewAdapter {
  return new CanvasEditorViewAdapter(options);
}
