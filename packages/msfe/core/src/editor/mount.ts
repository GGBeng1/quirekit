import { createEventDispatcher } from "./events";
import { focusSourceView } from "../input/proxy/focus";
import { createSourceIdentity } from "../identity/uuid";
import { editorCapabilities } from "./capabilities";
import { projectionLayers } from "../presentation/layers/runtime";
import { applyExternalChange } from "./external";
import { applyViewStateUpdate } from "./view-state";
import { createCommandRegistry } from "../commands/registry";
import { registerAgentSurface } from "../commands/agent";
import { extensionLifecycle } from "../extensions/lifecycle";
import { NodeViewRuntime } from "../views/runtime";
import { nodeViewGeometry } from "../views/geometry/runtime";
import { EditorView } from "@quirekit/cm-view";
import { EditorSelection } from "@quirekit/cm-state";
import { HistoryController } from "../history/controller";
import { localHistory } from "../history/local";
import type { CompiledExtensions } from "../extensions/types";
import type { SourceRuntime } from "../source-provider/runtime";
import { createDocumentState } from "../mount/state";
import { codeLanguageCatalog } from "../source/languages/catalog";
import { createSearchPanel } from "../search/panel";
import { Presentation } from "../mount/presentation";
import { sourceNavigation } from "../search/navigation/extension";
import { navigationEffect } from "../search/navigation/effect";
import { liveProjection } from "../presentation/projection";
import { sourceRevealGesture } from "../presentation/gesture";
import { buildCommandTransaction } from "../commands/transaction";
import { compositionField, revisionField } from "../state/fields";
import { readMarkdownInput, writeMarkdown } from "../state/source";
import type { MsfeCommand } from "../state/types";
import type { MsfeChangeEvent, MsfeEditor, MsfeEditorOptions, MsfeResult, MsfeTarget } from "./types";

/**
 * Mounts a source-first editor with one state, history and browser input owner.
 * @param options - Mount, document, plugin and host event configuration.
 * @param compiled - Validated extension contributions.
 * @param runtime - Acquired source lease.
 * @param register - Cleanup registration for partial installation.
 * @param ready - Publishes the editor identity before extension lifecycle hooks run.
 * @returns Independent, disposable editor public API.
 */
