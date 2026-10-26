// @vitest-environment happy-dom
import { defaultTheme } from "@quirekit/ui";
import { h, nextTick, ref } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { resolveClassicEditorOverlayState } from "../../shell/overlays/document-state";
import { createClassicEditorUiApp } from "../../shell/vue-app";
import AnchoredOverlay from "./anchored-overlay.vue";
import type {
  ClassicEditorAnchoredOverlayAnchor,
  ClassicEditorAnchoredOverlayScope
} from "./types";

const cleanups: Array<() => void> = [];

afterEach(() => cleanups.splice(0).reverse().forEach(dispose => dispose()));

/** @param persistent - Whether selection owns the surface lifetime. @param live - Whether the consumer supplies a geometry resolver. @returns A mounted headless overlay with mutable controlled inputs. */
async function mountAnchoredOverlay(persistent = false, live = true) {
  const root = document.createElement("section");
  root.className = "qk-classic-editor";
  const input = document.createElement("input");
  const overlayHost = document.createElement("div");
  overlayHost.dataset.qkClassicDocumentOverlays = "";
  const readHostRect = vi.fn(() => ({
    x: 100,
    y: 50,
    top: 50,
    right: 900,
    bottom: 1250,
    left: 100,
    width: 800,
    height: 1200,
    toJSON: () => undefined
  }));
  overlayHost.getBoundingClientRect = readHostRect;
  const mount = document.createElement("div");
  root.append(input, overlayHost, mount);
  document.body.append(root);
  input.focus();

  const show = ref(true);
  const anchor = ref<ClassicEditorAnchoredOverlayAnchor | null>({ x: 360, y: 250 });
  const readAnchor = vi.fn(() => anchor.value);
  const app = createClassicEditorUiApp({
    render: () => h(AnchoredOverlay, {
      show: show.value,
      anchor: anchor.value,
      ...(live ? { resolveAnchor: readAnchor } : {}),
      editorRoot: root,
      placement: "top",
      overlayFamily: "test-anchor",
      persistent,
      "onUpdate:show": (value: boolean) => { show.value = value; }
    }, {
      default: ({
        ownerAttributes,
        style,
        portalTarget,
        close
      }: ClassicEditorAnchoredOverlayScope) => h("div", {
        ...ownerAttributes,
        style,
        tabindex: "-1",
        "data-test-anchored-surface": "",
        "data-test-portal-target": portalTarget === overlayHost ? "document" : "other",
        onDblclick: close
      }, "Surface")
    })
  }, {}, () => defaultTheme);
  app.mount(mount);
  cleanups.push(() => {
    app.unmount();
    root.remove();
  });
  await nextTick();

  /** @returns The currently rendered public surface. */
  function surface(): HTMLElement | null {
    return overlayHost.querySelector<HTMLElement>("[data-test-anchored-surface]");
  }

  return { anchor, input, overlayHost, readAnchor, readHostRect, root, show, surface };
}

it("teleports the public surface directly into document space without Popover chrome", async () => {
  const { overlayHost, surface } = await mountAnchoredOverlay();
  const element = surface();
  expect(element).not.toBeNull();
  expect(element!.parentElement).toBe(overlayHost);
  expect(element!.closest(".qk-popover__content")).toBeNull();
  expect(element!.dataset.testPortalTarget).toBe("document");
  expect(element!.style.position).toBe("absolute");
  expect(element!.style.left).toBe("260px");
  expect(element!.style.top).toBe("200px");
  expect(element!.style.transform).toBe("translate(-50%, calc(-100% - 8px))");
  expect(element!.style.background).toBe("");
  expect(element!.style.padding).toBe("");
  expect(element!.style.boxShadow).toBe("");
});

it("coalesces scroll projection without resolving semantic geometry or remounting controls", async () => {
  const { anchor, readAnchor, readHostRect, root, show, surface } = await mountAnchoredOverlay();
  root.getBoundingClientRect = () => new DOMRect(100, 150, 800, 500);
  const element = surface()!;
  element.getBoundingClientRect = () => new DOMRect(0, 0, 480, 76);
  anchor.value = { x: 360, y: 250, rects: [{ x: 310, y: 250, width: 100, height: 120 }] };
  await nextTick();
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  await nextTick();
  const hostRect = readHostRect();
  readHostRect.mockReturnValue({ ...hostRect, y: -80, top: -80, bottom: 1120 });
  readHostRect.mockClear();
  readAnchor.mockClear();
  for (let i = 0; i < 8; i += 1) root.dispatchEvent(new Event("scroll", { bubbles: true }));
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  await nextTick();
  expect(readHostRect).toHaveBeenCalledTimes(1);
  expect(readAnchor).not.toHaveBeenCalled();
  expect(surface()).toBe(element);
  expect(Number.parseFloat(element.style.top) - 80).toBe(248);

  show.value = false;
  await nextTick();
  readHostRect.mockClear();
  root.dispatchEvent(new Event("scroll", { bubbles: true }));
  window.dispatchEvent(new Event("resize"));
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  expect(readHostRect).not.toHaveBeenCalled();
  expect(readAnchor).not.toHaveBeenCalled();
});

it("keeps selection-owned surfaces out of transient menu arbitration", async () => {
  const { input, surface, show } = await mountAnchoredOverlay(true);
  const owner = surface()!.getAttribute("data-qk-classic-overlay")!;
  expect(resolveClassicEditorOverlayState(document).coordinator.activeIds).not.toContain(owner);
  input.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  await nextTick();
  expect(surface()).not.toBeNull();
  show.value = false;
  await nextTick();
  expect(surface()).toBeNull();
});

it("retains document coordinates across resize when no live resolver was supplied", async () => {
  const { readHostRect, surface } = await mountAnchoredOverlay(false, false);
  const point = { left: surface()!.style.left, top: surface()!.style.top };
  const rect = readHostRect();
  readHostRect.mockReturnValue({ ...rect, y: -50, top: -50, bottom: 1150 });
  window.dispatchEvent(new Event("resize"));
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  await nextTick();
  expect({ left: surface()!.style.left, top: surface()!.style.top }).toEqual(point);
});

it("releases an invalid semantic target and reopens from fresh geometry", async () => {
  const { anchor, show, surface } = await mountAnchoredOverlay();
  const owner = surface()!.getAttribute("data-qk-classic-overlay")!;
  const state = resolveClassicEditorOverlayState(document);
  expect(state.coordinator.activeIds).toContain(owner);
  anchor.value = null;
  await nextTick();
  expect(surface()).toBeNull();
  expect(show.value).toBe(true);
  expect(state.coordinator.activeIds).not.toContain(owner);
  anchor.value = { x: 480, y: 310 };
  await nextTick();
  expect(surface()!.style.left).toBe("380px");
  expect(surface()!.style.top).toBe("260px");
  expect(resolveClassicEditorOverlayState(document).coordinator.activeIds)
    .toContain(owner);
});

it("dismisses outside pointers and restores opening focus after Escape", async () => {
  const { input, show, surface } = await mountAnchoredOverlay();
  surface()!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  await nextTick();
  expect(show.value).toBe(true);

  input.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  await nextTick();
  expect(show.value).toBe(false);

  show.value = true;
  await nextTick();
  surface()!.focus();
  surface()!.dispatchEvent(new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true
  }));
  await nextTick();
  await Promise.resolve();
  expect(show.value).toBe(false);
  expect(document.activeElement).toBe(input);
});

it("exposes one close function without imposing a visible wrapper", async () => {
  const { show, surface } = await mountAnchoredOverlay();
  surface()!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  await nextTick();
  expect(show.value).toBe(false);
  expect(surface()).toBeNull();
});
