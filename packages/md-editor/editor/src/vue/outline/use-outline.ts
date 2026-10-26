import { computed, onBeforeUnmount, shallowRef, watch } from "vue";
import { EditorSelection, type EditorState, type Text } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import { syntaxTree } from "@quirekit/cm-language";
import type { Tree } from "@lezer/common";
import { requestMarkdownParse } from "@quirekit/msfe-core";
import { buildMdOutlineTree, findMdOutlineHeading, readMdOutline, type MdOutlineEntry } from "../../outline";
import type { MdOutlineOptions } from "./types";

/** Quiet period before edited headings are reread; typing shifts every later heading. */
const editSettleMs = 300;
/** Quiet period after outline navigation, so its own scroll cannot reselect a passed heading. */
const navigationSettleMs = 400;

/** @param left - Previous entries. @param right - Fresh entries. @returns Whether ids (source starts), levels and text all match. */
function sameEntries(left: readonly MdOutlineEntry[], right: readonly MdOutlineEntry[]): boolean {
  return left.length === right.length && left.every((entry, index) => {
    const other = right[index]!;
    return entry.id === other.id && entry.level === other.level && entry.text === other.text;
  });
}

/**
 * Keeps the outline entries current and highlights the heading that owns the reading line.
 *
 * Work bound: transactions only compare document and tree identity; entries are reread once
 * edits pause. Scrolls schedule one frame, which binary-searches the sorted headings through
 * CodeMirror's height map, so offscreen virtualized headings need no DOM. While the outline
 * is not presented, nothing is read and the next presentation refreshes once.
 *
 * @param options - Reactive editor, state, presentation and chrome geometry.
 * @returns Outline tree, active heading and navigation.
 */
export function useMdOutline(options: MdOutlineOptions) {
  const entries = shallowRef<readonly MdOutlineEntry[]>([]), active = shallowRef<string>();
  const tree = computed(() => buildMdOutlineTree(entries.value));
  let timer: ReturnType<typeof setTimeout> | undefined, frame: number | undefined, pausedUntil = 0;
  let readDoc: Text | undefined, readTree: Tree | undefined, scroller: Element | undefined;

  /** @returns Mounted view of the current editor, if any. */
  function view(): EditorView | null {
    const editor = options.editor();
    return editor ? EditorView.findFromDOM(editor.element) : null;
  }

  /** Rereads entries from the accepted parse; an incomplete parse keeps the previous outline. */
  function refresh(): void {
    timer = undefined;
    const editor = options.editor();
    if (!editor || !options.presented()) return;
    const next = readMdOutline(editor, options.untitled());
    if (!next) { requestMarkdownParse(editor.state); return; }
    if (!sameEntries(entries.value, next)) entries.value = next;
    schedule();
  }

  // Phase 1: source changes. Identity checks per transaction; one reread per edit pause.
  watch([options.state, options.presented] as const, ([state, presented]: readonly [EditorState | undefined, boolean]) => {
    if (!state || !presented) return;
    const doc = state.doc, parsed = syntaxTree(state);
    if (doc === readDoc && parsed === readTree) return;
    const initial = readDoc === undefined || !entries.value.length;
    readDoc = doc; readTree = parsed;
    if (timer) clearTimeout(timer);
    if (initial) refresh(); else timer = setTimeout(refresh, editSettleMs);
  }, { immediate: true });
  watch(options.presented, presented => { if (!presented) { readDoc = undefined; readTree = undefined; } });

  /** Phase 2: one geometry read per frame against the client-space reading line. */
  function measure(): void {
    frame = undefined;
    const current = view();
    if (!current || !options.presented() || performance.now() < pausedUntil || !entries.value.length) return;
    const length = current.state.doc.length, box = scroller ?? current.dom.ownerDocument.scrollingElement;
    const topOf = (from: number): number => current.documentTop + current.lineBlockAt(Math.min(from, length)).top;
    // Trailing headings can never reach the reading line; at the end, the last one in view owns it.
    const atEnd = !!box && box.scrollTop > 0 && box.scrollTop + box.clientHeight >= box.scrollHeight - 8;
    const line = atEnd ? (box === current.dom.ownerDocument.scrollingElement ? current.dom.ownerDocument.defaultView!.innerHeight : box.getBoundingClientRect().bottom) - 1 : options.readingLine();
    const id = findMdOutlineHeading(entries.value, topOf, line);
    if (id !== undefined && id !== active.value) active.value = id;
  }

  /** Coalesces scroll and resize bursts into at most one measurement per frame. */
  function schedule(): void {
    if (frame === undefined && typeof requestAnimationFrame === "function") frame = requestAnimationFrame(measure);
  }

  /** @param event - Any scroll in the owner document; only ancestors of the editor are tracked. */
  function scrolled(event: Event): void {
    const current = view(), target = event.target;
    if (!current) return;
    if (target === current.dom.ownerDocument) scroller = undefined;
    else if (target instanceof Element && target.contains(current.dom)) scroller = target;
    else return;
    schedule();
  }

  watch(options.editor, (editor, _previous, cleanup) => {
    const doc = editor?.element.ownerDocument, win = doc?.defaultView;
    if (!doc || !win) return;
    doc.addEventListener("scroll", scrolled, { capture: true, passive: true });
    win.addEventListener("resize", schedule, { passive: true });
    cleanup(() => { doc.removeEventListener("scroll", scrolled, { capture: true }); win.removeEventListener("resize", schedule); });
  }, { immediate: true });

  /** @param id - Outline entry chosen by the user. */
  function navigate(id: string): void {
    const editor = options.editor(), entry = entries.value.find(item => item.id === id);
    if (!editor || !entry) return;
    active.value = id; pausedUntil = performance.now() + navigationSettleMs;
    // Selecting inside a collapsed section unfolds it through the heading feature.
    editor.setSelection(EditorSelection.single(entry.from)); editor.scrollTo(entry.from); editor.focus();
  }

  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer);
    if (frame !== undefined) cancelAnimationFrame(frame);
  });
  return { tree, active, navigate, entries };
}

