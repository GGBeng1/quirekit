import { describe, expect, it } from "vitest";
import { FakeSvgMountDocument } from "@quirekit/view/test-support/svg-mount";
import { createHtmlFocusRuntime } from "./runtime";

describe("retained HTML focus ownership", () => {
  it("classifies document, preserving UI, NodeView controls, embeds, and outside focus", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const root = ownerDocument.createElement("div");
    const documentRoot = ownerDocument.createElement("div");
    const inputProxy = ownerDocument.createElement("textarea");
    const nodeViewInput = ownerDocument.createElement("input");
    const embed = ownerDocument.createElement("div");
    const embedInput = ownerDocument.createElement("input");
    const toolbarInput = ownerDocument.createElement("input");
    const outsideInput = ownerDocument.createElement("input");
    const owners: string[] = [];

    embed.dataset.qkFocusScope = "nested-embed";
    toolbarInput.dataset.qkFocusScope = "preserve-selection";
    embed.appendChild(embedInput);
    documentRoot.appendChild(nodeViewInput);
    documentRoot.appendChild(embed);
    root.appendChild(documentRoot);
    root.appendChild(inputProxy);
    const runtime = createHtmlFocusRuntime({
      ownerDocument: ownerDocument as unknown as Document,
      documentRoot: documentRoot as unknown as HTMLElement,
      documentSurface: root as unknown as HTMLElement,
      inputProxy: inputProxy as unknown as HTMLTextAreaElement,
      focusDocumentInput: () => inputProxy.focus(),
      isNodeViewControl: (target) =>
        target === nodeViewInput as unknown as Node,
      onOwnerChange: (owner) => owners.push(owner)
    });

    runtime.transitionTo(inputProxy as unknown as Node);
    runtime.transitionTo(toolbarInput as unknown as Node);
    runtime.transitionTo(nodeViewInput as unknown as Node);
    runtime.transitionTo(embedInput as unknown as Node);
    runtime.transitionTo(outsideInput as unknown as Node);

    expect(owners).toEqual([
      "document",
      "selection-preserving-ui",
      "node-view-control",
      "nested-embed",
      "outside"
    ]);
  });

  it("restores document input focus without mutating editor selection state", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const root = ownerDocument.createElement("div");
    const documentRoot = ownerDocument.createElement("div");
    const inputProxy = ownerDocument.createElement("textarea");
    const selection = { from: 2, to: 6 };
    const runtime = createHtmlFocusRuntime({
      ownerDocument: ownerDocument as unknown as Document,
      documentRoot: documentRoot as unknown as HTMLElement,
      documentSurface: root as unknown as HTMLElement,
      inputProxy: inputProxy as unknown as HTMLTextAreaElement,
      focusDocumentInput: () => inputProxy.focus(),
      isNodeViewControl: () => false
    });

    runtime.transitionTo(null);
    runtime.restoreDocumentFocus();

    expect(ownerDocument.activeElement).toBe(inputProxy);
    expect(runtime.owner).toBe("document");
    expect(selection).toEqual({ from: 2, to: 6 });
  });
});
