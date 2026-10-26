import { describe, expect, it } from "vitest";
import { contextMenuKeyboardPoint, isContextMenuKey } from "./keyboard";

const keyEvent = {
  key: "F10", shiftKey: true, altKey: false, ctrlKey: false, metaKey: false,
  repeat: false, isComposing: false, defaultPrevented: false
};

describe("ContextMenu keyboard entry", () => {
  it("accepts only the local Shift+F10 and ContextMenu combinations", () => {
    expect(isContextMenuKey(keyEvent)).toBe(true);
    expect(isContextMenuKey({ ...keyEvent, key: "ContextMenu", shiftKey: false })).toBe(true);
    expect(isContextMenuKey({ ...keyEvent, shiftKey: false })).toBe(false);
    expect(isContextMenuKey({ ...keyEvent, key: "Enter" })).toBe(false);
    for (const modifier of ["altKey", "ctrlKey", "metaKey"] as const) {
      expect(isContextMenuKey({ ...keyEvent, [modifier]: true })).toBe(false);
    }
  });

  it("leaves cancelled, composing, and repeating keyboard events alone", () => {
    for (const blocked of ["defaultPrevented", "isComposing", "repeat"] as const) {
      expect(isContextMenuKey({ ...keyEvent, [blocked]: true })).toBe(false);
    }
  });

  it("keeps keyboard anchors in viewport coordinates for the shared collision engine", () => {
    expect(contextMenuKeyboardPoint({ left: 126.5, bottom: 480 })).toEqual({ x: 126.5, y: 480 });
  });
});
