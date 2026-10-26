// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import { resolveClassicEditorOverlayState } from "../../shell/overlays/document-state";
import {
  classicEditorSuggestionOverlayOwnerAttribute,
  createClassicEditorSuggestionOverlayPort
} from "./overlay";

/** Adds one DOM owner used by canonical target-to-root resolution. */
function createOwner(id: string): HTMLButtonElement {
  const owner = document.createElement("button");
  owner.setAttribute(classicEditorSuggestionOverlayOwnerAttribute, id);
  document.body.append(owner);
  return owner;
}

describe("Classic suggestion overlay adapter", () => {
  it("dismisses Escape inside one root without affecting another root", () => {
    const first = createClassicEditorSuggestionOverlayPort(document);
    const second = createClassicEditorSuggestionOverlayPort(document);
    const firstDismiss = vi.fn();
    const secondDismiss = vi.fn();
    const firstFocus = vi.fn();
    const secondFocus = vi.fn();
    const firstOwner = createOwner("first-suggestion");
    createOwner("second-suggestion");

    first.open({
      id: "first-suggestion",
      root: { id: "first-root" },
      dismiss: firstDismiss,
      restoreFocus: firstFocus
    });
    second.open({
      id: "second-suggestion",
      root: { id: "second-root" },
      dismiss: secondDismiss,
      restoreFocus: secondFocus
    });
    firstOwner.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true
    }));

    expect(firstDismiss).toHaveBeenCalledOnce();
    expect(firstFocus).toHaveBeenCalledOnce();
    expect(secondDismiss).not.toHaveBeenCalled();
    expect(second.activeId).toBe("second-suggestion");
    second.release(false);
  });

  it("lets a canonical child consume Escape before its suggestion parent", () => {
    const port = createClassicEditorSuggestionOverlayPort(document);
    const root = { id: "root" };
    const parentDismiss = vi.fn();
    const childDismiss = vi.fn();
    const parentOwner = createOwner("parent-suggestion");
    const childOwner = createOwner("child-dialog");
    port.open({
      id: "parent-suggestion",
      root,
      dismiss: parentDismiss,
      restoreFocus: vi.fn()
    });
    resolveClassicEditorOverlayState(document).coordinator.activate({
      id: "child-dialog",
      root,
      parentId: "parent-suggestion",
      close: childDismiss,
      restoreFocus: () => parentOwner.focus()
    });

    childOwner.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true
    }));
    expect(childDismiss).toHaveBeenCalledOnce();
    expect(parentDismiss).not.toHaveBeenCalled();
    expect(port.activeId).toBe("parent-suggestion");
    parentOwner.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true
    }));
    expect(parentDismiss).toHaveBeenCalledOnce();
  });
});
