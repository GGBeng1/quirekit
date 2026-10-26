// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { createPanelDragController } from "./drag";

describe("panel drag controller", () => {
  it("applies the panel transform during pointer movement", () => {
    document.body.innerHTML = [
      "<div id=\"root\">",
      "<section class=\"qk-devtools-panel\">",
      "<header class=\"qk-devtools-topbar\" data-qk-devtools-drag-handle></header>",
      "</section>",
      "</div>"
    ].join("");
    const root = document.getElementById("root")!;
    const handle = root.querySelector<HTMLElement>("[data-qk-devtools-drag-handle]")!;
    const panel = root.querySelector<HTMLElement>(".qk-devtools-panel")!;
    const controller = createPanelDragController({
      ownerDocument: document,
      root
    });

    handle.addEventListener("pointerdown", (event) => {
      controller.handlePointerDown(event);
    });
    handle.dispatchEvent(createPointerEvent("pointerdown", 10, 20));
    document.dispatchEvent(createPointerEvent("pointermove", 34, 52));

    expect(panel.style.transform).toBe("translate3d(24px,32px,0)");

    controller.destroy();
  });
});

/**
 * Creates a pointer-like event with pointer coordinates.
 *
 * @param type - Event type.
 * @param clientX - Pointer x coordinate.
 * @param clientY - Pointer y coordinate.
 * @returns Pointer-like mouse event.
 */
function createPointerEvent(type: string, clientX: number, clientY: number): MouseEvent {
  return new MouseEvent(type, {
    bubbles: true,
    clientX,
    clientY
  });
}
