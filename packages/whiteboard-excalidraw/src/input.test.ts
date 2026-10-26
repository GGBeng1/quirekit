// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { trackDraftInput } from "./input";

it("observes IME and drawing boundaries without consuming input or losing text focus", () => {
  const container = document.createElement("div"), input = document.createElement("textarea");
  document.body.append(container); container.append(input); input.focus();
  const guard = trackDraftInput(container);
  const composing = new CompositionEvent("compositionstart", { bubbles: true, cancelable: true });
  input.dispatchEvent(composing); expect(guard.stable()).toBe(false); expect(composing.defaultPrevented).toBe(false);
  input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
  expect(guard.stable()).toBe(true); expect(document.activeElement).toBe(input);
  container.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7 }));
  container.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 8 }));
  document.dispatchEvent(new PointerEvent("pointerup", { pointerId: 7 })); expect(guard.stable()).toBe(false);
  document.dispatchEvent(new PointerEvent("pointercancel", { pointerId: 8 })); expect(guard.stable()).toBe(true);
  guard.destroy(); input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
  expect(guard.stable()).toBe(true); container.remove();
});
