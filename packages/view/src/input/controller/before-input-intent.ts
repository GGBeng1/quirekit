import type { QuireBeforeInputEvent } from "../types";

/** beforeinput tokens that carry direct text data. */
export type QuireBeforeInputTextInputType =
  | "insertText"
  | "insertFromComposition"
  | "insertReplacementText";

/** beforeinput tokens that mutate text structure through keyboard fallback. */
export type QuireBeforeInputTextMutationInputType =
  | "insertParagraph"
  | "insertLineBreak";

/** beforeinput tokens that request deletion through command routing. */
export type QuireBeforeInputDeleteInputType =
  | "deleteContentBackward"
  | "deleteContentForward"
  | "deleteWordBackward"
  | "deleteWordForward"
  | "deleteSoftLineBackward"
  | "deleteSoftLineForward"
  | "deleteHardLineBackward"
  | "deleteHardLineForward"
  | "deleteEntireSoftLine"
  | "deleteByDrag";

/** beforeinput tokens that mirror clipboard commands without payload authority. */
export type QuireBeforeInputClipboardInputType =
  | "insertFromPaste"
  | "insertFromPasteAsQuotation"
  | "deleteByCut";

/** Clipboard command requested by a beforeinput token. */
export type QuireBeforeInputClipboardCommand = "cut" | "paste";

/** Keyboard fallback used when editable text still owns an input intent. */
export type QuireBeforeInputKeyboardFallback = {
  /** KeyboardEvent key value. */
  readonly key: "Backspace" | "Delete" | "Enter";
  /** Whether Shift should be held for the fallback key. */
  readonly shiftKey?: boolean | undefined;
};

/** Classified beforeinput text insertion intent. */
export type QuireBeforeInputTextInputIntent = {
  /** Intent family. */
  readonly kind: "text-input";
  /** Source inputType token. */
  readonly inputType: QuireBeforeInputTextInputType;
  /** Text data carried by beforeinput. */
  readonly text: string;
};

/** Classified beforeinput structural text mutation intent. */
export type QuireBeforeInputTextMutationIntent = {
  /** Intent family. */
  readonly kind: "text-mutation";
  /** Source inputType token. */
  readonly inputType: QuireBeforeInputTextMutationInputType;
  /** Keyboard fallback used when editable text owns the command. */
  readonly fallbackKey: QuireBeforeInputKeyboardFallback;
};

/** Classified beforeinput deletion intent. */
export type QuireBeforeInputDeleteIntent = {
  /** Intent family. */
  readonly kind: "delete";
  /** Source inputType token. */
  readonly inputType: QuireBeforeInputDeleteInputType;
  /** Keyboard fallback used when exact legacy deletion semantics exist. */
  readonly fallbackKey?: QuireBeforeInputKeyboardFallback | undefined;
};

/** Classified beforeinput clipboard intent. */
export type QuireBeforeInputClipboardIntent = {
  /** Intent family. */
  readonly kind: "clipboard";
  /** Source inputType token. */
  readonly inputType: QuireBeforeInputClipboardInputType;
  /** Clipboard command represented by the beforeinput token. */
  readonly command: QuireBeforeInputClipboardCommand;
};

/** Classified beforeinput intent owned by the canvas input controller. */
export type QuireBeforeInputIntent =
  | QuireBeforeInputTextInputIntent
  | QuireBeforeInputTextMutationIntent
  | QuireBeforeInputDeleteIntent
  | QuireBeforeInputClipboardIntent;

/**
 * Classifies a beforeinput event into the command family owned by QuireKit.
 *
 * @param event - beforeinput event-like object.
 * @returns Classified intent, or null when another authority owns the token.
 */
export function classifyQuireBeforeInputIntent(
  event: Pick<QuireBeforeInputEvent, "inputType" | "data">
): QuireBeforeInputIntent | null {
  if (isQuireBeforeInputTextInputType(event.inputType)) {
    return readQuireBeforeInputTextInputIntent(event, event.inputType);
  }

  switch (event.inputType) {
    case "insertParagraph":
      return {
        kind: "text-mutation",
        inputType: "insertParagraph",
        fallbackKey: { key: "Enter" }
      };
    case "insertLineBreak":
      return {
        kind: "text-mutation",
        inputType: "insertLineBreak",
        fallbackKey: { key: "Enter", shiftKey: true }
      };
    case "deleteContentBackward":
      return {
        kind: "delete",
        inputType: "deleteContentBackward",
        fallbackKey: { key: "Backspace" }
      };
    case "deleteContentForward":
      return {
        kind: "delete",
        inputType: "deleteContentForward",
        fallbackKey: { key: "Delete" }
      };
    case "deleteWordBackward":
    case "deleteWordForward":
    case "deleteSoftLineBackward":
    case "deleteSoftLineForward":
    case "deleteHardLineBackward":
    case "deleteHardLineForward":
    case "deleteEntireSoftLine":
    case "deleteByDrag":
      return { kind: "delete", inputType: event.inputType };
    case "insertFromPaste":
    case "insertFromPasteAsQuotation":
      return {
        kind: "clipboard",
        inputType: event.inputType,
        command: "paste"
      };
    case "deleteByCut":
      return {
        kind: "clipboard",
        inputType: "deleteByCut",
        command: "cut"
      };
    default:
      return null;
  }
}

/**
 * Checks whether a token carries direct text insertion data.
 *
 * @param inputType - Input Events inputType token.
 * @returns Whether the token is a data-bearing text insertion token.
 */
function isQuireBeforeInputTextInputType(
  inputType: string
): inputType is QuireBeforeInputTextInputType {
  return inputType === "insertText" ||
    inputType === "insertFromComposition" ||
    inputType === "insertReplacementText";
}

/**
 * Reads a direct text insertion intent from a beforeinput event.
 *
 * @param event - beforeinput event carrying optional text data.
 * @param inputType - Narrowed data-bearing inputType token.
 * @returns Classified text insertion intent, or null when the data is empty.
 */
function readQuireBeforeInputTextInputIntent(
  event: Pick<QuireBeforeInputEvent, "data">,
  inputType: QuireBeforeInputTextInputType
): QuireBeforeInputTextInputIntent | null {
  return event.data
    ? { kind: "text-input", inputType, text: event.data }
    : null;
}
