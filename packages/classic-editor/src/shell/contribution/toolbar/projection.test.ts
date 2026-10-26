import { expect, it, vi } from "vitest";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import { retainClassicToolbarEntries } from "./projection/entries";

it("keeps unchanged siblings when one public state changes and follows current order", () => {
  const previous: readonly QuireKitToolbarEntry[] = [{ value: "a", label: "A" }, { value: "b", label: "B" }];
  const result = retainClassicToolbarEntries(previous, [{ value: "b", label: "B" }, { value: "a", label: "A", disabled: true }]);
  expect(result[0]).toBe(previous[1]);
  expect(result[1]).not.toBe(previous[0]);
  expect(result[1]?.disabled).toBe(true);
});

it("does not merge opaque metadata, payload or callbacks with equal-looking replacements", () => {
  const callback = vi.fn();
  const previous: readonly QuireKitToolbarEntry[] = [{ value: "a", label: "A", meta: { callback }, payload: { selection: 1 } }];
  const same = retainClassicToolbarEntries(previous, [{ ...previous[0]! }]);
  expect(same).toBe(previous);
  const metadata = { callback };
  const replacedMeta = retainClassicToolbarEntries(previous, [{ ...previous[0]!, meta: metadata }]);
  expect(replacedMeta[0]?.meta).toBe(metadata);
  expect(replacedMeta).not.toBe(previous);
  const payload = { selection: 1 };
  const replacedPayload = retainClassicToolbarEntries(previous, [{ ...previous[0]!, payload }]);
  expect(replacedPayload[0]?.payload).toBe(payload);
  expect(replacedPayload).not.toBe(previous);
  const functionPayload = retainClassicToolbarEntries([{ value: "a", label: "A", payload: callback }], [{ value: "a", label: "A", payload: vi.fn() }]);
  expect(functionPayload[0]?.payload).not.toBe(callback);
});

it("retains documented menu, attribute and overlay data without serializing it", () => {
  const create = (): readonly QuireKitToolbarEntry[] => [{ value: "menu", kind: "menu", label: "Menu",
    attributes: { "data-menu": true }, overlayProps: { width: 100, contentAttributes: { lang: "en", class: "menu" } },
    items: [{ value: "group", kind: "group", label: "Group", children: [{ value: "action", label: "Action", checked: true }] }]
  }];
  const previous = create();
  expect(retainClassicToolbarEntries(previous, create())).toBe(previous);
});

it("preserves non-data entries as opaque objects instead of flattening getters", () => {
  const label = vi.fn(() => "Label");
  const next = { value: "custom", get label() { return label(); } };
  const result = retainClassicToolbarEntries([{ value: "custom", label: "Label" }], [next]);
  expect(result[0]).toBe(next);
  expect(label).not.toHaveBeenCalled();
});
