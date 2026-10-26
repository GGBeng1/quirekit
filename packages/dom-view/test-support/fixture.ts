import { Editor, Extension, Node, Mark, type QuireEditorOptions } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { Plugin, PluginKey, Decoration, DecorationSet, TextSelection } from "@quirekit/pm";
import { EditorView } from "@quirekit/pm-view";
import { DomViewExtension, DomEditorView } from "../src/index";
import "@quirekit/pm-view/style/prosemirror.css";

let editor: Editor;
/**
 * Creates a fresh consumer using public editor APIs and opt-in DOM mounting.
 * @param options - Fixture-specific content and extensions.
 * @returns Shared editor instance.
 */
function create(options: QuireEditorOptions = {}): Editor {
  editor?.destroy();
  editor = new Editor({
    extensions: [StarterKit, DomViewExtension],
    ...options,
    element: document.querySelector<HTMLElement>("#editor")!,
    mode: "dom"
  });
  return editor;
}

export const fixture = {
  create, Editor, Extension, Node, Mark, StarterKit, Plugin, PluginKey,
  Decoration, DecorationSet, TextSelection, EditorView, DomViewExtension,
  /** @returns Current fixture editor. */
  get editor() { return editor; },
  /** @returns Concrete native DOM facade for geometry/lifecycle checks. */
  get view() { return editor.view as DomEditorView; }
};
Object.assign(window, { domFixture: fixture });
create();
document.querySelector("#bold")!.addEventListener("click", () => editor.chain().focus().toggleBold().run());
document.querySelector("#submit")!.addEventListener("click", () => {
  document.querySelector("#output")!.textContent = JSON.stringify(editor.getJSON(), null, 2);
});
