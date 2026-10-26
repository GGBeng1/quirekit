import type { SimpleInstance, SimpleTextEditChange } from "../types";
import { installSimplePlainInput } from "./input";

/**
 * Owns frame-coalesced input geometry within one native editing session.
 * @param instance - Vendor runtime whose realtime option is enabled.
 * @param mount - Lifetime boundary for native input and SVG.
 * @param reportError - Live adapter error sink.
 * @returns Disposal that cancels pending work before the existing layout drain.
 */
export function bindSimpleTextEdit(instance: SimpleInstance, mount: HTMLElement,
  reportError: (error: unknown) => void): () => void {
  const renderer = instance.renderer;
  installSimplePlainInput(instance);
  // 0.14.0-fix.3 replaces the instance method with an uncancellable debounce.
  // Reuse its original geometry algorithm, but own scheduling so an old input
  // cannot redraw after undo or run against a destroyed mount.
  const project = Reflect.get(Object.getPrototypeOf(renderer), "onNodeTextEditChange") as unknown;
  if (typeof project !== "function") throw new Error("Unsupported SimpleMindMap text editing lifecycle");
  const projectText = project.bind(renderer) as (change: SimpleTextEditChange) => void;
  instance.off("node_text_edit_change", renderer.onNodeTextEditChange);
  let frame = 0, inFlight = false, disposed = false;
  let latest: SimpleTextEditChange | undefined;

  /** Cancels the preceding session's uncommitted layout projection. */
  function cancel(): void { cancelAnimationFrame(frame); frame = 0; latest = undefined; }
  /** Requests at most one projection while the preceding full layout is active. */
  function request(): void {
    if (!disposed && !frame && !inFlight && latest) frame = requestAnimationFrame(run);
  }
  /** Projects the latest native value without introducing a second geometry authority. */
  function run(): void {
    frame = 0; const change = latest; latest = undefined;
    if (!change || disposed || !mount.isConnected || mount.inert || renderer.textEdit.getCurrentEditNode() !== change.node) return;
    inFlight = true;
    try { projectText(change); } catch (error) { inFlight = false; reportError(error); request(); }
  }
  /** Releases the multi-stage layout before projecting any newer native value. */
  function rendered(): void { inFlight = false; request(); }
  /** @param change - Latest native text; source publication still belongs to input commit. */
  function schedule(change: SimpleTextEditChange): void {
    latest = change; request();
  }
  instance.on("node_text_edit_change", schedule);
  instance.on("node_tree_render_end", rendered);
  instance.on("hide_text_edit", cancel);
  instance.on("before_show_text_edit", cancel);
  /** Releases the scheduler without reactivating the unsafe vendor listener. */
  return function dispose(): void {
    disposed = true; cancel();
    instance.off("node_text_edit_change", schedule);
    instance.off("node_tree_render_end", rendered);
    instance.off("hide_text_edit", cancel);
    instance.off("before_show_text_edit", cancel);
  };
}
