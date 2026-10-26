// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import { createEditor } from "@quirekit/core";
import { NodeSelection } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { createDataView, type DataViewEditRequest } from "@quirekit/data-view";
import { DataView } from "./extension";
import { bindDataViewActivation } from "./activation";

it("activates only Enter on the selected object and releases the mounted listener", () => {
  const editor = createEditor({extensions: [StarterKit, DataView], content: {type: "doc", content: [{type: "dataView", attrs: {dataView: createDataView("keyboard")}}, {type: "paragraph"}]}});
  editor.commands.setNodeSelection(0);
  expect(editor.state.pm.selection).toBeInstanceOf(NodeSelection);
  const root = document.createElement("div"), input = document.createElement("textarea"); root.append(input);
  const requests: DataViewEditRequest[] = [];
  const open = vi.fn((request: DataViewEditRequest) => { requests.push(request); return {close: request.release}; });
  const release = bindDataViewActivation(editor, root, open);
  const descendants = vi.spyOn(editor.state.pm.doc, "descendants"), before = editor.state.pm.doc;
  try {
    for (let i = 0; i < 100; i++) input.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowRight", bubbles: true}));
    input.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", isComposing: true, bubbles: true}));
    input.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", ctrlKey: true, bubbles: true}));
    expect(open).not.toHaveBeenCalled(); expect(descendants).not.toHaveBeenCalled();
    const event = new KeyboardEvent("keydown", {key: "Enter", bubbles: true, cancelable: true}); input.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true); expect(open).toHaveBeenCalledOnce(); expect(editor.state.pm.doc).toBe(before);
    requests[0]!.release(); release();
    input.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", bubbles: true}));
    expect(open).toHaveBeenCalledOnce();
  } finally { release(); for (const request of requests) request.release(); editor.destroy(); }
});
