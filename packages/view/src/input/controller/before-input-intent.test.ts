import { describe, expect, it } from "vitest";
import {
  classifyQuireBeforeInputIntent
} from "./before-input-intent";
import type { QuireBeforeInputEvent } from "../types";

describe("beforeinput intent classification", () => {
  it("classifies text, structural text, deletion, clipboard, and delegated input families", () => {
    expect(classifyQuireBeforeInputIntent(event("insertText", "A"))).toEqual({
      kind: "text-input",
      inputType: "insertText",
      text: "A"
    });
    expect(
      classifyQuireBeforeInputIntent(event("insertReplacementText", "B"))
    ).toEqual({
      kind: "text-input",
      inputType: "insertReplacementText",
      text: "B"
    });
    expect(classifyQuireBeforeInputIntent(event("insertParagraph"))).toEqual({
      kind: "text-mutation",
      inputType: "insertParagraph",
      fallbackKey: { key: "Enter" }
    });
    expect(classifyQuireBeforeInputIntent(event("insertLineBreak"))).toEqual({
      kind: "text-mutation",
      inputType: "insertLineBreak",
      fallbackKey: { key: "Enter", shiftKey: true }
    });
    expect(classifyQuireBeforeInputIntent(event("deleteContentBackward"))).toEqual({
      kind: "delete",
      inputType: "deleteContentBackward",
      fallbackKey: { key: "Backspace" }
    });
    expect(classifyQuireBeforeInputIntent(event("deleteWordBackward"))).toEqual({
      kind: "delete",
      inputType: "deleteWordBackward"
    });
    expect(classifyQuireBeforeInputIntent(event("deleteHardLineForward"))).toEqual({
      kind: "delete",
      inputType: "deleteHardLineForward"
    });
    expect(classifyQuireBeforeInputIntent(event("insertFromPaste"))).toEqual({
      kind: "clipboard",
      inputType: "insertFromPaste",
      command: "paste"
    });
    expect(
      classifyQuireBeforeInputIntent(event("insertFromPasteAsQuotation"))
    ).toEqual({
      kind: "clipboard",
      inputType: "insertFromPasteAsQuotation",
      command: "paste"
    });
    expect(classifyQuireBeforeInputIntent(event("deleteByCut"))).toEqual({
      kind: "clipboard",
      inputType: "deleteByCut",
      command: "cut"
    });
    expect(classifyQuireBeforeInputIntent(event("historyUndo"))).toBeNull();
    expect(classifyQuireBeforeInputIntent(event("formatBold"))).toBeNull();
    expect(classifyQuireBeforeInputIntent(event("insertOrderedList"))).toBeNull();
    expect(classifyQuireBeforeInputIntent(event("insertCompositionText"))).toBeNull();
  });
});

/**
 * Creates a beforeinput event-like object for classifier tests.
 *
 * @param inputType - Input Events inputType token.
 * @param data - Optional beforeinput data payload.
 * @returns DOM-light beforeinput event.
 */
function event(inputType: string, data?: string): QuireBeforeInputEvent {
  return {
    inputType,
    ...(data === undefined ? {} : { data }),
    isComposing: false
  };
}
