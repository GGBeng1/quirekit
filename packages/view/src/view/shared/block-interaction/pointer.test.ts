import { describe, expect, it, vi } from "vitest";
import { createEditor } from "@quirekit/core";
import type { QuireBlockPointerLease } from "@quirekit/core";
import type { BindMountedPointerSessionOptions } from "../pointer/session/types";
import { createMountedBlockPointerOwner } from "./pointer";

/** @param type - Native phase. @param x - Final coordinate. @param id - Pointer owner. @returns Synthetic browser event. */
function pointer(type: string, x: number, id = 1): PointerEvent {
  return Object.assign(new Event(type, { cancelable: true }), { clientX: x, clientY: 20, pointerId: id, button: 0, isPrimary: true }) as PointerEvent;
}

/** @returns Isolated mounted owner with observable browser resource lifetimes. */
function setup() {
  const editor = createEditor({ content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "A" }] }] } });
  const win = new EventTarget();
  const doc = Object.assign(new EventTarget(), { defaultView: win });
  const frames = new Map<number, FrameRequestCallback>();
  const capture = new Set<number>();
  const scroll = { update: vi.fn(), stop: vi.fn() };
  let available = true, editable = true, nextId = 0;
  const renderSelection = vi.fn();
  const owner = createMountedBlockPointerOwner({
    root: { ownerDocument: doc },
    coordinateSurface: {
      setPointerCapture: (id: number) => capture.add(id),
      hasPointerCapture: (id: number) => capture.has(id),
      releasePointerCapture: (id: number) => capture.delete(id)
    },
    mountedView: { get editable() { return editable; }, get state() { return editor.state.pm; } },
    renderSelection,
    createPointerAutoScrollController: () => scroll,
    requestPointerDragFrame: (callback: FrameRequestCallback) => { frames.set(++nextId, callback); return nextId; },
    cancelPointerDragFrame: (id: number) => { frames.delete(id); }
  } as unknown as BindMountedPointerSessionOptions, () => available);
  const lease = { update: vi.fn<QuireBlockPointerLease["update"]>(() => true), finish: vi.fn(), cancel: vi.fn() };
  return { editor, doc, win, frames, capture, scroll, owner, lease, renderSelection,
    /** @param value - Competing owner availability. */
    setAvailable(value: boolean) { available = value; },
    /** @param value - Current editing authorization. */
    setEditable(value: boolean) { editable = value; },
    /** Runs the latest coalesced pointer frame. */
    tick() { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(0)); }
  };
}

describe("mounted block pointer ownership", () => {
  it("allows selection-only leases in read mode without allowing block moves", () => {
    const s = setup();
    s.setEditable(false);
    expect(s.owner.begin(pointer("pointerdown", 0), s.lease)).toBeNull();
    const cancel = s.owner.begin(pointer("pointerdown", 0), { ...s.lease, selectionOnly: true });
    expect(cancel).not.toBeNull();
    s.doc.dispatchEvent(pointer("pointermove", 80)); s.tick();
    expect(s.lease.update).toHaveBeenCalledOnce();
    s.setEditable(true); s.owner.validate();
    expect(s.lease.cancel).toHaveBeenCalledOnce();
    expect(s.owner.active()).toBe(false);
    s.editor.destroy();
  });

  it("coalesces bursts and synchronously commits the exact pointerup sample", () => {
    const s = setup();
    const cancel = s.owner.begin(pointer("pointerdown", 0), s.lease)!;
    for (let x = 1; x <= 100; x++) s.doc.dispatchEvent(pointer("pointermove", x));
    expect(s.frames.size).toBe(1);
    expect(s.lease.update).not.toHaveBeenCalled();
    s.tick();
    expect(s.lease.update).toHaveBeenCalledExactlyOnceWith({ clientX: 100, clientY: 20 });
    s.doc.dispatchEvent(pointer("pointermove", 120));
    s.doc.dispatchEvent(pointer("pointerup", 130));
    expect(s.lease.update).toHaveBeenLastCalledWith({ clientX: 130, clientY: 20 });
    expect(s.lease.update).toHaveBeenCalledTimes(2);
    expect(s.renderSelection).toHaveBeenCalledWith("flush-pending");
    expect(s.lease.finish).toHaveBeenCalledTimes(1);
    expect(s.frames.size).toBe(0); expect(s.capture.size).toBe(0);
    cancel(); s.doc.dispatchEvent(pointer("pointermove", 200));
    expect(s.lease.cancel).not.toHaveBeenCalled();
    expect(s.frames.size).toBe(0);
    s.editor.destroy();
  });

  it.each(["pointercancel", "escape", "blur", "outside", "document", "readonly", "unmount"])("releases resources after %s without flushing pending content", reason => {
    const s = setup();
    const cancel = s.owner.begin(pointer("pointerdown", 0), s.lease)!;
    s.doc.dispatchEvent(pointer("pointermove", 50));
    if (reason === "pointercancel") s.doc.dispatchEvent(pointer("pointercancel", 90));
    if (reason === "escape") s.doc.dispatchEvent(Object.assign(new Event("keydown"), { key: "Escape", isComposing: false }));
    if (reason === "blur") s.win.dispatchEvent(new Event("blur"));
    if (reason === "outside") { s.lease.update.mockReturnValue(null); s.tick(); }
    if (reason === "document") { s.editor.commands.insertContent("changed"); s.owner.validate(); }
    if (reason === "readonly") { s.setEditable(false); s.owner.validate(); }
    if (reason === "unmount") s.owner.cancel();
    expect(s.owner.active()).toBe(false);
    expect(s.frames.size).toBe(0); expect(s.capture.size).toBe(0);
    expect(s.lease.finish).not.toHaveBeenCalled();
    expect(s.lease.cancel).toHaveBeenCalledTimes(1);
    expect(s.scroll.stop).toHaveBeenCalled();
    cancel(); s.doc.dispatchEvent(pointer("pointerup", 90));
    expect(s.lease.cancel).toHaveBeenCalledTimes(1);
    s.editor.destroy();
  });

  it("admits only one primary pointer and does not steal another input owner", () => {
    const s = setup();
    s.setAvailable(false); expect(s.owner.begin(pointer("pointerdown", 0), s.lease)).toBeNull();
    s.setAvailable(true); s.owner.begin(pointer("pointerdown", 0), s.lease);
    expect(s.owner.begin(pointer("pointerdown", 0, 2), s.lease)).toBeNull();
    s.doc.dispatchEvent(pointer("pointerup", 40, 2));
    expect(s.owner.active()).toBe(true);
    s.owner.cancel(); s.editor.destroy();
  });
});
