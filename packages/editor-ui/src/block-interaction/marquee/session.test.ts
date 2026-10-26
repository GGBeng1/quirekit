import { afterEach, describe, expect, it, vi } from "vitest";
import { BlockSelection, createEditor, type QuireBlockPointerLease, type QuireMountedBlockFragment } from "@quirekit/core";
import { BlockInteraction, readBlockCatalog } from "@quirekit/extensions";
import { startEditorBlockMarquee } from "./session";

/** Minimal host geometry; the mounted owner, not this adapter, supplies browser events. */
class Host {
  /** Whether this target belongs to interactive chrome. */ control = false;
  /** Test scrollport borders. */ clientLeft = 0;
  /** Test scrollport borders. */ clientTop = 0;
  /** Visible scrollport height. */ clientHeight = 600;
  /** Width available to gestures, excluding the native scrollbar. */
  get clientWidth() { return this.width - 10; }
  /** @param left - Client origin. @param width - Visible width. */
  constructor(readonly left = 0, readonly width = 900) {}
  /** @returns Stable host bounds. */
  getBoundingClientRect() { return { x: this.left, y: 20, left: this.left, top: 20, right: this.left + this.width, bottom: 620, width: this.width, height: 600 }; }
  /** @returns Whether the target belongs to this host. */ contains() { return true; }
  /** @returns Interactive ancestor, if one owns the press. */ closest() { return this.control ? this : null; }
}

/** @returns Real document commands with a deterministic mounted geometry/pointer boundary. */
function setup() {
  vi.stubGlobal("Element", Host);
  const editor = createEditor({ extensions: [BlockInteraction], content: { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "One" }] },
    { type: "paragraph", content: [{ type: "text", text: "Two" }] }
  ] } });
  const catalog = readBlockCatalog(editor)!;
  let fragments = catalog.blocks.map(block => ({ from: block.from, to: block.to, sourceDocument: catalog.doc }) as QuireMountedBlockFragment);
  let lease: QuireBlockPointerLease;
  const view = { dom: new Host(100, 700), focus: vi.fn(), dispatch: editor.view.dispatch.bind(editor.view),
    queryBlockFragmentsInRect: vi.fn(() => fragments),
    beginBlockDrag: vi.fn((_event: PointerEvent, value: QuireBlockPointerLease) => { lease = value; return () => lease.cancel(); }) };
  Object.defineProperty(editor, "mountedView", { value: view, configurable: true });
  const viewport = new Host() as unknown as HTMLElement;
  const target = new Host();
  const event = { target, clientX: 60, clientY: 80, button: 0, isPrimary: true, pointerType: "mouse" } as unknown as PointerEvent;
  return { editor, view, target, viewport, event, catalog, lease: () => lease!, clearHits: () => { fragments = []; } };
}

afterEach(() => vi.unstubAllGlobals());

describe("marquee selection adapter", () => {
  it("stops when a transaction is refused instead of presenting a different selected range", () => {
    const f = setup(), preview = vi.fn();
    f.view.dispatch = vi.fn();
    startEditorBlockMarquee(f.editor, f.viewport, f.event, preview);
    expect(f.lease().update({ clientX: 200, clientY: 150 })).toBeNull();
    expect(f.editor.state.pm.selection.empty).toBe(true);
    expect(preview).not.toHaveBeenCalled();
    Object.defineProperty(f.editor, "mountedView", { value: undefined }); f.editor.destroy();
  });

  it("bounds geometry and transaction work per accepted frame and leaves document identity unchanged", () => {
    const f = setup(), preview = vi.fn(), doc = f.editor.state.doc;
    let transactions = 0;
    f.editor.on("transaction", () => { transactions++; });
    const cancel = startEditorBlockMarquee(f.editor, f.viewport, f.event, preview);
    expect(cancel).toBeTypeOf("function");
    expect(f.lease().selectionOnly).toBe(true);
    expect(f.lease().update({ clientX: 62, clientY: 82 })).toBe(false);
    expect(f.view.queryBlockFragmentsInRect).not.toHaveBeenCalled();
    for (let index = 0; index < 20; index++) expect(f.lease().update({ clientX: 200, clientY: 120 + index })).toBe(true);
    expect(f.view.queryBlockFragmentsInRect).toHaveBeenCalledTimes(20);
    expect(f.view.focus).toHaveBeenCalledTimes(1);
    expect(transactions).toBe(1);
    expect(f.editor.state.pm.selection).toBeInstanceOf(BlockSelection);
    expect(f.editor.state.doc).toBe(doc);
    expect(readBlockCatalog(f.editor)).toBe(f.catalog);
    f.clearHits(); f.lease().update({ clientX: 65, clientY: 150 });
    expect(f.editor.state.pm.selection.empty).toBe(true);
    expect(transactions).toBe(2);
    f.lease().update({ clientX: 65, clientY: 180 });
    expect(transactions).toBe(2);
    cancel!(); expect(preview).toHaveBeenLastCalledWith(null);
    Object.defineProperty(f.editor, "mountedView", { value: undefined }); f.editor.destroy();
  });

  it("refuses text, controls and modified presses, and invalidates a changed document", () => {
    const f = setup(), preview = vi.fn();
    for (const override of [{ clientX: 200 }, { clientX: 895 }, { shiftKey: true }, { pointerType: "touch" }, { button: 2 }]) {
      expect(startEditorBlockMarquee(f.editor, f.viewport, { ...f.event, ...override }, preview)).toBeNull();
    }
    f.target.control = true;
    expect(startEditorBlockMarquee(f.editor, f.viewport, f.event, preview)).toBeNull();
    f.target.control = false;
    startEditorBlockMarquee(f.editor, f.viewport, f.event, preview);
    f.editor.commands.insertContent("Changed");
    expect(f.lease().update({ clientX: 200, clientY: 150 })).toBeNull();
    expect(f.view.queryBlockFragmentsInRect).not.toHaveBeenCalled();
    Object.defineProperty(f.editor, "mountedView", { value: undefined }); f.editor.destroy();
  });
});
