import type { QuireEditor, QuireMountedEditorView } from "@quirekit/core";
import type { EditorState, EditorView, Transaction } from "@quirekit/pm";

/** Direction argument accepted by PM `EditorView.endOfTextblock`. */
type QuireInputTextblockDirection = Parameters<EditorView["endOfTextblock"]>[0];

/** Options used to create a PM-like input callback view. */
interface QuireInputEditorViewBridgeOptions {
  /** Editor whose mounted view should be exposed to input handlers. */
  readonly editor: QuireEditor;
  /**
   * Dispatches transactions produced by input handlers.
   *
   * @param transaction - Transaction to dispatch.
   */
  readonly dispatchTransaction: (transaction: Transaction) => void;
  /**
   * Reports whether the input controller is currently composing.
   *
   * @returns Whether IME composition is active.
   */
  readonly composing: () => boolean;
  /**
   * Resolves textblock boundary checks for PM keymap helpers.
   *
   * @param direction - Movement direction requested by the PM command.
   * @param state - Optional state passed by the PM command.
   * @returns Whether movement would leave the current textblock.
   */
  readonly endOfTextblock: (
    direction: QuireInputTextblockDirection,
    state?: EditorState
  ) => boolean;
}

/**
 * Creates a PM-like view object for keyboard, text, and composition props.
 *
 * The bridge exposes the active mounted view's geometry, root, clipboard, and
 * scroll methods while overriding state, dispatch, editable, and composing with
 * input-controller-local values.
 *
 * @param options - Editor and input-controller state accessors.
 * @returns PM-compatible view object for input plugin callbacks.
 */
export function createQuireInputEditorViewBridge(
  options: QuireInputEditorViewBridgeOptions
): EditorView {
  const bridgeTarget = {
    get state() {
      return options.editor.state.pm;
    },
    dispatch(transaction: Transaction): void {
      options.dispatchTransaction(transaction);
    },
    get editable() {
      return options.editor.isEditable;
    },
    get composing() {
      return options.composing();
    },
    get dom() {
      return options.editor.view.elements.root;
    },
    endOfTextblock(
      direction: QuireInputTextblockDirection,
      state?: EditorState
    ): boolean {
      return options.endOfTextblock(direction, state);
    }
  };

  return new Proxy(bridgeTarget as EditorView, {
    get(target, property, receiver) {
      if (property in target) {
        return Reflect.get(target, property, receiver);
      }

      return readMountedViewProperty(options.editor.view, property);
    }
  });
}

/**
 * Reads a property from the current mounted view and preserves method binding.
 *
 * @param view - Mounted view whose PM-like methods should be forwarded.
 * @param property - Property requested by a plugin callback.
 * @returns Forwarded property value.
 */
function readMountedViewProperty(
  view: QuireMountedEditorView,
  property: string | symbol
): unknown {
  const value = Reflect.get(view as unknown as object, property, view);

  return typeof value === "function" ? value.bind(view) : value;
}
