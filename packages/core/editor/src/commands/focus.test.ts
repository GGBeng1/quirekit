import { describe, expect, it } from "vitest";
import { createEditor } from "../index";

describe("focus command transaction ordering", () => {
  it("applies selection before mounted focus emits its own transaction", async () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "focus" }]
        }]
      }
    });
    let focusCalls = 0;
    editor.view.focus = () => {
      focusCalls += 1;
      editor.dispatchTransaction(
        editor.state.pm.tr
          .setMeta("focus", {})
          .setMeta("addToHistory", false)
      );
    };

    expect(editor.commands.focus("end")).toBe(true);
    expect(editor.state.pm.selection.from).toBe(6);
    expect(focusCalls).toBe(0);

    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(focusCalls).toBe(1);
    expect(editor.isFocused).toBe(true);
    expect(editor.state.pm.selection.from).toBe(6);
  });
});
