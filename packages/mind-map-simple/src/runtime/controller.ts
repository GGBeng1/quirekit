import { setSimpleMindMapLocale } from "../vendor/locale";
import { mindMapRuntimeMessages } from "./locale";
import { applyMindMapContent, type MindMapDocument } from "@quirekit/mind-map";
import { fromSimpleTree } from "../codec/mapping";
import type { MindMapEditor, MindMapEditorCommand, MindMapEditorState, SimpleMindMapOptions } from "../types";
import type { SimpleInstance } from "../vendor/types";
import { bindSimpleTextEdit } from "../vendor/text";
import { bindMindMapInput } from "./input/binding";
import { createMindMapOverview } from "./overview/session";
import { createMindMapViewportController } from "./viewport/controller";
import { bindMindMapViewport } from "./viewport/binding";
import { projectMindMapAppearance } from "./appearance";
import { settleMindMapLayout } from "./layout";
import { captureMindMapSvg } from "./snapshot";
import { createMindMapStructure } from "./structure";
import { bindMindMapGestures } from "./gestures/binding";
import { createMindMapNavigation } from "./authoring/navigation";
import { bindSimpleSelectionProjection } from "../vendor/selection";
import { bindSimpleLayout } from "../vendor/layout";
import { bindMindMapClipboard } from "./input/clipboard/binding";
import { createMindMapQueue } from "./queue";
import { createMindMapCommandHandler } from "./authoring/commands";
import { mindMapStructureState } from "./authoring/state";
import { createMindMapProperties } from "./authoring/properties";
import { bindMindMapAnnotations } from "./annotations/binding";
import { captureMindMapDraft } from "./checkpoint";

/**
 * Owns one initialized vendor instance and exposes only the admitted editing contract.
 * @param instance - Initialized vendor runtime.
 * @param mount - Instance-owned DOM, not the caller's container.
 * @param base - Immutable source metadata.
 * @param options - Host callbacks and lifetime.
 * @returns Controlled editor with idempotent asynchronous disposal.
 */
