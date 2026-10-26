// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import { observeQuireDevtoolsInteractions } from "./observer";

describe("observeQuireDevtoolsInteractions", () => {
  it("ignores product UI subtrees outside editor latency ownership", () => {
    const root = document.createElement("div");
    const editorInput = document.createElement("textarea");
    const productUi = document.createElement("section");
    const aiInput = document.createElement("textarea");
    productUi.setAttribute("data-qk-devtools-ignore-interactions", "");
    productUi.append(aiInput);
    root.append(editorInput, productUi);
    document.body.append(root);
    const record = vi.fn();
    const observer = observeQuireDevtoolsInteractions(root, { record });

    aiInput.dispatchEvent(new InputEvent("beforeinput", {
      bubbles: true,
      inputType: "insertText",
      data: "a"
    }));
    editorInput.dispatchEvent(new InputEvent("beforeinput", {
      bubbles: true,
      inputType: "insertText",
      data: "b"
    }));

    expect(record).toHaveBeenCalledOnce();
    expect(record).toHaveBeenCalledWith(expect.objectContaining({
      source: "beforeinput",
      target: "textarea"
    }));
    observer.destroy();
    root.remove();
  });
});
