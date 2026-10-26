import { createEditor } from "@quirekit/core";
import { TextSelection } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { createMountedInputController } from "./controller";
import type { QuireKeyboardInputEvent } from "../types";

describe("mounted input controller geometry contract", () => {
  it("reads the interaction snapshot for vertical keyboard movement", () => {
    const editor = createEditorWithParagraph("abc");
    let snapshotReads = 0;
    const controller = createMountedInputController({
      editor,
      inputProxy: createInputProxy(),
      getInteractionSnapshot: () => {
        snapshotReads += 1;

        return undefined;
      }
    });

    editor.dispatchTransaction(
      editor.state.pm.tr.setSelection(TextSelection.create(editor.state.doc, 2))
    );
    controller.handleKeyDown(createKeyboardEvent("ArrowDown"));

    expect(snapshotReads).toBeGreaterThan(0);
  });

  it("reads the interaction snapshot for visual line-boundary movement", () => {
    const editor = createEditorWithParagraph("abc");
    let snapshotReads = 0;
    const controller = createMountedInputController({
      editor,
      inputProxy: createInputProxy(),
      getInteractionSnapshot: () => {
        snapshotReads += 1;

        return undefined;
      }
    });

    editor.dispatchTransaction(
      editor.state.pm.tr.setSelection(TextSelection.create(editor.state.doc, 2))
    );
    controller.handleKeyDown(createKeyboardEvent("Home"));

    expect(snapshotReads).toBe(1);
  });
});

/**
 * Creates an editor with one paragraph for mounted input controller tests.
 *
 * @param text - Paragraph text content.
 * @returns Editor with one paragraph.
 */
function createEditorWithParagraph(text: string) {
  return createEditor({
    extensions: [StarterKit.configure({ undoRedo: false })],
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text }]
        }
      ]
    }
  });
}

/**
 * Creates the minimal textarea shape needed by the mounted input binding options.
 *
 * @returns Textarea placeholder for controller-only tests.
 */
function createInputProxy(): HTMLTextAreaElement {
  return {} as HTMLTextAreaElement;
}

/**
 * Creates the minimal keyboard event shape consumed by input controller tests.
 *
 * @param key - Keyboard key value.
 * @returns Keyboard event-like object.
 */
function createKeyboardEvent(key: string): QuireKeyboardInputEvent {
  return {
    key,
    keyCode: 0,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    preventDefault: () => {}
  };
}
