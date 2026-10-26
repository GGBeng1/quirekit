import type {
  CreateHtmlNativeSelectionMirrorOptions,
  HtmlNativeSelectionEndpoints,
  HtmlNativeSelectionMirror
} from "./types";

/** Creates a non-authoritative browser Selection mirror. */
class DefaultHtmlNativeSelectionMirror implements HtmlNativeSelectionMirror {
  /**
   * Creates a native mirror for one retained document root.
   *
   * @param options - Browser document and retained ownership root.
   */
  constructor(private readonly options: CreateHtmlNativeSelectionMirrorOptions) {}

  /**
   * Mirrors exact model anchor/head direction into browser Selection.
   *
   * @param endpoints - Owned retained DOM endpoints.
   */
  sync(endpoints: HtmlNativeSelectionEndpoints): void {
    if (
      !this.options.documentRoot.contains(endpoints.anchor.node)
      || !this.options.documentRoot.contains(endpoints.head.node)
    ) {
      throw new RangeError(
        "HTML native selection mirror requires retained document ownership."
      );
    }
    const selection = this.options.ownerDocument.getSelection?.();
    if (!selection) {
      return;
    }
    if (typeof selection.setBaseAndExtent === "function") {
      selection.setBaseAndExtent(
        endpoints.anchor.node,
        endpoints.anchor.offset,
        endpoints.head.node,
        endpoints.head.offset
      );
      return;
    }
    if (typeof selection.extend === "function") {
      selection.collapse(endpoints.anchor.node, endpoints.anchor.offset);
      selection.extend(endpoints.head.node, endpoints.head.offset);
      return;
    }
    const range = this.options.ownerDocument.createRange();
    range.setStart(endpoints.anchor.node, endpoints.anchor.offset);
    range.setEnd(endpoints.head.node, endpoints.head.offset);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /** Suspends mirror writes without clearing another control's native selection. */
  suspend(): void {
    // Browser Selection is process-global for the document. Clearing it here
    // would also clear a toolbar or NodeView control's native text selection.
  }

  /** Releases native selection only when it is still owned by this document. */
  destroy(): void {
    const selection = this.options.ownerDocument.getSelection?.();
    if (!selection || !selection.anchorNode) {
      return;
    }
    if (this.options.documentRoot.contains(selection.anchorNode)) {
      selection.removeAllRanges();
    }
  }
}

/**
 * Creates a non-authoritative browser selection mirror.
 *
 * @param options - Browser document and retained ownership root.
 * @returns Native selection mirror.
 */
export function createHtmlNativeSelectionMirror(
  options: CreateHtmlNativeSelectionMirrorOptions
): HtmlNativeSelectionMirror {
  return new DefaultHtmlNativeSelectionMirror(options);
}
