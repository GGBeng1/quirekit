import { expect, test } from "@playwright/test";
import type { EditorState } from "@quirekit/pm";
import "./types";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#editor .ProseMirror")).toBeVisible();
});

test("native plugin lifecycle, decorations, filtered/appended state and bounded updates", async ({ page }) => {
  const result = await page.evaluate(() => {
    const f = window.domFixture;
    let creates = 0, updates = 0, destroys = 0, serialized = 0;
    let native = true;
    const plugin = new f.Plugin({
      filterTransaction: tr => !tr.doc.textContent.includes("blocked"),
      appendTransaction(transactions, _old, state) {
        if (transactions.some(tr => tr.docChanged) && state.doc.textContent === "append") {
          return state.tr.insertText("!", 7);
        }
        return null;
      },
      props: {
        decorations: (state: EditorState) => state.doc.textContent.length > 0
          ? f.DecorationSet.create(state.doc, [f.Decoration.inline(1, 2, { class: "decorated" })])
          : null
      },
      view(view) {
        creates++;
        native &&= view instanceof f.EditorView;
        return { update(next) { updates++; native &&= next instanceof f.EditorView; }, destroy() { destroys++; } };
      }
    });
    const extension = f.Extension.create({ name: "native-test", addProseMirrorPlugins() { return [plugin]; } });
    f.create({ extensions: [f.StarterKit, f.DomViewExtension, extension] });
    const getJSON = f.editor.getJSON.bind(f.editor);
    f.editor.getJSON = () => { serialized++; return getJSON(); };
    const before = updates;
    f.view.pasteText("append");
    const acceptedUpdates = updates - before;
    const appended = f.editor.getText();
    const same = f.view.nativeView.state === f.editor.state.pm;
    const decoration = f.view.dom.querySelector(".decorated")?.textContent;
    const after = updates;
    f.view.update({ editor: f.editor, reason: "selection" });
    f.view.update({ editor: f.editor, reason: "transaction" });
    const repeatedUpdates = updates - after;
    f.view.pasteText("blocked");
    const filtered = f.editor.getText();
    f.editor.destroy();
    f.editor.destroy();
    return { creates, destroys, native, acceptedUpdates, repeatedUpdates, serialized, appended, filtered, same, decoration };
  });
  expect(result).toEqual({ creates: 1, destroys: 1, native: true, acceptedUpdates: 1, repeatedUpdates: 0,
    serialized: 0, appended: "append!", filtered: "append!", same: true, decoration: "a" });
});

test("DOM NodeView and MarkView receive native views and are released on mode replacement", async ({ page }) => {
  const result = await page.evaluate(() => {
    const f = window.domFixture;
    let nodeCreated = 0, nodeDestroyed = 0, markCreated = 0, markDestroyed = 0;
    let native = true;
    const Mention = f.Node.create({
      name: "mention", group: "inline", inline: true, atom: true,
      addAttributes() { return { label: { default: "Ada" } }; },
      renderHTML({ HTMLAttributes }) { return ["span", HTMLAttributes, "@Ada"]; },
      addNodeView() {
        return ({ node, view, getPos, HTMLAttributes }) => {
          nodeCreated++;
          native &&= view instanceof f.EditorView;
          native &&= typeof getPos() === "number" && HTMLAttributes.label === "Ada";
          const dom = document.createElement("span");
          dom.dataset.mention = "true";
          dom.textContent = `@${node.attrs.label}`;
          return { dom, destroy() { nodeDestroyed++; } };
        };
      }
    });
    const Highlight = f.Mark.create({
      name: "highlight", renderHTML() { return ["mark", 0]; },
      addMarkView() {
        return ({ view }) => {
          markCreated++;
          native &&= view instanceof f.EditorView;
          const dom = document.createElement("mark");
          dom.dataset.customMark = "true";
          return { dom, contentDOM: dom, destroy() { markDestroyed++; } };
        };
      }
    });
    f.create({
      extensions: [f.StarterKit, f.DomViewExtension, Mention, Highlight],
      content: { type: "doc", content: [{ type: "paragraph", content: [
        { type: "mention" }, { type: "text", text: "hello", marks: [{ type: "highlight" }] }
      ] }] }
    });
    const rendered = f.view.dom.querySelector("mark[data-custom-mark]")?.textContent;
    const mention = f.view.dom.querySelector("[data-mention]")?.textContent;
    const old = f.view;
    f.editor.changeMode("dom");
    const replaced = old.isDestroyed && !old.dom.isConnected;
    f.editor.destroy();
    return { nodeCreated, nodeDestroyed, markCreated, markDestroyed, native, rendered, mention, replaced };
  });
  expect(result).toEqual({ nodeCreated: 2, nodeDestroyed: 2, markCreated: 2, markDestroyed: 2,
    native: true, rendered: "hello", mention: "@Ada", replaced: true });
});

test("direct native plugins and view-local props remain isolated between surfaces", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const f = window.domFixture;
    let creates = 0, destroys = 0;
    const direct = new f.Plugin({ view() { creates++; return { destroy() { destroys++; } }; } });
    f.create({ extensions: [f.StarterKit, f.DomViewExtension.configure({ props: { plugins: [direct] } })] });
    const primary = f.view;
    const locked = f.editor.mount({ mode: "dom", element: document.querySelector<HTMLElement>("#sibling")! });
    primary.setProps({ attributes: { "aria-label": "primary" } });
    const isolated = !locked.dom.hasAttribute("aria-label");
    const blocked = locked.pasteText("forbidden");
    primary.pasteText("shared");
    await new Promise(resolve => setTimeout(resolve, 160));
    const synchronized = locked.dom.textContent;
    const readonly = locked.editable;
    locked.destroy();
    locked.destroy();
    const sibling = f.editor.mount({ mode: "dom", editable: true, element: document.querySelector<HTMLElement>("#sibling")! });
    sibling.focus();
    sibling.pasteText(" child");
    const immediate = sibling.state === f.editor.state.pm;
    await new Promise(resolve => setTimeout(resolve, 160));
    const primaryText = primary.dom.textContent;
    f.editor.destroy();
    return { creates, destroys, isolated, blocked, synchronized, readonly, immediate, primaryText };
  });
  expect(result).toEqual({ creates: 3, destroys: 3, isolated: true, blocked: false,
    synchronized: "shared", readonly: false, immediate: true, primaryText: "shared child" });
});

test("plugin initialization can dispatch and explicit refresh observes mutable decorations", async ({ page }) => {
  const result = await page.evaluate(() => {
    const f = window.domFixture;
    let decorate = false;
    const PluginExtension = f.Extension.create({
      name: "initialization",
      addProseMirrorPlugins() {
        return [new f.Plugin({
          view(view) {
            if (!view.state.doc.textContent) view.dispatch(view.state.tr.insertText("ready"));
            return {};
          },
          props: { decorations: (state: EditorState) => decorate
            ? f.DecorationSet.create(state.doc, [f.Decoration.inline(1, 6, { class: "mutable" })]) : null }
        })];
      }
    });
    f.create({ extensions: [f.StarterKit, f.DomViewExtension, PluginExtension] });
    decorate = true;
    f.view.updateState(f.editor.state.pm);
    return { text: f.editor.getText(), dom: f.view.dom.textContent,
      same: f.view.state === f.editor.state.pm, decorated: f.view.dom.querySelector(".mutable")?.textContent };
  });
  expect(result).toEqual({ text: "ready", dom: "ready", same: true, decorated: "ready" });
});