export function createMindMapController(instance: SimpleInstance, mount: HTMLElement,
  base: MindMapDocument, options: SimpleMindMapOptions): MindMapEditor {
  let closed = false;
  let disposal: Promise<void> | undefined;
  let changes = 0;
  let selectionVersion = 0;
  let readOnly = options.readOnly === true;
  /** @returns Small UI state; structural availability only scans the selected node's siblings. */
  function getState(): MindMapEditorState {
    const node = instance.renderer.activeNodeList[0];
    return { rootText: instance.renderer.renderTree.data.text, structure: mindMapStructureState(instance),
      layout: instance.renderer.renderTree.data._quirekitLayout ?? base.layout, busy: queue.busy(), geometryVersion: overview.version(),
      selectedId: node ? String(node.getData("uid")) : null, selectedIsRoot: node?.isRoot ?? false,
      selectedCount: instance.renderer.activeNodeList.length, selectionVersion,
      composing: input.isComposing(), readOnly,
      canUndo: instance.command.activeHistoryIndex > 0,
      canRedo: instance.command.activeHistoryIndex < instance.command.history.length - 1,
      scale: instance.view.scale, x: instance.view.x, y: instance.view.y };
  }
  /** Publishes derived state without touching tree serialization or host history. */
  function stateChanged(): void { if (!closed) options.onStateChange?.(getState()); }
  /** Invalidates only consumers of selected-topic identities/properties. */
  function selectionChanged(): void { selectionVersion++; stateChanged(); }
  /** Rejects methods after closure or while native composition is unfinished. */
  function assertActive(): void {
    if (closed) throw new Error("Mind map editor is closed");
    if (input.isComposing()) throw new Error("Finish text composition before changing the mind map");
  }
  /** Rejects writes after closure, during composition or after a permission change. */
  function assertWritable(): void { assertActive(); if (readOnly) throw new Error("Mind map editor is readonly"); }
  /** Publishes only invalidation; full source conversion is explicit. */
  function changed(): void { if (!closed) { options.onChange?.(++changes); options.onDraftChange?.(); } }
  /** @param error - Failure from an event-owned command. */
  function reportError(error: unknown): void { if (!closed) (options.onError ?? console.error)(error); }
  /** Closes an instance whose owning request has been aborted. */
  function aborted(): void { void destroy().catch(reportError); }
  /** @returns Detached source after current text and pending layout have settled. */
  async function getDocument(): Promise<MindMapDocument> {
    await options.beforeMutation?.();
    await queue.settled();
    assertActive(); instance.renderer.textEdit.hideEditTextBox();
    await settleMindMapLayout(instance); assertActive();
    return fromSimpleTree(instance.getData(), base);
  }
  /** @returns Completion of releasing the instance; repeated callers share one promise. */
  function destroy(): Promise<void> {
    if (disposal) return disposal;
    closed = true; gestures.dispose(); overview.dispose(); disposeAnnotations(); disposeTextEdit(); disposeClipboard(); disposeLayout(); input.dispose(); viewport.dispose();
    options.signal?.removeEventListener("abort", aborted);
    instance.off("data_change", changed);
    instance.off("node_active", selectionChanged);
    stateEvents.forEach(event => instance.off(event, stateChanged));
    mount.inert = true;
    instance.command.pause();
    instance.renderer.textEdit.hideEditTextBox();
    // The vendor's multi-stage layout retains DOM references. Drain it before
    // destroy rather than letting a late layout callback touch a removed surface.
    disposal = settleMindMapLayout(instance).then(() => {
      try { instance.destroy(); } finally { disposeSelection(); mount.remove(); }
    });
    return disposal;
  }
  const queue = createMindMapQueue(stateChanged);
  /** @param action - Native mutation captured before its property preflight. @returns Ordered draft then source publication. */
  function mutate<T>(action: () => Promise<T>): Promise<T> {
    const pending = options.beforeMutation?.();
    return pending ? pending.then(() => queue.run(action)) : queue.run(action);
  }
  /** @param command - Accepted operation. @returns Serialized command completion. */
  function execute(command: MindMapEditorCommand): Promise<void> {
    // Opening native input is a cancellable focus intent, not a source mutation.
    // Keep its latest-request-wins gate instead of queueing stale edit targets.
    if (command === "edit-text") return queue.busy() ? Promise.resolve() : applyCommand(command);
    return mutate(() => applyCommand(command));
  }
  const disposeTextEdit = bindSimpleTextEdit(instance, mount, reportError);
  const disposeSelection = bindSimpleSelectionProjection(instance);
  const disposeLayout = bindSimpleLayout(instance, base.layout);
  const input = bindMindMapInput(mount, instance, execute, reportError, () => readOnly, stateChanged, queue.busy, () => gestures.cancel(), options.onDraftChange);
  const structure = createMindMapStructure(instance, base, assertActive, assertWritable, () => mount.lang);
  const applyCommand = createMindMapCommandHandler({ instance, structure, assertWritable, assertActive, cancel: () => gestures.cancel() });
  const gestures = bindMindMapGestures(instance, mount, { blocked: () => closed || readOnly || input.isComposing() || queue.busy(),
    drop: drop => mutate(async () => { assertWritable(); await structure.drop(drop); }),
    add: point => mutate(async () => { assertWritable(); await structure.add(point); }), report: reportError });
  const disposeClipboard = bindMindMapClipboard(mount, instance, {
    read: () => {
      assertActive(); const source = fromSimpleTree(instance.getData(), base), pending = options.pendingContent?.();
      return pending ? applyMindMapContent(source, pending) : source;
    },
    remove: ids => mutate(async () => { assertWritable(); gestures.cancel(); await structure.remove(ids); }),
    paste: (fragment, target) => mutate(async () => { assertWritable(); gestures.cancel(); await structure.paste(fragment, target); }),
    busy: queue.busy, readOnly: () => readOnly, composing: input.isComposing, report: reportError,
  });
  const viewport = bindMindMapViewport(instance, mount, input.isComposing);
  const overview = createMindMapOverview(instance, stateChanged);
  mount.style.setProperty("--qk-mind-accent", options.appearance?.primary ?? "#4855ec");
  mount.style.setProperty("--qk-mind-surface", options.appearance?.surface ?? "#ffffff");
  const disposeAnnotations = bindMindMapAnnotations(instance, mount);
  if (base.annotations?.length) viewport.fit();
  const stateEvents = ["back_forward", "view_data_change", "data_change"];
  instance.on("node_active", selectionChanged);
  stateEvents.forEach(event => instance.on(event, stateChanged));
  instance.on("data_change", changed);
  options.signal?.addEventListener("abort", aborted, { once: true });
  return {
    getDocument, execute, destroy, getState,
    /** @returns Passive stable source, without flushing properties, input or renderer history. */
    captureDraft() { return closed || input.isComposing() || queue.busy() ? null : captureMindMapDraft(instance, base); },
    /** @returns Detached cached silhouettes for an explicitly opened overview. */
    getOverview() { assertActive(); return overview.read(); },
    /** @param locale - UI-only language change, safe even during native composition. */
    setLocale(locale) {
      if (closed) throw new Error("Mind map editor is closed");
      mount.lang = locale;
      mount.setAttribute("aria-label", options.label ?? mindMapRuntimeMessages(locale).canvas);
      setSimpleMindMapLocale(instance, locale);
    },
    ...createMindMapProperties({ instance, structure, assertActive, assertWritable, cancel: () => gestures.cancel() }, queue),
    ...createMindMapNavigation({ instance, structure, assertActive, assertWritable, cancel: () => gestures.cancel() }, queue, mount,
      () => changes, () => closed || input.isComposing() || queue.busy(), () => readOnly),
    /** @param layout - Canonical layout. @returns Serialized layout change. */
    setLayout: layout => queue.run(async () => { assertWritable(); gestures.cancel(); await structure.setLayout(layout); }),
    /** @param next - Requested authoring mode. */
    setReadOnly(next) { assertActive(); gestures.cancel(); readOnly = next; instance.setMode(next ? "readonly" : "edit"); stateChanged(); },
    /** Focuses the connected editor without resetting selection. */
    focus() { assertActive(); mount.focus({ preventScroll: true }); },
    ...createMindMapViewportController(instance, viewport, assertActive),
    /** @param appearance - Host theme. @returns Appearance layout completion. */
    async setAppearance(appearance) {
      assertActive(); instance.renderer.textEdit.hideEditTextBox();
      gestures.cancel(); mount.style.setProperty("--qk-mind-accent", appearance.primary);
      mount.style.setProperty("--qk-mind-surface", appearance.surface);
      instance.setThemeConfig(projectMindMapAppearance(appearance));
      await settleMindMapLayout(instance); assertActive();
    },
    /** @returns Snapshot of the current source; closure prevents stale publication. */
    async exportSvg() {
      const current = await getDocument();
      assertActive(); return captureMindMapSvg(instance, current);
    },

  };
}
