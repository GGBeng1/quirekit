import type { CommandProps, QuireEditor } from "@quirekit/core";
import { Plugin, PluginKey, type EditorState, type MarkType, type Transaction } from "@quirekit/pm";

/** Local highlighter-pen mode retained outside the document. */
export interface QuireHighlighterPenState {
  /** Whether completed selections receive the pen color. */
  readonly active: boolean;
  /** OOXML highlight token applied by the pen, or null when the pen erases highlight. */
  readonly color: string | null;
}

const inactivePenState: QuireHighlighterPenState = Object.freeze({ active: false, color: null });

/** Plugin key carrying highlighter-pen state and its transition metadata. */
export const highlighterPenPluginKey = new PluginKey<QuireHighlighterPenState>("quireHighlighterPen");

/**
 * Reads the highlighter-pen mode.
 *
 * @param source - QuireKit or ProseMirror editor state.
 * @returns Current pen state, inactive when the plugin is not installed.
 */
export function readHighlighterPenState(source: EditorState | { readonly pm: EditorState }): QuireHighlighterPenState {
  const state = "pm" in source ? source.pm : source;
  return highlighterPenPluginKey.getState(state) ?? inactivePenState;
}

/**
 * Reports whether a transaction switches the pen mode, for narrow product subscriptions.
 *
 * @param transaction - Applied ProseMirror transaction.
 * @returns Whether the transaction carries a pen-state transition.
 */
export function transactionChangesHighlighterPenState(transaction: Transaction): boolean {
  return transaction.getMeta(highlighterPenPluginKey) !== undefined;
}

/**
 * Enters or recolors the pen; a null color turns it into an eraser.
 *
 * @param color - Highlight token, or null to erase.
 * @returns Command that records the mode without a history event.
 */
export function startHighlighterPen(color: string | null) {
  return ({ editor, tr, dispatch }: CommandProps): boolean => {
    if (!editor.isEditable) return false;
    dispatch?.(tr.setMeta(highlighterPenPluginKey, Object.freeze({ active: true, color })).setMeta("addToHistory", false));
    return true;
  };
}

/**
 * Leaves pen mode.
 *
 * @param context - Current command context.
 * @returns Whether an active pen was stopped.
 */
export function stopHighlighterPen({ state, tr, dispatch }: CommandProps): boolean {
  if (!readHighlighterPenState(state).active) return false;
  dispatch?.(tr.setMeta(highlighterPenPluginKey, inactivePenState).setMeta("addToHistory", false));
  return true;
}

/**
 * Applies the active pen to the current selection as one history step.
 *
 * A stroke over text that is already entirely the pen color removes it, as in Word.
 *
 * @param markName - Highlight mark name.
 * @returns Command that reports whether the document changed.
 */
export function applyHighlighterPen(markName: string) {
  return ({ editor, state, tr, dispatch }: CommandProps): boolean => {
    const pen = readHighlighterPenState(state);
    const type = state.schema.marks[markName];
    if (!pen.active || !editor.isEditable || type === undefined || tr.selection.empty) return false;
    const { ranges } = tr.selection;
    const erase = pen.color === null
      || ranges.every(({ $from, $to }) => isUniformlyHighlighted(state, $from.pos, $to.pos, type, pen.color!));
    for (const { $from, $to } of ranges) {
      if (erase) tr.removeMark($from.pos, $to.pos, type);
      else tr.addMark($from.pos, $to.pos, type.create({ color: pen.color }));
    }
    if (!tr.docChanged) return false;
    dispatch?.(tr);
    return true;
  };
}

/**
 * Creates the pen plugin that applies once per completed selection gesture.
 *
 * Pointer sessions emit `pointerup` after the final selection flush and keyboard
 * extension ends on `keyup`, so dragging never touches the document.
 *
 * @param editor - Editor whose completed selections are painted.
 * @returns ProseMirror plugin owning pen state.
 */
export function createHighlighterPenPlugin(editor: QuireEditor): Plugin<QuireHighlighterPenState> {
  /** Paints the settled selection when the mode is active. */
  const paint = (): void => {
    if (readHighlighterPenState(editor.state.pm).active) editor.commands.applyHighlighterPen();
  };
  return new Plugin({
    key: highlighterPenPluginKey,
    state: {
      init: () => inactivePenState,
      apply: (tr, current) => tr.getMeta("quireViewUpdateReason") === "document-replace"
        ? inactivePenState
        : tr.getMeta(highlighterPenPluginKey) ?? current
    },
    props: {
      handleDOMEvents: {
        pointerup: () => { paint(); return false; },
        keyup: (_view, event) => {
          if (isKeyboardSelectionCompletion(event as KeyboardEvent)) paint();
          return false;
        }
      }
    }
  });
}

/**
 * Checks whether every text node in a range carries the given highlight color.
 *
 * @param state - Current state.
 * @param from - Range start.
 * @param to - Range end.
 * @param type - Highlight mark type.
 * @param color - Expected token.
 * @returns Whether the range has text and all of it is highlighted with the color.
 */
function isUniformlyHighlighted(state: EditorState, from: number, to: number, type: MarkType, color: string): boolean {
  let sawText = false;
  let uniform = true;
  state.doc.nodesBetween(from, to, node => {
    if (!uniform || !node.isText) return uniform;
    sawText = true;
    uniform = type.isInSet(node.marks)?.attrs.color === color;
    return false;
  });
  return sawText && uniform;
}

/**
 * Reports whether a keyup ends one keyboard selection gesture.
 *
 * @param event - Browser keyboard event routed by the mounted view.
 * @returns Whether the pen should paint after this event.
 */
function isKeyboardSelectionCompletion(event: KeyboardEvent): boolean {
  return event.shiftKey && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key);
}
