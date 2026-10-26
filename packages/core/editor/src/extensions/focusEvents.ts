import { Plugin, PluginKey } from "@quirekit/pm";
import { Extension } from "../extension";

/** Plugin key for the Tiptap-compatible focus-events extension. */
export const focusEventsPluginKey = new PluginKey("focusEvents");

/** Tiptap-compatible extension that turns view focus and blur into transactions. */
export const FocusEvents = Extension.create({
  name: "focusEvents",

  /**
   * Creates the focus and blur DOM-event bridge.
   *
   * @returns Plugin list containing the focus-events bridge.
   */
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: focusEventsPluginKey,
        props: {
          handleDOMEvents: {
            focus: (view, event: Event) => {
              const transaction = view.state.tr
                .setMeta("focus", { event })
                .setMeta("addToHistory", false);

              view.dispatch(transaction);

              return false;
            },
            blur: (view, event: Event) => {
              const transaction = view.state.tr
                .setMeta("blur", { event })
                .setMeta("addToHistory", false);

              view.dispatch(transaction);

              return false;
            }
          }
        }
      })
    ];
  }
});
