import type { DefinitionLayer } from "./types";
import { EditorView, ViewPlugin, keymap } from "@quirekit/cm-view";
import { observeSourceInputFocus } from "../input/proxy/lifecycle";
import { Prec } from "@quirekit/cm-state";
import { field, hook } from "./fields";
import { cloneValue } from "./options";
import type { MsfeEditor } from "../editor/types";
import type { MsfeExtension } from "../extensions/types";
import type { AuthorCommandFactories } from "../commands/types";
import { compileSource, inlineSyntax } from "../source/authoring/compile";
import type { SourceSpec, Attributes } from "../source/authoring/types";
import type { MsfeNodeViewRenderer } from "../views/types";

/**
 * Compiles author hooks into the existing descriptor pipeline; it does not create another editor runtime.
 * @param layer - Immutable inheritance chain.
 * @param definition - Final identity and freshly resolved options.
 * @param editor - Late mounted editor access.
 * @returns Installation-local contributions and bound lifecycle hooks.
 */
export function bindDefinition(layer: DefinitionLayer, definition: { name: string; type: string; options: object }, editor: () => MsfeEditor): MsfeExtension {
  let storage: unknown;
  const context = { ...definition, get storage() { return storage; }, get editor() {
    const current = editor(); if (!current) throw new Error("editor-not-created"); return current;
  } };
  /** @param key - Hook name. @returns Hook bound to this installation and its parent implementation. */
  const method = (key: string) => hook(layer, key, context);
  storage = cloneValue(method("addStorage")?.() ?? {});
  const shortcuts = method("addKeyboardShortcuts")?.() as Record<string, () => boolean> | undefined;
  const focus = method("onFocus"), blur = method("onBlur");
  const extensions = [(method("addCodeMirrorExtensions")?.() ?? []) as NonNullable<MsfeExtension["extensions"]>,
    ...(shortcuts ? [Prec.high(keymap.of(Object.entries(shortcuts).map(([key, run]) => ({ key, run }))))] : []),
    ...(focus || blur ? [ViewPlugin.define(view => {
      const dispose = observeSourceInputFocus(view, focus ? event => focus(event as never) : undefined, blur ? event => blur(event as never) : undefined);
      return { destroy: dispose };
    }), EditorView.domEventHandlers({
      focus(event) { focus?.(event as never); }, blur(event) { blur?.(event as never); },
    })] : []),
  ] as MsfeExtension["extensions"];
  const includes = method("addExtensions")?.() as MsfeExtension["includes"];
  const backendSyntax = method("addMarkdownExtensions")?.() as MsfeExtension["syntax"];
  const projections = method("addProjections")?.() as MsfeExtension["projections"];
  const source = method("addSource")?.() as SourceSpec | undefined;
  const attributes = method("addAttributes")?.() as Attributes | undefined;
  const renderer = method("addNodeView");
  if ((renderer || attributes) && !source) throw new Error(`node-view-without-source: ${definition.name}`);
  const codec = source ? compileSource(source, attributes) : undefined;
  const render = renderer?.() as MsfeNodeViewRenderer | undefined ?? source?.renderer;
  const nodeView = source && codec && render ? { ...codec, placement: source.placement ?? "replace", renderer: render,
    ...(source.showWhenActive === undefined ? {} : { showWhenActive: source.showWhenActive }),
    ...(source.measureHeight === undefined ? {} : { measureHeight: source.measureHeight }),
    ...(source.load ? { load: source.load } : {}),
  } : undefined;
  const syntax = [backendSyntax ?? {}, ...(source?.syntax ? [inlineSyntax(source.syntax)] : [])];
  const priority = field(layer, "priority") as number | undefined;
  const requires = field(layer, "requires") as readonly string[] | undefined;
  const sourceProvider = method("addSourceProvider")?.() as MsfeExtension["sourceProvider"];
  const history = field(layer, "history") as MsfeExtension["history"];
  // Resolve hooks once. Unsubscribed extensions add no no-op observers to the input path.
  const before = method("onBeforeCreate"), create = method("onCreate"), update = method("onUpdate");
  const transaction = method("onTransaction"), selection = method("onSelectionUpdate"), destroy = method("onDestroy");
  const ai = method("addAiCapabilities");
  return {
    id: definition.name, createStorage: () => storage,
    ...(sourceProvider ? { sourceProvider } : {}), ...(history ? { history } : {}),
    states: (method("addState")?.() ?? []) as NonNullable<MsfeExtension["states"]>,
    layers: (method("addProjectionLayers")?.() ?? []) as NonNullable<MsfeExtension["layers"]>,
    ...(codec ? { source: { name: definition.name, kind: definition.type as "extension" | "node" | "mark", codec } } : {}),
    ...(priority === undefined ? {} : { priority }), ...(requires ? { requires } : {}),
    ...(includes ? { includes } : {}), ...(syntax ? { syntax } : {}), ...(projections ? { projections } : {}),
    ...(extensions ? { extensions } : {}), ...(nodeView ? { nodeView } : {}),
    authorCommands: (method("addCommands")?.() ?? {}) as AuthorCommandFactories,
    ...(ai ? { aiCapabilities: () => (ai() ?? []) as readonly unknown[] } : {}),
    editingBoundaries: (method("addEditingBoundaries")?.() ?? []) as NonNullable<MsfeExtension["editingBoundaries"]>,
    blockInput: (method("addBlockInput")?.() ?? []) as NonNullable<MsfeExtension["blockInput"]>,
    inputRules: (method("addInputRules")?.() ?? []) as NonNullable<MsfeExtension["inputRules"]>,
    pasteRules: (method("addPasteRules")?.() ?? []) as NonNullable<MsfeExtension["pasteRules"]>,
    ...(before ? { onBeforeCreate() { before(); } } : {}),
    ...(create ? { onCreate() { return create() as void | (() => void); } } : {}),
    ...(update ? { onChange(_context, event) { update(event as never); } } as Pick<MsfeExtension, "onChange"> : {}),
    ...(transaction ? { onTransaction(_context, event) { transaction(event as never); } } as Pick<MsfeExtension, "onTransaction"> : {}),
    ...(selection ? { onSelectionUpdate(_context, event) { selection(event as never); } } as Pick<MsfeExtension, "onSelectionUpdate"> : {}),
    ...(destroy ? { onDestroy() { destroy(); } } : {}),
  };
}
