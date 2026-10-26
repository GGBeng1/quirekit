import { shallowReactive } from "vue";
import type { QuireEditor } from "@quirekit/core";
import type { ClassicSearchMode, ClassicSearchSessionState } from "./types";

/** Longest selection copied into the query when the panel opens. */
const maximumPrefillLength = 120;

/** Root-local bridge between search triggers and the floating search panel. */
export class ClassicSearchSession {
  /** Panel-visible state shared by every trigger and the mounted panel. */
  readonly state = shallowReactive<ClassicSearchSessionState>({
    open: false,
    mode: "find",
    findText: "",
    replaceText: "",
    caseSensitive: false,
    wholeWord: false,
    ignoreWidth: false,
    inSelection: false,
    scopeRange: null,
    focusRequest: 0
  });

  private hosts = 0;
  private returnFocus: HTMLElement | null = null;

  /**
   * Registers a mounted panel host; triggers fall through while none exists.
   *
   * @returns Cleanup for this host.
   */
  attach(): () => void {
    this.hosts += 1;
    let attached = true;
    return () => {
      if (!attached) return;
      attached = false;
      this.hosts -= 1;
      if (this.hosts === 0) this.state.open = false;
    };
  }

  /**
   * Opens the panel, or refocuses it in the requested mode.
   *
   * @param editor - Editor whose selection may prefill the query.
   * @param mode - Requested panel mode.
   * @param ownerDocument - Document whose focused element regains focus on close.
   * @returns Whether a panel host accepted the request.
   */
  open(editor: QuireEditor, mode: ClassicSearchMode, ownerDocument: Document): boolean {
    if (this.hosts === 0) return false;
    this.state.mode = mode === "replace" && !editor.isEditable ? "find" : mode;
    const selected = readPrefill(editor);
    if (selected !== null) this.state.findText = selected;
    if (!this.state.open) {
      // Like Word, a selection too long to be the query becomes the optional search range.
      const { from, to } = editor.state.pm.selection;
      this.state.scopeRange = selected === null && to > from ? { from, to } : null;
      this.state.inSelection = false;
      const activeElement = ownerDocument.activeElement;
      this.returnFocus = activeElement instanceof HTMLElement ? activeElement : null;
      this.state.open = true;
    }
    this.state.focusRequest += 1;
    return true;
  }

  /** Closes the panel and returns focus to where the user opened it. */
  close(): void {
    if (!this.state.open) return;
    this.state.open = false;
    const target = this.returnFocus;
    this.returnFocus = null;
    if (target?.isConnected) target.focus({ preventScroll: true });
  }
}

/**
 * Reads a short single-block selection used as the initial query.
 *
 * @param editor - Editor instance.
 * @returns Selected text, or null when the selection is empty, multi-block, or long.
 */
function readPrefill(editor: QuireEditor): string | null {
  const { from, to, $from, $to } = editor.state.pm.selection;
  if (from === to || $from.parent !== $to.parent || to - from > maximumPrefillLength) return null;
  const text = editor.state.pm.doc.textBetween(from, to, "", "");
  return text.trim().length === 0 ? null : text;
}

const sessions = new WeakMap<QuireEditor, ClassicSearchSession>();

/**
 * Resolves the search session owned by one editor.
 *
 * @param editor - Editor instance.
 * @returns Stable session.
 */
export function getClassicSearchSession(editor: QuireEditor): ClassicSearchSession {
  let session = sessions.get(editor);
  if (session === undefined) {
    session = new ClassicSearchSession();
    sessions.set(editor, session);
  }
  return session;
}
