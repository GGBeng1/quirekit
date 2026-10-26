// @vitest-environment happy-dom
import { QuireColorPicker, QuireToolbarColorPickerDisclosure } from "@quirekit/ui/vue";
import type { QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import { computed, defineComponent, h, nextTick, ref, type PropType } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import type { ClassicEditorToolbarContributionFactory } from "../../../types";
import { resolveClassicEditorOverlayState } from "../../overlays/document-state";
import { mountClassicToolbar } from "./fixture";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).reverse().forEach(dispose => dispose()));

it("admits feature popups through same-root ownership and releases removed entries", async () => {
  const open = ref(false);
  const changes = vi.fn((event: { expanded: boolean }) => { open.value = event.expanded; });
  const factory: ClassicEditorToolbarContributionFactory = () => ({
    items: computed(() => [
      { value: "palette", kind: "disclosure", label: "Palette", expanded: open.value, contentRenderer: "body" },
      { value: "target", kind: "menu", label: "Font target", items: [{ value: "latin", label: "Latin" }] }
    ]),
    renderers: { body: defineComponent({ render: () => h("button", { "data-test-palette": "" }, "Apply") }) },
    openChange: event => { if (event.item.value === "palette") changes(event); }
  });
  const first = await mountClassicToolbar([{ kind: "ribbon-widget", id: "feature", groupId: "format", toolbar: factory }]);
  const second = await mountClassicToolbar([]);
  cleanup.push(first.dispose, second.dispose);
  first.sibling.setVisible(true);
  second.sibling.setVisible(true);
  const palette = first.host.querySelector<HTMLButtonElement>('[aria-label="Palette"]')!;
  palette.click();
  await vi.waitFor(() => expect(palette.getAttribute("aria-expanded")).toBe("true"));
  expect(first.sibling.isVisible()).toBe(false);
  expect(second.sibling.isVisible()).toBe(true);
  expect(changes).toHaveBeenLastCalledWith(expect.objectContaining({ expanded: true, item: expect.objectContaining({ value: "palette" }), path: ["palette"] }));
  const ownerId = palette.getAttribute("data-qk-classic-overlay");
  expect(ownerId).toBeTruthy();
  expect(document.querySelector('[data-test-palette]')?.closest('[role="dialog"]')?.getAttribute("data-qk-classic-overlay")).toBe(ownerId);
  const target = first.host.querySelector<HTMLButtonElement>('[aria-label="Font target"]')!;
  target.click();
  await vi.waitFor(() => expect(target.getAttribute("aria-expanded")).toBe("true"));
  expect(palette.getAttribute("aria-expanded")).toBe("false");
  expect(open.value).toBe(false);
  const targetId = target.getAttribute("data-qk-classic-overlay");
  expect(targetId).not.toBe(ownerId);
  expect(resolveClassicEditorOverlayState(document).coordinator.activeIds).toContain(targetId);
  first.groups.value = [];
  await nextTick();
  expect(resolveClassicEditorOverlayState(document).coordinator.activeIds).toEqual([second.sibling.id]);
});

