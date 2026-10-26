import { describe, expect, it, vi } from "vitest";
import {
  createEditor,
  DECORATION_MANAGER_PLUGIN_KEY,
  Decoration,
  Extension,
  liveWidgetKeys
} from "../index";

describe("DecorationManager", () => {
  it("installs addDecorations output into editor plugin props", () => {
    const editor = createEditor({
      extensions: [Extension.create({
        name: "search-results",
        addDecorations() {
          return {
            create: () => [
              Decoration.Inline(1, 5, { class: "search-result" })
            ]
          };
        }
      })],
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "decorated" }]
        }]
      }
    });

    const state = DECORATION_MANAGER_PLUGIN_KEY.getState(editor.state.pm);
    const decorations = state?.mergedDecorationSet.find() ?? [];

    expect(decorations).toHaveLength(1);
    expect(decorations[0]?.from).toBe(1);
    expect(decorations[0]?.to).toBe(5);
    expect(decorations[0]?.spec).toMatchObject({
      extensionName: "search-results"
    });
  });

  it("recomputes manual decorations only through editor commands", () => {
    let active = false;
    const create = vi.fn(() => active
      ? [Decoration.Inline(1, 2, { class: "active" })]
      : []
    );
    const editor = createEditor({
      extensions: [Extension.create({
        name: "manual-decorations",
        addDecorations() {
          return { update: "manual", create };
        }
      })],
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "body" }]
        }]
      }
    });

    active = true;
    expect(editor.commands.insertContent("!")).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
    expect(liveWidgetKeys(editor)).toEqual(new Set());

    expect(editor.commands.updateDecorations("manual-decorations")).toBe(true);
    expect(create).toHaveBeenCalledTimes(2);
    expect(
      DECORATION_MANAGER_PLUGIN_KEY.getState(editor.state.pm)
        ?.mergedDecorationSet.find()
    ).toHaveLength(1);
  });

  it("rebuilds changed top-level ranges without calling the full factory", () => {
    const create = vi.fn(() => [
      Decoration.Node(0, 5, { class: "paragraph" }),
      Decoration.Node(5, 10, { class: "paragraph" })
    ]);
    const createInRange = vi.fn(({ from, to }: { from: number; to: number }) => [
      Decoration.Node(from, to, { class: "changed" })
    ]);
    const editor = createEditor({
      extensions: [Extension.create({
        name: "incremental-decorations",
        addDecorations() {
          return {
            update: "changedRanges",
            create,
            createInRange
          };
        }
      })],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "one" }]
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "two" }]
          }
        ]
      }
    });

    editor.dispatchTransaction(editor.state.pm.tr.insertText("!", 7));

    expect(create).toHaveBeenCalledTimes(1);
    expect(createInRange).toHaveBeenCalledTimes(1);
    expect(createInRange.mock.calls[0]?.[0]).toMatchObject({
      from: 5,
      to: 11
    });
  });

  it("contains extension decoration factory failures", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const editor = createEditor({
      extensions: [Extension.create({
        name: "broken-decorations",
        addDecorations() {
          return {
            create() {
              throw new Error("boom");
            }
          };
        }
      })],
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "safe" }]
        }]
      }
    });

    expect(editor.commands.insertContent("!")).toBe(true);
    expect(editor.state.doc.textContent).toContain("!");
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
