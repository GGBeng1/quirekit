import type { ClassicEditorRenderContext } from "../../types";
import type { ClassicMobileShellOptions, ClassicMobileShellController } from "./types";
import { bindClassicMobilePinch } from "./pinch";
import { createClassicMobileSelection } from "./selection";
import { reconcileClassicMobilePreferences } from "./preferences";
import { resolveClassicMobileVisualFrame } from "./viewport";

/**
 * Adapts chrome to its container and visual viewport without remounting the editor.
 * @param options - Stable shell, reactive presentation and document stage.
 * @returns Context refresh and deterministic teardown.
 */
export function createClassicMobileShell(options: ClassicMobileShellOptions): ClassicMobileShellController {
  const { elements, model, stage } = options;
  const { root } = elements;
  const host = root.parentElement!;
  const win = root.ownerDocument.defaultView!;
  let frame = 0;
  let context: ClassicEditorRenderContext | undefined;
  let releaseSelection: (() => void) | undefined;
  let selectionEditor: ClassicEditorRenderContext["editor"] | undefined;
  let selectionLocale: ClassicEditorRenderContext["locale"] | undefined;
  const releasePinch = bindClassicMobilePinch(options);

  /** Applies one breakpoint transition; ordinary selection updates do not rewrite preferences. */
  function reconcile(): void {
    if (!context) return;
    reconcileClassicMobilePreferences(context.ui, model.compact === true);
    const editor = model.compact ? context.editor : undefined;
    if (editor !== selectionEditor || context.locale !== selectionLocale) {
      releaseSelection?.();
      selectionEditor = editor;
      selectionLocale = context.locale;
      releaseSelection = editor ? createClassicMobileSelection(context, elements) : undefined;
    }
  }
  /** Reads the host once, then projects only shell dimensions and caret visibility. */
  function measure(): void {
    frame = 0;
    const rect = host.getBoundingClientRect();
    const compact = rect.width > 0 && rect.width <= 768;
    model.compact = compact;
    root.dataset.layout = compact ? "compact" : "desktop";
    const visual = win.visualViewport;
    if (compact && visual && visual.scale === 1) {
      const visible = resolveClassicMobileVisualFrame(rect, {
        pageTop: visual.pageTop,
        height: visual.height,
        documentTop: root.ownerDocument.documentElement.getBoundingClientRect().top
      });
      root.style.setProperty("--qk-classic-visual-height", `${visible.height}px`);
      root.style.setProperty("--qk-classic-visual-top", `${visible.offset}px`);
      // The root already follows the visual viewport; selection scrolling that
      // moved the window would only push it under the keyboard.
      root.dataset.qkScrollBoundary = "";
    } else {
      root.style.removeProperty("--qk-classic-visual-height");
      root.style.removeProperty("--qk-classic-visual-top");
      delete root.dataset.qkScrollBoundary;
    }
    reconcile();
    stage.schedule();
    // A keyboard can occlude the caret without blurring it. The View's selection
    // scrolling stays the only caret-visibility authority; never refocus here.
    if (compact && context?.editor.isFocused) context.editor.view.scrollToSelection();
  }
  /** Coalesces rotation, keyboard animation and host resizing into one measurement. */
  function schedule(): void { if (!frame) frame = win.requestAnimationFrame(measure); }
  const observer = new ResizeObserver(schedule);
  observer.observe(host);
  win.visualViewport?.addEventListener("resize", schedule);
  win.visualViewport?.addEventListener("scroll", schedule);
  win.addEventListener("resize", schedule);
  measure();
  return {
    update(next) { context = next; reconcile(); },
    destroy() {
      win.cancelAnimationFrame(frame);
      observer.disconnect();
      win.visualViewport?.removeEventListener("resize", schedule);
      win.visualViewport?.removeEventListener("scroll", schedule);
      win.removeEventListener("resize", schedule);
      releasePinch();
      releaseSelection?.();
    }
  };
}