it("coordinates an explicit custom ColorPicker while leaving ordinary custom controls unowned", async () => {
  const open = ref(false);
  const changes = vi.fn((event: { expanded: boolean }) => { open.value = event.expanded; });
  const Palette = defineComponent({
    props: { scope: { type: Object as PropType<QuireKitToolbarRendererScope>, required: true } },
    setup: props => () => h(QuireColorPicker, {
      open: props.scope.expanded,
      colors: [["#3E63DD", "#E5484D"]],
      portalTarget: props.scope.item.overlayProps?.portalTarget ?? "body",
      contentAttributes: props.scope.item.overlayProps?.contentAttributes ?? {},
      "onUpdate:open": props.scope.setExpanded
    }, { trigger: () => h(QuireToolbarColorPickerDisclosure, {
      ...props.scope.item.attributes, label: props.scope.item.label
    }, () => "Color") })
  });
  const Control = defineComponent({
    props: { scope: { type: Object as PropType<QuireKitToolbarRendererScope>, required: true } },
    setup: props => () => h("button", {
      ...props.scope.item.attributes, "aria-label": props.scope.item.label,
      onClick: () => props.scope.setExpanded(true)
    }, props.scope.item.label)
  });
  const factory: ClassicEditorToolbarContributionFactory = () => ({
    items: computed(() => [
      { value: "palette", kind: "custom", popup: "dialog", label: "Custom color", expanded: open.value, renderer: "palette" },
      { value: "plain", kind: "custom", label: "Plain custom", renderer: "control" },
      { value: "inline", kind: "custom", popup: false, label: "Inline custom", renderer: "control" }
    ]),
    renderers: { palette: Palette, control: Control },
    openChange: event => { if (event.item.value === "palette") changes(event); }
  });
  const first = await mountClassicToolbar([{ kind: "ribbon-widget", id: "colors", groupId: "format", toolbar: factory }]);
  const second = await mountClassicToolbar([]);
  cleanup.push(first.dispose, second.dispose);
  first.sibling.setVisible(true);
  second.sibling.setVisible(true);
  for (const label of ["Plain custom", "Inline custom"]) {
    const control = first.host.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;
    control.click();
    await nextTick();
    expect(control.getAttribute("data-qk-classic-overlay")).toBeNull();
    expect(first.sibling.isVisible()).toBe(true);
  }
  const palette = first.host.querySelector<HTMLButtonElement>('[aria-label="Custom color"]')!;
  palette.click();
  await vi.waitFor(() => expect(palette.getAttribute("aria-expanded")).toBe("true"));
  expect(first.sibling.isVisible()).toBe(false);
  expect(second.sibling.isVisible()).toBe(true);
  const ownerId = palette.getAttribute("data-qk-classic-overlay");
  expect(ownerId).toBeTruthy();
  const content = document.querySelector<HTMLElement>(`.qk-color-picker__content[data-qk-classic-overlay="${ownerId}"]`)!;
  expect(content).not.toBeNull();
  expect(content.getAttribute("role")).toBe("dialog");
  expect(content.lang).toBe("en");
  expect(first.host.contains(content)).toBe(false);
  expect(palette.getAttribute("aria-controls")).toBe(content.id);

  content.querySelector<HTMLButtonElement>('[aria-label="#E5484D"]')!.click();
  await vi.waitFor(() => expect(palette.getAttribute("aria-expanded")).toBe("false"));
  expect(open.value).toBe(false);
  expect(resolveClassicEditorOverlayState(document).coordinator.activeIds).toEqual([second.sibling.id]);
  palette.click();
  await vi.waitFor(() => expect(palette.getAttribute("aria-expanded")).toBe("true"));
  expect(changes).toHaveBeenLastCalledWith(expect.objectContaining({ expanded: true, path: ["palette"] }));
  first.groups.value = [];
  await nextTick();
  expect(resolveClassicEditorOverlayState(document).coordinator.activeIds).toEqual([second.sibling.id]);
  expect(document.querySelector(`.qk-color-picker__content[data-qk-classic-overlay="${ownerId}"]`)).toBeNull();
});

for (const availability of ["hidden", "disabled"] as const) {
  for (const target of ["entry", "ancestor"] as const) {
    it(`releases an open feature when its ${target} becomes ${availability} without recreating its factory`, async () => {
      const open = ref(false);
      const blocked = ref(false);
      const factory = vi.fn<ClassicEditorToolbarContributionFactory>(() => ({
        items: computed(() => [{
          value: "group", kind: "group", label: "Formatting",
          [availability]: target === "ancestor" && blocked.value,
          children: [{ value: "palette", kind: "disclosure", label: "Palette",
            [availability]: target === "entry" && blocked.value,
            expanded: open.value, contentRenderer: "body" }]
        }]),
        renderers: { body: defineComponent({ render: () => h("button", { "data-availability-palette": "" }, "Apply") }) },
        openChange: event => { open.value = event.expanded; }
      }));
      const fixture = await mountClassicToolbar([{ kind: "ribbon-widget", id: "feature", groupId: "format", toolbar: factory }]);
      cleanup.push(fixture.dispose);
      const trigger = fixture.host.querySelector<HTMLButtonElement>('[aria-label="Palette"]')!;
      trigger.click();
      await vi.waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("true"));
      const ownerId = trigger.getAttribute("data-qk-classic-overlay");
      expect(resolveClassicEditorOverlayState(document).coordinator.activeIds).toContain(ownerId);
      blocked.value = true;
      await vi.waitFor(() => {
        expect(open.value).toBe(false);
        expect(resolveClassicEditorOverlayState(document).coordinator.activeIds).not.toContain(ownerId);
        expect(document.querySelector("[data-availability-palette]")).toBeNull();
      });
      if (availability === "hidden") {
        expect(fixture.host.querySelector('[aria-label="Palette"]')).toBeNull();
      } else {
        expect(trigger.getAttribute("aria-disabled")).toBe("true");
      }
      blocked.value = false;
      await nextTick();
      await nextTick();
      const restored = fixture.host.querySelector<HTMLButtonElement>('[aria-label="Palette"]')!;
      expect(restored.getAttribute("aria-expanded")).toBe("false");
      expect(factory).toHaveBeenCalledTimes(1);
      restored.click();
      await vi.waitFor(() => expect(restored.getAttribute("aria-expanded")).toBe("true"));
    });
  }
}
