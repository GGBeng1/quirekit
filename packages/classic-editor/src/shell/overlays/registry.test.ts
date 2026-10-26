import { computed, nextTick, ref, watch } from "vue";
import { expect, it, vi } from "vitest";
import { useClassicEditorOverlay } from "./registry";
import { resolveClassicEditorOverlayState } from "./document-state";

// Exercise the reactive coordinator independently of a mounted Vue component.
vi.mock("vue", async importOriginal => ({
  ...await importOriginal<typeof import("vue")>(),
  getCurrentInstance: () => null,
  onBeforeUnmount: vi.fn()
}));

it("retains one registration when controlled visibility synchronously re-enters", () => {
  const ownerDocument = new EventTarget() as Document;
  const root = { ownerDocument } as HTMLElement;
  const open = ref(false);
  const changes: boolean[] = [];
  const controlled = computed({
    get: () => open.value,
    set: value => { changes.push(value); open.value = value; }
  });
  const overlay = useClassicEditorOverlay("test", controlled, ownerDocument, root);
  const stop = watch(open, value => overlay.setVisible(value), { flush: "sync" });

  for (let attempt = 0; attempt < 3; attempt++) {
    changes.length = 0;
    overlay.setVisible(true);
    overlay.setVisible(true);
    expect(open.value).toBe(true);
    expect(changes).not.toContain(false);
    expect(resolveClassicEditorOverlayState(ownerDocument).coordinator.activeIds)
      .toEqual([overlay.id]);
    overlay.setVisible(false);
    expect(open.value).toBe(false);
    expect(resolveClassicEditorOverlayState(ownerDocument).coordinator.activeIds).toEqual([]);
  }
  stop();
  overlay.close();
});

it("flushes a sibling's controlled close before showing its replacement", async () => {
  const ownerDocument = new EventTarget() as Document;
  const root = { ownerDocument } as HTMLElement;
  const firstOpen = ref(false);
  const secondOpen = ref(false);
  const first = useClassicEditorOverlay("first", firstOpen, ownerDocument, root);
  const second = useClassicEditorOverlay("second", secondOpen, ownerDocument, root);
  first.setVisible(true);
  second.setVisible(true);
  expect(firstOpen.value).toBe(false);
  expect(secondOpen.value).toBe(false);
  second.setVisible(true);
  expect(secondOpen.value).toBe(false);
  await nextTick();
  expect(secondOpen.value).toBe(true);
  expect(resolveClassicEditorOverlayState(ownerDocument).coordinator.activeIds)
    .toEqual([second.id]);
  second.close();
});

it("cancels a pending handoff when its requested surface closes", async () => {
  const ownerDocument = new EventTarget() as Document;
  const root = { ownerDocument } as HTMLElement;
  const first = useClassicEditorOverlay("first", ref(false), ownerDocument, root);
  const pending = ref(false);
  const second = useClassicEditorOverlay("second", pending, ownerDocument, root);
  first.setVisible(true);
  second.setVisible(true);
  second.close();
  await nextTick();
  expect(pending.value).toBe(false);
  expect(resolveClassicEditorOverlayState(ownerDocument).coordinator.activeIds).toEqual([]);
});

it("retains an anchored parent while switching its child popup and closes the whole branch for a dialog", async () => {
  const ownerDocument = new EventTarget() as Document;
  const root = { ownerDocument } as HTMLElement;
  const parent = useClassicEditorOverlay("selection", ref(false), ownerDocument, root);
  const options = { resolveParentId: () => parent.id, dismissOnEscape: () => false };
  const font = useClassicEditorOverlay("font", ref(false), ownerDocument, root, options);
  const color = useClassicEditorOverlay("color", ref(false), ownerDocument, root, options);
  const dialog = useClassicEditorOverlay("link", ref(false), ownerDocument, root);
  const coordinator = resolveClassicEditorOverlayState(ownerDocument).coordinator;
  parent.setVisible(true);
  font.setVisible(true);
  expect(coordinator.activeIds).toEqual([parent.id, font.id]);
  coordinator.dismissEscape();
  expect(parent.isVisible()).toBe(true);
  color.setVisible(true);
  await nextTick();
  expect(font.isVisible()).toBe(false);
  expect(coordinator.activeIds).toEqual([parent.id, color.id]);
  dialog.setVisible(true);
  await nextTick();
  expect(parent.isVisible()).toBe(false);
  expect(color.isVisible()).toBe(false);
  expect(coordinator.activeIds).toEqual([dialog.id]);
  dialog.close();
});
