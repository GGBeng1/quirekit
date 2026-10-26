import { createHtmlMountedView } from "./mount";
import type {
  HtmlMountedView,
  HtmlViewAdapter,
  HtmlViewAdapterOptions
} from "./types";
import type { QuireMountedEditorViewOptions } from "@quirekit/view/mounted-backend";

/** View adapter that mounts HTML editor views with SVG overlays. */
export class HtmlEditorViewAdapter implements HtmlViewAdapter {
  /** View mode handled by this adapter. */
  readonly mode = "html";
  private readonly options: HtmlViewAdapterOptions;

  /**
   * Creates an HTML view adapter.
   *
   * @param options - Optional runtime defaults for mounted HTML views.
   */
  constructor(options: HtmlViewAdapterOptions = {}) {
    this.options = options;
  }

  /**
   * Mounts an HTML editor view.
   *
   * @param options - Editor state, mount element, identity, and runtime status.
   * @returns Mounted HTML editor view.
   */
  mount(options: QuireMountedEditorViewOptions): HtmlMountedView {
    if (options.mode !== this.mode) {
      throw new RangeError(`HTML view adapter cannot mount mode: ${options.mode}`);
    }

    return createHtmlMountedView({
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
 * Creates an HTML view adapter for editor mode registration.
 *
 * @param options - Optional runtime defaults for mounted HTML views.
 * @returns HTML view adapter.
 */
export function createHtmlViewAdapter(options?: HtmlViewAdapterOptions): HtmlViewAdapter {
  return new HtmlEditorViewAdapter(options);
}
