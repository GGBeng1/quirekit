import { onBeforeUnmount, onMounted, watch, type Ref } from "vue";
import type { ClassicEditorRenderContext } from "@classic/types";
import { findHeadingAtReadingLine, type ClassicEditorOutlineAnchor } from "./active-heading";

/** Distance below the scroll container's top edge that counts as the current reading line. */
const readingLineOffset = 48;

/** Quiet period after an outline click, so its own scroll cannot re-select an earlier heading. */
const navigationSettleMs = 400;

/** Quiet period after edits move headings; typing shifts every later anchor on each keystroke. */
const editSettleMs = 400;

/**
 * Highlights the outline heading whose section crosses the reading line while the document scrolls.
 *
 * Work bound: scroll events only schedule one animation frame; each frame performs one binary
 * search over the sorted anchors, i.e. O(log n) `coordsAtPos` geometry queries. Heading moves
 * from edits resolve once edits pause. While the panel
 * is not rendered (a collapsed sidebar), scrolling only marks the highlight stale; it is
 * resolved once the panel has a size again.
 *
 * @param editor - Mounted editor whose view is scrolled.
 * @param anchors - Heading anchors sorted by document position.
 * @param activate - Receives the heading id that owns the reading line.
 * @param visible - Whether the outline panel host currently has a size.
 * @returns Pause hook for outline-initiated navigation.
 */
export function useClassicEditorOutlineScrollFollow(
  editor: Readonly<Ref<ClassicEditorRenderContext["editor"]>>,
  anchors: Readonly<Ref<readonly ClassicEditorOutlineAnchor[]>>,
  activate: (id: string) => void,
  visible: Readonly<Ref<boolean>>
) {
  let frame: number | undefined;
  let pausedUntil = 0;
  let scroller: Element | undefined;
  let stale = false;
  let editTimer: ReturnType<typeof setTimeout> | undefined;
  watch(visible, (shown) => {
    if (shown && stale) schedule();
  }, { flush: "sync" });

  /** @returns The mounted view root, or undefined while the editor is headless. */
  function mountedDom(): HTMLElement | undefined {
    try {
      return editor.value.view.dom;
    } catch {
      return undefined;
    }
  }

  /** Resolves the heading whose top has passed the reading line of the scrolled container. */
  function measure(): void {
    frame = undefined;
    if (performance.now() < pausedUntil || mountedDom() === undefined) return;
    const view = editor.value.view;
    const readingLine = (scroller?.getBoundingClientRect().top ?? 0) + readingLineOffset;
    // Geometry queries avoid page headers and inter-page gaps that a point hit test would land in.
    const id = findHeadingAtReadingLine(anchors.value, position => view.coordsAtPos(position + 1).top, readingLine);
    if (id !== undefined) activate(id);
  }

  /** Coalesces scroll bursts into at most one measurement per frame. */
  function schedule(): void {
    stale = !visible.value;
    if (visible.value && frame === undefined) frame = requestAnimationFrame(measure);
  }

  /** @param event - Any scroll in the document; only ancestors of the editor view are tracked. */
  function handleScroll(event: Event): void {
    const target = event.target instanceof Element ? event.target : document.scrollingElement ?? undefined;
    const dom = mountedDom();
    if (target === undefined || dom === undefined || !target.contains(dom)) return;
    scroller = target;
    schedule();
  }

  document.addEventListener("scroll", handleScroll, { capture: true, passive: true });
  // Resolve the initial position before any scroll, and again when edits move heading positions.
  onMounted(() => {
    const dom = mountedDom();
    scroller = dom === undefined ? undefined : findScrollContainer(dom);
    schedule();
  });
  // Geometry queries for headings outside the mounted pages are expensive, so
  // edits re-resolve the highlight once typing pauses instead of per keystroke.
  watch(anchors, () => {
    clearTimeout(editTimer);
    editTimer = setTimeout(schedule, editSettleMs);
  });
  onBeforeUnmount(() => {
    clearTimeout(editTimer);
    document.removeEventListener("scroll", handleScroll, { capture: true });
    if (frame !== undefined) cancelAnimationFrame(frame);
  });

  return {
    /** Keeps an outline click selected while its own navigation scroll settles. */
    pauseForNavigation(): void {
      pausedUntil = performance.now() + navigationSettleMs;
    }
  };
}

/**
 * Finds the nearest ancestor that scrolls vertically.
 * @param element - Editor view root.
 * @returns Scroll container, or undefined when the document itself scrolls.
 */
function findScrollContainer(element: Element): Element | undefined {
  for (let current = element.parentElement; current !== null; current = current.parentElement) {
    const overflow = getComputedStyle(current).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && current.scrollHeight > current.clientHeight) return current;
  }
  return undefined;
}
