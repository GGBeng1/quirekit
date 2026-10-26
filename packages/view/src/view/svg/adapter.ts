import { createSvgMountedView } from "./mount";
import type {
  SvgMountedView,
  SvgViewAdapter,
  SvgViewAdapterOptions
} from "./types";
import type { QuireMountedEditorViewOptions } from "../shared";

/** View adapter that mounts SVG editor views. */
export class SvgEditorViewAdapter implements SvgViewAdapter {
  /** View mode handled by this adapter. */
  readonly mode = "svg";
  private readonly options: SvgViewAdapterOptions;

  /**
   * Creates an SVG view adapter.
   *
   * @param options - Optional runtime defaults for mounted SVG views.
   */
  constructor(options: SvgViewAdapterOptions = {}) {
    this.options = options;
  }

  /**
   * Mounts an SVG editor view.
   *
   * @param options - Editor state, mount element, identity, and runtime status.
   * @returns Mounted SVG editor view.
   */
  mount(options: QuireMountedEditorViewOptions): SvgMountedView {
    if (options.mode !== this.mode) {
      throw new RangeError(`SVG view adapter cannot mount mode: ${options.mode}`);
    }

    return createSvgMountedView({
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
 * Creates an SVG view adapter for future editor mode registration.
 *
 * @param options - Optional runtime defaults for mounted SVG views.
 * @returns SVG view adapter.
 */
export function createSvgViewAdapter(options?: SvgViewAdapterOptions): SvgViewAdapter {
  return new SvgEditorViewAdapter(options);
}
