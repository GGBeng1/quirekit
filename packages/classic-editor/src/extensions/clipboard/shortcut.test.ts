import { describe, expect, it } from "vitest";
import { isClassicEditorPlainTextPasteShortcut } from "./shortcut";

/**
 * Creates a minimal keydown shape.
 * @param init - Overridden key fields.
 * @returns Keydown fields read by the shortcut classifier.
 */
function key(init: Partial<Pick<KeyboardEvent, "key" | "code" | "shiftKey" | "ctrlKey" | "metaKey">>) {
  return { key: "v", code: "KeyV", shiftKey: false, ctrlKey: false, metaKey: false, ...init };
}

describe("plain-text paste shortcut", () => {
  it("recognizes Ctrl/⌘+Shift+V and Safari's ⌥⇧⌘V by physical key", () => {
    expect(isClassicEditorPlainTextPasteShortcut(key({ key: "V", shiftKey: true, ctrlKey: true }))).toBe(true);
    expect(isClassicEditorPlainTextPasteShortcut(key({ key: "V", shiftKey: true, metaKey: true }))).toBe(true);
    expect(isClassicEditorPlainTextPasteShortcut(key({ key: "◊", shiftKey: true, metaKey: true }))).toBe(true);
    expect(isClassicEditorPlainTextPasteShortcut(key({ ctrlKey: true }))).toBe(false);
    expect(isClassicEditorPlainTextPasteShortcut(key({ shiftKey: true }))).toBe(false);
  });
});
