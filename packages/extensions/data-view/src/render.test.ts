// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import { createEditor, type QuireNodeViewRendererProps } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { createDataView } from "@quirekit/data-view";
import { DataView } from "./extension";
import { bindDataViewActivation } from "./activation";
import { isInteractiveDataView, renderDataView } from "./render";

it("distinguishes actual inline mounts from static fallback and canvas occurrences", () => {
  const editor = createEditor({ extensions: [StarterKit, DataView], content: { type: "doc", content: [{ type: "dataView", attrs: { dataView: createDataView("render") } }] } });
  const root = document.createElement("div"), inline = { dom: document.createElement("figure") };
  const props = { editor, view: { dom: root }, getPos: () => 0, node: editor.state.pm.doc.firstChild } as unknown as QuireNodeViewRendererProps;
  const fallback = renderDataView(props, { open: null, layouts: null, render: () => null }) as { dom: HTMLElement; destroy(): void };
  expect(renderDataView(props, { open: null, layouts: null, render: () => inline })).toBe(inline);
  const mapped = { nodeDOM: () => inline.dom };
  expect(isInteractiveDataView(mapped, 0)).toBe(true);
  expect(isInteractiveDataView({ nodeDOM: () => fallback.dom }, 0)).toBe(false);
  expect(isInteractiveDataView({}, 0)).toBe(false);
  editor.commands.setNodeSelection(0);
  const open = vi.fn();
  const release = bindDataViewActivation(editor, root, open, position => !isInteractiveDataView(mapped, position));
  root.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  expect(open).not.toHaveBeenCalled();
  release(); fallback.destroy(); editor.destroy();
});
