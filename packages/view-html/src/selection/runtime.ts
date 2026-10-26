import { MountedDomCaret } from "@quirekit/view/mounted-backend";
import { createHtmlNativeSelectionMirror } from "./native-mirror";
import { createHtmlSelectionRectPool } from "./rect-pool";
import { ensureHtmlSelectionPresentationStyle } from "./style";
import type {
  CreateHtmlSelectionRuntimeOptions,
  HtmlSelectionRuntime,
  HtmlSelectionRuntimeSyncOptions
} from "./types";

/** Creates one custom retained HTML selection presentation runtime. */
class DefaultHtmlSelectionRuntime implements HtmlSelectionRuntime {
  private readonly rectPool;
  private readonly nativeMirror;
  private readonly caret;

  /**
   * Creates custom selection surfaces for one retained document root.
   *
   * @param options - Browser document, overlay host, and retained root.
   */
  constructor(options: CreateHtmlSelectionRuntimeOptions) {
    ensureHtmlSelectionPresentationStyle(options.ownerDocument);
    this.rectPool = createHtmlSelectionRectPool(options.ownerDocument, options.host);
    this.nativeMirror = createHtmlNativeSelectionMirror({
      ownerDocument: options.ownerDocument,
      documentRoot: options.documentRoot
    });
    this.caret = new MountedDomCaret({
      ownerDocument: options.ownerDocument,
      host: options.host,
      className: "qk-html-editor__caret"
    });
  }

  /**
   * Synchronizes one measured selection presentation.
   *
   * @param options - Measured geometry, focus ownership, and visual styles.
   */
  sync(options: HtmlSelectionRuntimeSyncOptions): void {
    const documentFocused = options.focusOwner === "document";
    // Read the already-resolved head's local appearance before overlay writes.
    // The overlay is outside that subtree and cannot inherit its theme itself.
    const caretFillStyle = options.caret && options.editable && documentFocused
      ? resolveCaretFillStyle(options.mirror?.head.node, options.caretFillStyle)
      : options.caretFillStyle;
    // Focus belongs to input/caret ownership; the persisted selection keeps its
    // theme color when a toolbar, another control, or the outside page takes focus.
    this.rectPool.sync(options.selectionRects, options.surfaceClientRect, options.selectionFillStyle);

    this.caret.syncAfterRender(
      documentFocused,
      options.editable && documentFocused,
      options.caret === undefined
        ? undefined
        : {
            left: options.caret.left - options.surfaceClientRect.left,
            top: options.caret.top - options.surfaceClientRect.top,
            width: Math.max(options.caret.right - options.caret.left, 1),
            height: Math.max(options.caret.bottom - options.caret.top, 1),
            color: caretFillStyle
          }
    );

    // Moving the document-wide native Selection after focusing the hidden
    // textarea suppresses Chrome's subsequent text beforeinput events. Editable
    // documents therefore keep model selection entirely in the custom overlay;
    // readonly documents may still expose a native mirror to platform APIs.
    if (documentFocused && !options.editable && options.mirror !== undefined) {
      this.nativeMirror.sync(options.mirror);
    } else {
      this.nativeMirror.suspend();
    }
  }

  /** Removes pooled presentation and native mirror ownership. */
  destroy(): void {
    this.rectPool.destroy();
    this.caret.destroy();
    this.nativeMirror.destroy();
  }
}

/**
 * Resolves the public HTML caret-color override at an owned, measured DOM head.
 * @param node - Current head node; text nodes inherit from their parent element.
 * @param fallback - Configured caret fill for scopes without a local override.
 * @returns Local CSS color, or the original configured fill without extra probes.
 */
function resolveCaretFillStyle(node: Node | undefined, fallback: string): string {
  const element = node?.nodeType === 1 ? node as Element : node?.parentElement;
  const style = element?.ownerDocument.defaultView?.getComputedStyle?.(element);
  const local = style?.getPropertyValue("--qk-html-caret-color").trim();
  return local === "currentColor" ? style!.color : local || fallback;
}

/**
 * Creates custom selection, caret, and native mirror ownership.
 *
 * @param options - Browser document, overlay host, and retained root.
 * @returns Custom retained HTML selection runtime.
 */
export function createHtmlSelectionRuntime(
  options: CreateHtmlSelectionRuntimeOptions
): HtmlSelectionRuntime {
  return new DefaultHtmlSelectionRuntime(options);
}
