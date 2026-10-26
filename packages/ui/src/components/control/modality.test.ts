// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { trackQuireKitInputModality } from "./modality";

it("records pointer and focus-moving keyboard input on the document root", () => {
  trackQuireKitInputModality(document);
  const root = document.documentElement;
  document.dispatchEvent(new Event("pointerdown"));
  expect(root.dataset.qkModality).toBe("pointer");
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
  expect(root.dataset.qkModality).toBe("keyboard");
  // Activation and dismissal keys do not move focus and keep the current modality.
  document.dispatchEvent(new Event("pointerdown"));
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "a", ctrlKey: true }));
  expect(root.dataset.qkModality).toBe("pointer");
});

it("installs listeners once per document", () => {
  let added = 0;
  const original = document.addEventListener.bind(document);
  document.addEventListener = ((...args: Parameters<typeof original>) => {
    added += 1;
    original(...args);
  }) as typeof document.addEventListener;
  trackQuireKitInputModality(document);
  trackQuireKitInputModality(document);
  document.addEventListener = original;
  expect(added).toBe(0);
});
