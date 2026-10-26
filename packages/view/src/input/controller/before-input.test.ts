import { describe, expect, it } from "vitest";
import { dispatchQuireBeforeInputIntent } from "./before-input";
import type { QuireBeforeInputEvent } from "../types";

describe("canvas beforeinput intent routing", () => {
  it("routes data-bearing text insertion intents through the text input handler", () => {
    const handledByTextInput: string[] = [];
    const handled = dispatchQuireBeforeInputIntent({
      event: createBeforeInputEvent("insertReplacementText", "B"),
      handleTextInput: (text) => {
        handledByTextInput.push(text);
        return true;
      },
      dispatchKeyDown: () => false
    });

    expect(handled).toBe(true);
    expect(handledByTextInput).toEqual(["B"]);
  });

  it("routes insertParagraph through a beforeinput text-mutation handler before keydown fallback", () => {
    const handledByTextMutation: string[] = [];
    const handledByKeyDown: string[] = [];
    const handled = dispatchQuireBeforeInputIntent({
      event: createBeforeInputEvent("insertParagraph"),
      handleTextInput: () => false,
      handleTextMutationInput: (inputType) => {
        handledByTextMutation.push(inputType);
        return true;
      },
      dispatchKeyDown: (event) => {
        handledByKeyDown.push(event.key);
        return true;
      }
    });

    expect(handled).toBe(true);
    expect(handledByTextMutation).toEqual(["insertParagraph"]);
    expect(handledByKeyDown).toEqual([]);
  });

  it("routes insertLineBreak through a beforeinput text-mutation handler before keydown fallback", () => {
    const handledByTextMutation: string[] = [];
    const handledByKeyDown: string[] = [];
    const handled = dispatchQuireBeforeInputIntent({
      event: createBeforeInputEvent("insertLineBreak"),
      handleTextInput: () => false,
      handleTextMutationInput: (inputType) => {
        handledByTextMutation.push(inputType);
        return true;
      },
      dispatchKeyDown: (event) => {
        handledByKeyDown.push(event.key);
        return true;
      }
    });

    expect(handled).toBe(true);
    expect(handledByTextMutation).toEqual(["insertLineBreak"]);
    expect(handledByKeyDown).toEqual([]);
  });

  it("falls back from beforeinput line breaks to synthetic Shift+Enter", () => {
    const handledByKeyDown: QuireBeforeInputFallbackKey[] = [];
    const handled = dispatchQuireBeforeInputIntent({
      event: createBeforeInputEvent("insertLineBreak"),
      handleTextInput: () => false,
      handleTextMutationInput: () => false,
      dispatchKeyDown: (event) => {
        handledByKeyDown.push({
          key: event.key,
          shiftKey: event.shiftKey ?? false
        });
        return true;
      }
    });

    expect(handled).toBe(true);
    expect(handledByKeyDown).toEqual([{ key: "Enter", shiftKey: true }]);
  });

  it("routes delete intents through a beforeinput delete handler before keydown fallback", () => {
    const handledByDelete: string[] = [];
    const handledByKeyDown: string[] = [];
    const handled = dispatchQuireBeforeInputIntent({
      event: createBeforeInputEvent("deleteContentBackward"),
      handleTextInput: () => false,
      handleDeleteInput: (inputType) => {
        handledByDelete.push(inputType);
        return true;
      },
      dispatchKeyDown: (event) => {
        handledByKeyDown.push(event.key);
        return true;
      }
    });

    expect(handled).toBe(true);
    expect(handledByDelete).toEqual(["deleteContentBackward"]);
    expect(handledByKeyDown).toEqual([]);
  });

  it("routes extended deletion intents through the delete handler without keyboard fallback", () => {
    const handledByDelete: string[] = [];
    const handledByKeyDown: string[] = [];
    const handled = dispatchQuireBeforeInputIntent({
      event: createBeforeInputEvent("deleteWordBackward"),
      handleTextInput: () => false,
      handleDeleteInput: (inputType) => {
        handledByDelete.push(inputType);
        return true;
      },
      dispatchKeyDown: (event) => {
        handledByKeyDown.push(event.key);
        return true;
      }
    });

    expect(handled).toBe(true);
    expect(handledByDelete).toEqual(["deleteWordBackward"]);
    expect(handledByKeyDown).toEqual([]);
  });

  it("leaves unhandled extended deletion intents without inventing editable-text fallback", () => {
    const handledByKeyDown: string[] = [];
    const handled = dispatchQuireBeforeInputIntent({
      event: createBeforeInputEvent("deleteWordBackward"),
      handleTextInput: () => false,
      handleDeleteInput: () => false,
      dispatchKeyDown: (event) => {
        handledByKeyDown.push(event.key);
        return true;
      }
    });

    expect(handled).toBe(false);
    expect(handledByKeyDown).toEqual([]);
  });

  it("routes clipboard-flavored beforeinput intents through the clipboard handler", () => {
    const handledByClipboard: string[] = [];
    const handled = dispatchQuireBeforeInputIntent({
      event: createBeforeInputEvent("insertFromPaste"),
      handleTextInput: () => false,
      handleClipboardInput: (intent) => {
        handledByClipboard.push(`${intent.command}:${intent.inputType}`);
        return true;
      },
      dispatchKeyDown: () => false
    });

    expect(handled).toBe(true);
    expect(handledByClipboard).toEqual(["paste:insertFromPaste"]);
  });
});

/**
 * Creates the minimal beforeinput event shape consumed by beforeinput tests.
 *
 * @param inputType - Input Events inputType value.
 * @param data - Optional text payload.
 * @returns beforeinput event-like object for tests.
 */
function createBeforeInputEvent(
  inputType: string,
  data?: string
): QuireBeforeInputEvent {
  return {
    inputType,
    ...(data === undefined ? {} : { data }),
    isComposing: false
  };
}

/** Keyboard fallback facts captured by beforeinput tests. */
interface QuireBeforeInputFallbackKey {
  /** KeyboardEvent key value. */
  readonly key: string;
  /** Whether Shift was pressed on the fallback key. */
  readonly shiftKey: boolean;
}