export function mountEditor(options: MsfeEditorOptions, compiled: CompiledExtensions, runtime: SourceRuntime,
  register: (dispose: () => void) => void, ready: (editor: MsfeEditor) => void): MsfeEditor {
  let editor: MsfeEditor;
  let view: EditorView;
  let mounted = false;
  let source = runtime.lease?.source ?? readMarkdownInput(options.markdown ?? "");
  let documentId = runtime.lease?.documentId ?? options.documentId ?? createSourceIdentity();
  let destroyed = false;
  const instanceId = createSourceIdentity();
  const presentation = new Presentation(options);
  const nodeViews = new NodeViewRuntime(() => editor, options.componentHost, reportError);
  const lifecycle = extensionLifecycle(compiled, reportError);
  const capabilities = editorCapabilities(() => editor, compiled, reportError);
  const codeLanguages = codeLanguageCatalog(options.codeLanguages ?? [], capabilities.api.scope.signal, reportError);
  const layers = projectionLayers(compiled, () => editor, options.componentHost);
  const history = new HistoryController(runtime.lease?.history ?? localHistory(), () => view, () => destroyed || runtime.blocked, reportError);
  register(() => { history.destroy(); capabilities.destroy(); lifecycle.destroy(); nodeViews.reset(); presentation.destroy(); view?.destroy(); });
  const counters = { projections: 0, visitedNodes: 0, decorations: 0, sourceReads: 0, navigationMeasurements: 0, navigationCorrections: 0 };
  const listeners = new Set<(event: MsfeChangeEvent) => void>();
  if (options.onChange) listeners.add(options.onChange);
  const emit = createEventDispatcher({ listeners, destroyed: () => destroyed, report: reportError,
    transaction(current, transaction) { capabilities.publish(transaction); lifecycle.transaction(current, transaction); } });

  /** @param error - Plugin or host listener failure. */
  function reportError(error: unknown): void {
    if (options.onError) options.onError(error);
    else console.error(error);
  }

  /** @param revision - Monotonic base version. @param text - Candidate canonical document. @returns Fresh validated state. */
  function createState(revision = 0, text = source.text) {
    return createDocumentState(text, [history.extensions(), runtime.extensions(), compiled.extensions, presentation.extensions(), sourceRevealGesture, layers.extensions,
      sourceNavigation(() => presentation.cancelAnchor(), counters), nodeViewGeometry,
      liveProjection(compiled, counters, nodeViews), EditorView.exceptionSink.of(reportError),
      EditorView.contentAttributes.of({ "aria-label": options.label ?? "Markdown 编辑器", spellcheck: "false" }),
    ], revision, compiled.syntax, options.icons, codeLanguages, owner => createSearchPanel(owner, options));
  }

  const initialState = createState();

  /** @param target - Captured intent. @returns Rejection when a public write is unsafe or stale. */
  function rejection(target?: MsfeTarget): MsfeResult | undefined {
    if (destroyed) return { ok: false, reason: "destroyed" };
    if (!mounted) return { ok: false, reason: "not-mounted" };
    if (view.state.readOnly || runtime.blocked) return { ok: false, reason: "readonly" };
    if (view.state.field(compositionField)) return { ok: false, reason: "composing" };
    if (target && (target.instanceId !== instanceId || target.documentId !== documentId || target.revision !== view.state.field(revisionField))) {
      return { ok: false, reason: "stale-target" };
    }
    return undefined;
  }

  /** @param commands - Planners for one atomic action. @param target - Captured target. @returns Dispatch result. */
  function chain(commands: readonly MsfeCommand[], target?: MsfeTarget): MsfeResult {
    const rejected = rejection(target);
    if (rejected) return rejected;
    const transaction = buildCommandTransaction(view.state, commands, target?.selection);
    if (!transaction) return { ok: false, reason: "not-applicable" };
    view.dispatch(transaction);
    return { ok: true };
  }

  const registry = createCommandRegistry(compiled.commands, { run: chain,
    can: (command, target) => !rejection(target) && buildCommandTransaction(view.state, [command], target?.selection) !== null }, () => editor);
  editor = {
    history: history.api,
    ...capabilities.api,
    get documentScope() { return capabilities.api.documentScope; },
    commands: registry.commands,
    /** @returns Last named command diagnostic, unaffected by queries. */
    get lastCommandResult() { return registry.lastResult; },
    storage: lifecycle.storage,
    /** @returns Mounted wrapper, with content ownership retained by CodeMirror. */
    get element() { if (!mounted) throw new Error("editor-not-mounted"); return view.dom; },
    /** @returns Immutable canonical state. */
    get state() { return view?.state ?? initialState; },
    /** @returns Host document identity. */
    get documentId() { return documentId; },
    /** @returns Monotonic instance revision. */
    get revision() { return editor.state.field(revisionField); },
    /** @returns Applied presentation mode. */
    get mode() { return presentation.mode; },
    /** @returns Snapshot of deterministic work counters. */
    get work() { return { ...counters, ...layers.work(editor.state) }; },
    /** @returns Explicitly serialized Markdown, retaining its original file format. */
    getMarkdown() { counters.sourceReads++; return writeMarkdown(editor.state.doc, source); },
    /** @returns A target scoped to this instance, document and revision. */
    captureTarget() { return { instanceId, documentId, revision: editor.revision, selection: editor.state.selection }; },
    /** @param command - Pure planner. @param target - Captured UI intent. @returns Mutation result. */
    run(command, target) { return chain([command], target); },
    chain: ((commands?: readonly MsfeCommand[] | MsfeTarget, target?: MsfeTarget) => Array.isArray(commands)
      ? chain(commands, target) : registry.chain(commands as MsfeTarget | undefined)) as MsfeEditor["chain"],
    /** @param command - Pure planner. @param target - Captured UI intent. @returns Applicability without publication. */
    can: ((command?: MsfeCommand, target?: MsfeTarget) => command
      ? !rejection(target) && buildCommandTransaction(view.state, [command], target?.selection) !== null
      : registry.can()) as MsfeEditor["can"],
    /** @param change - Versioned logical source changes. @returns Mutation result. */
    applyChanges(change) {
      const rejected = rejection();
      if (rejected) return rejected;
      return applyExternalChange(view, documentId, change);
    },
    /** @param markdown - Decoded replacement. @param nextId - Host identity. @returns Reset result. */
    replaceDocument(markdown, nextId) {
      if (runtime.lease) return { ok: false, reason: "source-provider-locked" };
      if (destroyed) return { ok: false, reason: "destroyed" };
      if (!mounted) return { ok: false, reason: "not-mounted" };
      if (view.state.field(compositionField)) return { ok: false, reason: "composing" };
      if (!nextId) return { ok: false, reason: "invalid-change" };
      let nextSource, nextState;
      try {
        nextSource = readMarkdownInput(markdown);
        nextState = createState(view.state.field(revisionField) + 1, nextSource.text);
      } catch { return { ok: false, reason: "invalid-change" }; }
      // Candidate state must validate before ending the previous document's tasks, anchors and history.
      source = nextSource;
      documentId = nextId;
      presentation.reset();
      nodeViews.reset();
      capabilities.reset();
      view.setState(nextState);
      capabilities.replaced();
      history.publish();
      return { ok: true };
    },
    /** @param mode - Requested presentation, deferred during composition. */
    setMode(mode) { if (mounted && !destroyed) presentation.setMode(view, mode); },
    /** @param readOnly - Host editing permission. */
    setReadOnly(readOnly) { if (mounted && !destroyed) presentation.setReadOnly(view, readOnly); },
    /** @param theme - Host color palette. */
    setTheme(theme) { if (mounted && !destroyed) presentation.setTheme(view, theme); },
    /** @param selection - Directed source ranges. */
    setSelection(selection) { if (mounted && !destroyed) view.dispatch({ selection }); },
    /** @param update - Source-neutral view intent. @returns Acceptance through the canonical transaction owner. */
    updateViewState(update) {
      if (destroyed) return { ok: false, reason: "destroyed" };
      if (!mounted) return { ok: false, reason: "not-mounted" };
      return applyViewStateUpdate(view, update);
    },
    /** @param position - Logical source target; supersedes pending presentation scrolling. */
    scrollTo(position) {
      if (!mounted || destroyed) return;
      presentation.cancelAnchor();
      view.dispatch({ effects: navigationEffect.of({ range: EditorSelection.cursor(position), y: "start", search: false }) });
    },
    /** Explicitly requests document focus. */
    focus() { if (mounted && !destroyed) focusSourceView(view); },
    /** @returns Whether an editable history event was undone. */
    undo() { return history.run("undo"); },
    /** @returns Whether an editable history event was redone. */
    redo() { return history.run("redo"); },
    /** @param listener - Incremental source observer. @returns Listener disposal callback. */
    onChange(listener) {
      if (!destroyed) listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    /** Idempotently disposes mounted resources and host subscriptions. */
    destroy() {
      if (destroyed) return;
      destroyed = true;
      history.destroy();
      runtime.destroy();
      capabilities.destroy();
      lifecycle.destroy();
      nodeViews.reset();
      presentation.destroy();
      listeners.clear();
      view?.destroy();
    },
  };
  registerAgentSurface(editor, { factories: compiled.commands, plan: registry.plan,
    capabilities: () => compiled.ordered.flatMap(feature => feature.aiCapabilities?.() ?? []) });
  ready(editor);
  lifecycle.beforeCreate(editor);
  if (destroyed) return editor;
  view = new EditorView({ parent: options.parent, state: initialState,
    dispatchTransactions(transactions, owner) {
      if (destroyed) return;
      try {
        // Validate before source mutation; queue acceptance before a synchronous transport can reply.
        for (const transaction of transactions) void transaction.state;
        for (const transaction of transactions) {
          if (!runtime.commit(transaction, () => {
            if (transaction.scrollIntoView) presentation.cancelAnchor();
            owner.update([transaction]); capabilities.map([transaction]); emit(editor, [transaction], true);
          })) break;
        }
        runtime.publish(() => { emit(editor, []); history.publish(); });
      } catch (error) { emit.clear(); throw error; }
    },
  });
  mounted = true;
  runtime.attach(view, () => history.publish());
  lifecycle.start(editor);
  history.publish();
  return editor;
}
