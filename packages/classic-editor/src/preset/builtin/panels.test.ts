// @vitest-environment happy-dom

import { nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { ClassicEditorRenderContext } from "../../types";
import { createEditor } from "@quirekit/core";
import { ClassicEditorKit } from "../../extensions";
import { classicEditorStatusTargetKey } from "../../shell/components/status-bar";
import {
  renderBuiltinOutline,
  renderBuiltinProperties,
  renderBuiltinSelection
} from "./panels";

describe("Classic built-in document outline", () => {
  it("navigates a public TreeView entry through the heading content position", async () => {
    const focus = vi.fn();
    const scrollRangeIntoView = vi.fn();
    const root = document.createElement("section");
    const heading = {
      attrs: {},
      nodeSize: 15,
      textContent: "Later heading",
      type: { name: "paragraph" }
    };
    const mounted = renderBuiltinOutline({
      ownerDocument: document,
      root,
      editor: {
        on: vi.fn(),
        off: vi.fn(),
        commands: { focus },
        view: { scrollRangeIntoView },
        isDestroyed: false,
        state: {
          doc: {
            descendants(visitor: (node: typeof heading, position: number) => boolean) {
              visitor(heading, 40);
            }
          },
          extensions: [{
            canvasTextStyle: {
              paragraph: () => ({ documentOutlineLevel: 2 })
            }
          }]
        }
      },
      locale: "en"
    } as unknown as ClassicEditorRenderContext);
    const host = mounted.element as HTMLElement;
    document.body.append(host);
    await nextTick();

    const tree = host.querySelector('[role="tree"]');
    const item = host.querySelector<HTMLElement>('[role="treeitem"]');
    expect(tree?.getAttribute("aria-label")).toBe("Outline");
    expect(item?.textContent).toBe("Later heading");

    item?.click();
    await nextTick();

    expect(focus).toHaveBeenCalledWith(41, { scrollIntoView: false });
    expect(scrollRangeIntoView).toHaveBeenCalledWith({ from: 41, to: 41 }, { block: "start", margin: 24 });
    mounted.destroy();
    host.remove();
  });
});

describe("Classic built-in document properties", () => {
  it("reports only shell-owned facts when Word feature ids are enabled", () => {
    const list = renderBuiltinProperties({
      ownerDocument: document,
      editor: { isEditable: true },
      locale: "en",
      backend: "canvas",
      features: { table: true, drawing: true, review: true }
    } as unknown as ClassicEditorRenderContext) as HTMLDListElement;

    expect([...list.querySelectorAll("dt")].map((term) => term.textContent))
      .toEqual(["Editable"]);
    expect([...list.querySelectorAll("dd")].map((value) => value.textContent))
      .toEqual(["Yes"]);
    expect(list.textContent).not.toContain("Canvas");
    expect(list.textContent).not.toContain("Tables");
    expect(list.textContent).not.toContain("Drawing");
  });
});

describe("Classic built-in target status", () => {
  it("projects semantic table facts onto stable status DOM", () => {
    const editor = createEditor({ extensions: [ClassicEditorKit] });
    const value = renderBuiltinSelection({
      ownerDocument: document,
      editor,
      locale: "en",
      ui: { state: { semantic: {
        selection: null,
        target: "table-1",
        values: {
          [classicEditorStatusTargetKey]: {
            kind: "table",
            selectedCells: 4
          }
        },
        mixed: [],
        can: {},
        reasons: {},
        busy: [],
        geometry: null,
        freshness: 1
      } } }
    } as unknown as ClassicEditorRenderContext);

    expect(value.dataset.statusTargetKind).toBe("table");
    expect(value.dataset.statusSource).toBe("semantic");
    expect(value.textContent).toBe("Table: 4 cells selected");
  });
});
