import {
  DOMSerializer,
  DOMParser as PMDOMParser,
  EditorState as PMEditorState,
  Fragment,
  PluginKey,
  keymap,
  type Command as PMCommand,
  type Node as PMNode,
  type Plugin,
  type Schema,
  type Transaction
} from "@quirekit/pm";
import {
  MarkdownManager,
  type QuireMarkdownExtension,
  type QuireMarkdownJSONContent
} from "@quirekit/markdown";
import {
  DocxManager
} from "@quirekit/docx";
import { QuireCommandManager } from "./CommandManager";
import { EventEmitter } from "./EventEmitter";
import { QuireExtensionManager } from "./ExtensionManager";
import {
  collectQuireDocxContributionEntries,
  type QuireDocxMark
} from "./docx";
import { inputRulesPlugin } from "./InputRule";
import { NodePos } from "./NodePos";
import { pasteRulesPlugin } from "./PasteRule";
import {
  createCanonicalEditorOptions,
  createCoreExtensions
} from "./editor-options";
import {
  createMappablePosition,
  getUpdatedPosition,
  getAttributes as getStateAttributes,
  getText as getStateText,
  getTextSerializersFromSchema,
  isActive as isStateActive,
  isNodeEmpty
} from "./helpers";
import { getExtensionField } from "./helpers/getExtensionField";
import { sortExtensionsByKeyboardShortcutPriority } from "./helpers/sortExtensionsByKeyboardShortcutPriority";
import { createEmptyDoc } from "./schema";
import { createReadOnlySnapshotOptions } from "./snapshot/options";
import type { QuireEditorReadOnlySnapshotOptions } from "./snapshot/types";
import type {
  CanCommands,
  ChainedCommands,
  EditorOptions,
  SingleCommands,
  QuireEditorChangeModeOptions,
  QuireEditorContent,
  QuireEditorEvents,
  QuireEditorBlurEvent,
  QuireEditorFocusEvent,
  QuireGetTextOptions,
  QuireEditorProps,
  QuireJSONContent,
  QuireEditorMountOptions,
  QuireEditorOptions,
  QuireEditorState,
  QuireEditorUtils,
  QuireAnyExtension,
  QuireExtensionLifecycleContext,
  QuireExtensionRuntimeThisContext,
  QuireExtensionUpdateContext,
  QuireKeyboardShortcutEntry,
  QuireMountedEditorView,
  QuireMountedViewUpdateReason,
  QuirePluginList,
  QuireSetContentOptions,
  QuireViewAdapter,
  QuireViewMode
} from "./types";

/** DOM host element optionally linked to its owning editor instance. */
export interface TiptapEditorHTMLElement extends HTMLElement {
  /** Editor mounted into this host element. */
  editor?: QuireEditor | undefined;
}

/** Coordinates editor state, extensions, and command execution. */
export class QuireEditor {
  /** Stable identity for this editor instance. */
  readonly instanceId = Math.random().toString(36).slice(2, 9);

  /** Current canonical editor options, updated by setOptions(). */
  options: EditorOptions;

  /** Whether a primary editor surface is currently initialized. */
  isInitialized = false;

  /** Manager that owns extension ordering, storage, and diagnostics. */
  readonly extensionManager: QuireExtensionManager;

  /** Tiptap-compatible position utilities. */
  readonly utils: QuireEditorUtils = {
    getUpdatedPosition,
    createMappablePosition
  };

  /** Extensions installed into the editor in execution order. */
  readonly extensions: readonly QuireAnyExtension[];

  /** Whether transactions are currently captured instead of applied. */
  isCapturingTransaction = false;

  /** Whether the editor has received focus without a later blur event. */
  isFocused = false;

  /** Markdown parser and serializer associated with this editor. */
  readonly markdown: MarkdownManager;

  /** Instance-owned DOCX contribution and conversion manager. */
  readonly docx: DocxManager<
    QuireJSONContent,
    QuireDocxMark,
    QuireJSONContent
  >;

  private readonly eventEmitter = new EventEmitter<QuireEditorEvents>();

  private capturedTransaction: Transaction | null = null;

  private destroyed = false;

  private editableValue: boolean;

  private readonly viewAdapters: ReadonlyMap<QuireViewMode, QuireViewAdapter>;

  private readonly childViews = new Map<string, QuireEditorChildViewRecord>();

  private scheduledPrimaryViewUpdate: ReturnType<typeof setTimeout> | undefined;

  private editorPropsValue: QuireEditorProps;

  private readonly headlessView: QuireMountedEditorView;

  private primaryMountOptions: QuireEditorMountOptions | undefined;

  private mountedViewValue: QuireMountedEditorView | undefined;

  private stateValue: QuireEditorState;

  /**
   * Creates an editor with optional content, schema, and extensions.
   *
   * @param options - Editor creation options for content, schema, and
   * extensions.
   */
  constructor(options: QuireEditorOptions = {}) {
    this.options = createCanonicalEditorOptions(options);
    this.extensionManager = new QuireExtensionManager({
      extensions: [
        ...createCoreExtensions(options),
        ...(options.extensions ?? [])
      ],
      enableInputRules: options.enableInputRules,
      enablePasteRules: options.enablePasteRules,
      enableExtensionDispatchTransaction: options.enableExtensionDispatchTransaction,
      editor: this,
      schema: options.schema
    });
    this.extensions = this.extensionManager.extensions;
    this.viewAdapters = createViewAdapterMap(this.extensionManager.viewAdapters);
    this.docx = new DocxManager({
      ...options.docx,
      entries: collectQuireDocxContributionEntries(this.extensions, this)
    });
    this.markdown = new MarkdownManager({
      ...options.markdown,
      extensions: createMarkdownExtensions(this.extensions)
    });
    this.editableValue = options.editable ?? true;
    this.editorPropsValue = { ...(options.editorProps ?? {}) };
    this.headlessView = createHeadlessEditorView(this);
    this.registerOptionEventCallbacks(options);
    const schema =
      options.schema ??
      resolveContentSchema(options.content) ??
      this.extensionManager.schema;
    const strictContentCheck = options.enableContentCheck === true ||
      options.emitContentError === true;
    let contentError: Error | undefined;
    let doc: PMNode;

    try {
      doc = createDocumentFromContent(options.content, schema, {
        contentType: options.contentType,
        errorOnInvalidContent: strictContentCheck,
        ...(options.parseOptions === undefined
          ? {}
          : { parseOptions: options.parseOptions }),
        markdown: this.markdown
      }) ?? createEmptyDoc(schema);
    } catch (error) {
      contentError = error instanceof Error ? error : new Error(String(error));
      doc = createDocumentFromContent(options.content, schema, {
        contentType: options.contentType,
        errorOnInvalidContent: false,
        ...(options.parseOptions === undefined
          ? {}
          : { parseOptions: options.parseOptions }),
        markdown: this.markdown
      }) ?? createEmptyDoc(schema);
    }
    const pm = PMEditorState.create({
      doc,
      plugins: createEditorPluginList(this, this.extensionManager),
      schema
    });

    this.stateValue = createEditorStateSnapshot(
      pm,
      this.extensions,
      this.extensionManager.storage
    );
    if (contentError) {
      this.emit("contentError", {
        editor: this,
        error: contentError,
        disableCollaboration: () => undefined
      });

    }
    this.emit("beforeCreate", { editor: this });
    this.runBeforeCreateHooks();
    this.runCreateHooks();
    this.emit("create", { editor: this });

    const mountElement = resolveInitialMountElement(options.element);

    if (mountElement) {
      this.mount({
        element: mountElement,
        mode: options.mode ?? "html",
        ...(options.viewId === undefined ? {} : { id: options.viewId })
      });

      if (
        options.autofocus !== undefined &&
        options.autofocus !== false &&
        options.autofocus !== null
      ) {
        this.commands.focus(options.autofocus);
      }
    }
  }

  /**
   * Returns the current editor state.
   *
   * @returns The current public editor state snapshot.
   */
  get state(): QuireEditorState {
    return this.stateValue;
  }

  /**
   * Creates an independent read-only model/rendering snapshot without live plugins.
   * @param options - Same-schema document and fresh view adapters to mount separately.
   * @returns Caller-owned editor with isolated state, storage and lifecycle.
   */
  createReadOnlySnapshot(options: QuireEditorReadOnlySnapshotOptions = {}): QuireEditor {
    this.assertActive();
    return new QuireEditor(createReadOnlySnapshotOptions(this, options));
  }

  /**
   * Returns the currently mounted primary view, when the editor owns one.
   *
   * @returns Mounted primary editor view, or undefined for headless editors.
   */
  get mountedView(): QuireMountedEditorView | undefined {
    return this.mountedViewValue;
  }

  /**
   * Returns the active mounted view, or a headless view proxy before mounting.
   *
   * @returns Mounted view or headless view proxy.
   */
  get view(): QuireMountedEditorView {
    return this.mountedViewValue ?? this.headlessView;
  }

  /**
   * Returns direct ProseMirror-style editor props configured on this editor.
   *
   * @returns Current direct editor props.
   */
  get editorProps(): QuireEditorProps {
    return this.editorPropsValue;
  }

  /**
   * Returns the schema associated with the current state.
   *
   * @returns Current ProseMirror schema.
   */
  get schema(): Schema {
    return this.stateValue.schema;
  }

  /**
   * Returns extension storage keyed by extension name.
   *
   * @returns Current extension storage.
   */
  get storage(): Readonly<Record<string, unknown>> {
    return this.stateValue.storage;
  }

  /**
   * Reports whether this editor has been destroyed.
   *
   * @returns Whether the editor has already been destroyed.
   */
  get isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * Reports whether the editor currently accepts editing input.
   *
   * @returns Whether editing is enabled for mounted views.
   */
  get isEditable(): boolean {
    return this.editableValue;
  }

  /**
   * Reports whether the current document is empty.
   *
   * @returns Whether the document has no meaningful content.
   */
  get isEmpty(): boolean {
    return isNodeEmpty(this.stateValue.doc);
  }

  /**
   * Returns Tiptap-compatible single command helpers.
   *
   * @returns Command helpers keyed by command name.
   */
  get commands(): SingleCommands {
    return new QuireCommandManager({ editor: this }).commands;
  }

  /**
   * Creates a Tiptap-compatible command chain.
   *
   * @returns Chainable command helpers.
   */
  chain(): ChainedCommands {
    return new QuireCommandManager({ editor: this }).chain();
  }

  /**
   * Creates Tiptap-compatible command availability helpers.
   *
   * @returns Command availability helpers.
   */
  can(): CanCommands {
    return new QuireCommandManager({ editor: this }).can();
  }

  /**
   * Returns a NodePos wrapper for a document position.
   *
   * @param pos - Absolute document position.
   * @returns Node position wrapper.
   */
  $pos(pos: number): NodePos {
    return new NodePos(this.stateValue.doc.resolve(pos), this);
  }

  /**
   * Returns the document root as a NodePos wrapper.
   *
   * @returns Document root position wrapper.
   */
  get $doc(): NodePos {
    return this.$pos(0);
  }

  /**
   * Finds the first node matching a selector and attributes.
   *
   * @param selector - Node type name.
   * @param attributes - Optional attribute subset.
   * @returns Matching node position, or null.
   */
  $node(
    selector: string,
    attributes: Record<string, unknown> = {}
  ): NodePos | null {
    return this.$doc.querySelector(selector, attributes);
  }

  /**
   * Finds all nodes matching a selector and attributes.
   *
   * @param selector - Node type name.
   * @param attributes - Optional attribute subset.
   * @returns Matching node positions.
   */
  $nodes(
    selector: string,
    attributes: Record<string, unknown> = {}
  ): NodePos[] {
    return this.$doc.querySelectorAll(selector, attributes);
  }

  /**
   * Registers an editor event callback.
   *
   * @param event - Event name.
   * @param callback - Callback to register.
   * @returns This editor.
   */
  on<EventName extends keyof QuireEditorEvents>(
    event: EventName,
    callback: (
      ...args: [QuireEditorEvents[EventName]] extends [void]
        ? []
        : [payload: QuireEditorEvents[EventName]]
    ) => void
  ): this {
    this.eventEmitter.on(event, callback);

    return this;
  }

  /**
   * Registers an editor event callback that is removed after one call.
   *
   * @param event - Event name.
   * @param callback - Callback to register.
   * @returns This editor.
   */
  once<EventName extends keyof QuireEditorEvents>(
    event: EventName,
    callback: (
      ...args: [QuireEditorEvents[EventName]] extends [void]
        ? []
        : [payload: QuireEditorEvents[EventName]]
    ) => void
  ): this {
    this.eventEmitter.once(event, callback);

    return this;
  }

  /**
   * Removes an editor event callback.
   *
   * @param event - Event name.
   * @param callback - Optional callback to remove.
   * @returns This editor.
   */
  off<EventName extends keyof QuireEditorEvents>(
    event: EventName,
    callback?: (
      ...args: [QuireEditorEvents[EventName]] extends [void]
        ? []
        : [payload: QuireEditorEvents[EventName]]
    ) => void
  ): this {
    this.eventEmitter.off(event, callback);

    return this;
  }

  /**
   * Emits an editor event.
   *
   * @param event - Event name.
   * @param payload - Event payload.
   * @returns This editor.
   */
  emit<EventName extends keyof QuireEditorEvents>(
    event: EventName,
    ...args: [QuireEditorEvents[EventName]] extends [void]
      ? []
      : [payload: QuireEditorEvents[EventName]]
  ): this {
    this.eventEmitter.emit(event, ...args);

    return this;
  }

  /**
   * Resolves a ProseMirror-style view prop contributed by installed plugins.
   *
   * @param propName - View prop name to read.
   * @param f - Optional callback invoked for each defined prop value until it
   * returns a truthy result.
   * @returns Callback result, prop value, or undefined when no prop handles the
   * request.
   */
  someProp<PropName extends keyof QuireEditorProps, Result>(
    propName: PropName,
    f: (value: NonNullable<QuireEditorProps[PropName]>) => Result
  ): Result | undefined;
  /**
   * Resolves the first defined ProseMirror-style view prop contributed by
   * installed plugins.
   *
   * @param propName - View prop name to read.
   * @returns First truthy prop value, or undefined when none is available.
   */
  someProp<PropName extends keyof QuireEditorProps>(
    propName: PropName
  ): NonNullable<QuireEditorProps[PropName]> | undefined;
  someProp<PropName extends keyof QuireEditorProps, Result>(
    propName: PropName,
    f?: (value: NonNullable<QuireEditorProps[PropName]>) => Result
  ): Result | NonNullable<QuireEditorProps[PropName]> | undefined {
    this.assertActive();
    if (propName === "transformPastedHTML") {
      const transform = this.extensionManager.transformPastedHTML(
        this,
        this.editorPropsValue.transformPastedHTML as
          | ((html: string, view?: unknown) => string)
          | undefined
      ) as NonNullable<QuireEditorProps[PropName]> | undefined;

      if (transform) {
        const value = f ? f(transform) : transform;

        if (value) {
          return value as Result | NonNullable<QuireEditorProps[PropName]>;
        }
      }
    }

    const directProp = this.editorPropsValue[propName];

    if (directProp != null) {
      const value = f
        ? f(directProp as NonNullable<QuireEditorProps[PropName]>)
        : directProp;

      if (value) {
        return value as Result | NonNullable<QuireEditorProps[PropName]>;
      }
    }

    for (const plugin of this.stateValue.pm.plugins) {
      const prop = plugin.props[propName];

      if (prop == null) {
        continue;
      }

      const value = f ? f(prop as NonNullable<QuireEditorProps[PropName]>) : prop;

      if (value) {
        return value as Result | NonNullable<QuireEditorProps[PropName]>;
      }
    }

    if (propName === "editable") {
      const editableProp = (() => this.editableValue) as NonNullable<
        QuireEditorProps[PropName]
      >;
      const value = f ? f(editableProp) : editableProp;

      if (value) {
        return value as Result | NonNullable<QuireEditorProps[PropName]>;
      }
    }

    return undefined;
  }

  /**
   * Merges runtime editor options.
   *
   * @param options - Runtime options to merge into the editor.
   */
  setOptions(options: Partial<QuireEditorOptions> = {}): void {
    this.assertActive();
    this.options = createCanonicalEditorOptions(options, this.options);

    if (options.editorProps) {
      this.setEditorProps(options.editorProps);
    }

    if (typeof options.editable === "boolean") {
      this.editableValue = options.editable;
    }

    this.updateMountedViews("transaction");
  }

  /**
   * Updates whether the editor accepts editing input.
   *
   * @param editable - Whether editing should be enabled.
   * @param emitUpdate - Whether update listeners should be notified.
   */
  setEditable(editable: boolean, emitUpdate = true): void {
    this.assertActive();
    const previousState = this.stateValue;
    const transaction = this.stateValue.pm.tr;

    this.setOptions({ editable });

    if (emitUpdate) {
      this.runUpdateHooks(previousState, transaction);
      this.emit("update", {
        editor: this,
        previousState,
        transaction,
        appendedTransactions: []
      });
    }
  }

  /**
   * Merges direct ProseMirror-style view props.
   *
   * @param editorProps - Editor props to merge with existing direct props.
   */
  setEditorProps(editorProps: Partial<QuireEditorProps>): void {
    this.assertActive();
    this.editorPropsValue = {
      ...this.editorPropsValue,
      ...editorProps
    };
    this.updateMountedViews("transaction");
  }

  /**
   * Returns the document as Tiptap-compatible JSON.
   *
   * @returns JSON representation of the current document.
   */
  getJSON(): QuireJSONContent {
    return this.stateValue.doc.toJSON() as QuireJSONContent;
  }

  /**
   * Returns the document as HTML using the current schema DOM serializer.
   *
   * @returns HTML representation of the current document.
   */
  getHTML(): string {
    const document = globalThis.document;

    if (!document) {
      throw new Error("[quirekit error]: getHTML() requires a DOM document.");
    }

    const container = document.createElement("div");
    const fragment = DOMSerializer.fromSchema(this.schema).serializeFragment(
      this.stateValue.doc.content,
      { document }
    );
    container.appendChild(fragment);

    return container.innerHTML;
  }

  /**
   * Returns the document as plain text.
   *
   * @param options - Text serialization options.
   * @returns Plain text representation of the current document.
   */
  getText(options: QuireGetTextOptions = {}): string {
    return getStateText(this.stateValue.doc, {
      ...(options.blockSeparator === undefined ? {} : { blockSeparator: options.blockSeparator }),
      textSerializers: options.textSerializers ?? getTextSerializersFromSchema(this.schema)
    });
  }

  /**
   * Returns the document as Markdown through the editor markdown manager.
   *
   * @returns Markdown representation of the current document.
   */
  getMarkdown(): string {
    return this.markdown.serialize(this.getJSON() as QuireMarkdownJSONContent);
  }

  /**
   * Returns attributes for the active node or mark with the provided name.
   *
   * @param name - Schema node or mark name to inspect.
   * @returns Active attributes, or an empty object when inactive or unknown.
   */
  getAttributes(name: string): Record<string, unknown> {
    return getStateAttributes(this.stateValue.pm, name);
  }

  /**
   * Reports whether a node or mark with the provided name is active.
   *
   * @param name - Schema node or mark name to inspect.
   * @param attributes - Optional attribute subset that must match.
   * @returns Whether the node or mark is active at the current selection.
   */
  isActive(name: string, attributes: Record<string, unknown> = {}): boolean {
    return isStateActive(this.stateValue.pm, name, attributes);
  }

  /**
   * Registers a ProseMirror plugin at runtime.
   *
   * @param plugin - Plugin to add to the current editor state.
   * @param handlePlugins - Optional hook that controls plugin insertion order.
   * @returns Reconfigured ProseMirror editor state.
   */
  registerPlugin(
    plugin: Plugin,
    handlePlugins?: (newPlugin: Plugin, plugins: Plugin[]) => Plugin[]
  ): PMEditorState {
    this.assertActive();
    const plugins = handlePlugins
      ? handlePlugins(plugin, [...this.stateValue.pm.plugins])
      : [...this.stateValue.pm.plugins, plugin];
    const pm = this.stateValue.pm.reconfigure({ plugins });

    this.stateValue = createEditorStateSnapshot(
      pm,
      this.extensions,
      this.stateValue.storage
    );
    this.updateMountedViews("transaction");

    return pm;
  }

  /**
   * Unregisters ProseMirror plugins by name or plugin key.
   *
   * @param nameOrPluginKeyToRemove - Plugin name, plugin key, or a list of
   * names and keys to remove.
   * @returns Reconfigured ProseMirror editor state, or undefined when nothing
   * changed.
   */
  unregisterPlugin(
    nameOrPluginKeyToRemove: string | PluginKey | Array<string | PluginKey>
  ): PMEditorState | undefined {
    this.assertActive();
    const keysToRemove = ([] as Array<string | PluginKey>)
      .concat(nameOrPluginKeyToRemove)
      .map(getPluginKeyPrefix);
    const plugins = this.stateValue.pm.plugins.filter(
      (plugin) => !keysToRemove.some((key) => plugin.key.startsWith(key))
    );

    if (plugins.length === this.stateValue.pm.plugins.length) {
      return undefined;
    }

    const pm = this.stateValue.pm.reconfigure({ plugins });
    this.stateValue = createEditorStateSnapshot(
      pm,
      this.extensions,
      this.stateValue.storage
    );
    this.updateMountedViews("transaction");

    return pm;
  }

  /**
   * Mounts an editor view surface through a registered view adapter.
   *
   * The first mounted view becomes the primary editing surface. Later mounts are
   * additional surfaces over the same editor session: the focused surface updates
   * synchronously, while sibling surfaces refresh outside the input transaction.
   *
   * @param options - Element, mode, identity, and editability for the mounted view.
   * @returns Mounted editor view created by the selected adapter.
   */
  mount(options: QuireEditorMountOptions): QuireMountedEditorView;
  /**
   * Mounts a Tiptap-compatible HTML editor host.
   *
   * @param element - Element, mount wrapper, or callback that receives a host.
   * @returns Mounted HTML editor view.
   */
  mount(
    element: NonNullable<EditorOptions["element"]>
  ): QuireMountedEditorView;
  mount(
    optionsOrElement:
      | QuireEditorMountOptions
      | NonNullable<EditorOptions["element"]>
  ): QuireMountedEditorView {
    this.assertActive();
    const options = isEditorMountOptions(optionsOrElement)
      ? optionsOrElement
      : {
          element: resolveInitialMountElement(optionsOrElement)!,
          mode: "html" as const
        };

    if (!this.mountedViewValue) {
      return this.mountPrimaryView(options);
    }

    return this.mountAdditionalView(options);
  }

  /** Removes every mounted editor surface while preserving editor state. */
  unmount(): void {
    const hadPrimaryView = this.mountedViewValue !== undefined;

    this.destroyChildViews();
    this.clearScheduledPrimaryViewUpdate();
    this.mountedViewValue?.destroy();
    this.mountedViewValue = undefined;
    this.primaryMountOptions = undefined;
    this.isInitialized = false;

    if (hadPrimaryView) {
      this.emit("unmount", { editor: this });
    }
  }

  /**
   * Replaces the primary mounted view with another registered view mode.
   *
   * @param mode - View mode to mount into the existing primary element.
   * @param options - Optional identity and owner document overrides.
   * @returns Replacement primary mounted view.
   */
  changeMode(
    mode: QuireViewMode,
    options: QuireEditorChangeModeOptions = {}
  ): QuireMountedEditorView {
    this.assertActive();

    if (!this.primaryMountOptions) {
      throw new RangeError("Cannot change view mode before the editor is mounted.");
    }

    return this.replacePrimaryView({
      element: this.primaryMountOptions.element,
      mode,
      id: options.id ?? this.primaryMountOptions.id ?? `primary-${mode}`,
      ownerDocument: options.ownerDocument ?? this.primaryMountOptions.ownerDocument
    });
  }

  /**
   * Replaces the current primary mounted view with a new primary view.
   *
   * @param options - Element, mode, and identity for the replacement view.
   * @returns Mounted primary editor view.
   */
  private replacePrimaryView(options: QuireEditorMountOptions): QuireMountedEditorView {
    this.assertViewIdAvailable(options.id ?? `primary-${options.mode}`, {
      allowCurrentPrimary: true
    });
    this.clearScheduledPrimaryViewUpdate();
    this.mountedViewValue?.destroy();
    this.mountedViewValue = undefined;
    this.primaryMountOptions = undefined;
    this.isInitialized = false;
    this.emit("unmount", { editor: this });

    return this.mountPrimaryView(options);
  }

  /**
   * Mounts the first editor view surface as the primary view.
   *
   * @param options - Element, mode, and identity for the mounted view.
   * @returns Mounted primary editor view.
   */
  private mountPrimaryView(options: QuireEditorMountOptions): QuireMountedEditorView {
    const adapter = this.requireViewAdapter(options.mode);
    const id = options.id ?? `primary-${options.mode}`;

    this.primaryMountOptions = options;
    this.mountedViewValue = adapter.mount({
      editor: this,
      id,
      mode: options.mode,
      status: "primary",
      element: options.element,
      ownerDocument: options.ownerDocument ?? options.element.ownerDocument
    });
    this.isInitialized = true;
    this.emit("mount", { editor: this });

    return this.mountedViewValue;
  }

  /**
   * Mounts an additional editor view over the same editor session.
   *
   * @param options - Element, mode, identity, and editability for the mounted view.
   * @returns Mounted additional editor view.
   */
  private mountAdditionalView(options: QuireEditorMountOptions): QuireMountedEditorView {
    const adapter = this.requireViewAdapter(options.mode);
    const editable = options.editable ?? false;
    const id = options.id ?? `view-${this.childViews.size + 1}-${options.mode}`;

    this.assertViewIdAvailable(id);

    const view = adapter.mount({
      editor: this,
      id,
      mode: options.mode,
      status: editable ? "sync" : "lock",
      element: options.element,
      ownerDocument: options.ownerDocument ?? options.element.ownerDocument
    });
    const refreshMode: QuireEditorChildViewRefreshMode = editable
      ? "focused-sync"
      : "deferred";
    const originalDestroy = view.destroy.bind(view);
    let viewDestroyed = false;

    view.destroy = () => {
      if (viewDestroyed) {
        return;
      }

      viewDestroyed = true;
      const record = this.childViews.get(id);

      if (record?.view === view) {
        this.clearScheduledChildViewUpdate(record);
        this.childViews.delete(id);
      }

      originalDestroy();
    };
    this.childViews.set(id, { view, refreshMode });

    return view;
  }

  /**
   * Resolves a registered view adapter or throws a mode-specific error.
   *
   * @param mode - View mode whose adapter should be resolved.
   * @returns Registered view adapter.
   */
  private requireViewAdapter(mode: QuireViewMode): QuireViewAdapter {
    const adapter = this.viewAdapters.get(mode);

    if (!adapter) {
      throw new RangeError(`No QuireKit view adapter registered for mode: ${mode}`);
    }

    return adapter;
  }

  /**
   * Ensures a mounted view id cannot shadow an existing view.
   *
   * @param id - Candidate mounted view identity.
   * @param options - Conflict rules for the candidate view identity.
   */
  private assertViewIdAvailable(
    id: string,
    options: { readonly allowCurrentPrimary?: boolean } = {}
  ): void {
    const conflictsWithPrimary =
      options.allowCurrentPrimary !== true && this.mountedViewValue?.id === id;

    if (conflictsWithPrimary || this.childViews.has(id)) {
      throw new RangeError(`A QuireKit editor view is already mounted with id: ${id}`);
    }
  }

  /**
   * Replaces the complete document through the canonical command surface.
   *
   * @deprecated Use `editor.commands.replaceDocument()`.
   * @param content - ProseMirror document or JSON document that becomes the
   * current editor content.
   * @param options - Parsing and update-event options.
   */
  setContent(content: QuireEditorContent, options: QuireSetContentOptions = {}): void {
    this.assertActive();
    const accepted = this.commands.replaceDocument(content, options);

    if (!accepted) {
      throw new RangeError("Editor content must be a ProseMirror node or JSON document.");
    }
  }

  /**
   * Applies a ProseMirror transaction to the editor state.
   *
   * @param transaction - Transaction to apply to the current editor state.
   */
  dispatchTransaction(transaction: Transaction): void {
    this.assertActive();

    if (this.isCapturingTransaction) {
      this.captureDispatchedTransaction(transaction);

      return;
    }

    this.extensionManager.dispatchTransaction(this, (nextTransaction) => {
      this.applyTransaction(nextTransaction);
    })(transaction);
  }

  /**
   * Captures transactions dispatched by a callback instead of applying them.
   *
   * @param callback - Callback that may dispatch transactions.
   * @returns Captured transaction, or null when nothing was dispatched.
   */
  captureTransaction(callback: () => void): Transaction | null {
    this.assertActive();
    this.isCapturingTransaction = true;

    try {
      callback();
      return this.capturedTransaction;
    } finally {
      this.isCapturingTransaction = false;
      // Failed detached commands must not leak their steps into the next capture.
      this.capturedTransaction = null;
    }
  }

  /** Destroys the editor and runs extension cleanup hooks once. */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.emit("destroy");
    this.unmount();
    this.runDestroyHooks();
    this.extensionManager.decorationManager?.destroy();
    this.docx.destroy();
    this.eventEmitter.removeAllListeners();
  }

  /**
   * Applies a ProseMirror transaction and refreshes the public state snapshot.
   *
   * @param transaction - Transaction to apply to the current ProseMirror state.
   */
  private applyTransaction(transaction: Transaction): void {
    const previousState = this.stateValue;
    const applied = this.stateValue.pm.applyTransaction(transaction);
    const rootTransactionWasApplied = applied.transactions.includes(transaction);
    const appendedTransactions = applied.transactions.slice(1);

    this.emit("beforeTransaction", {
      editor: this,
      transaction,
      nextState: applied.state
    });

    if (!rootTransactionWasApplied) {
      return;
    }

    this.stateValue = createEditorStateSnapshot(
      applied.state,
      this.extensions,
      this.stateValue.storage
    );
    this.emit("transaction", {
      editor: this,
      transaction,
      appendedTransactions
    });
    if (!previousState.pm.selection.eq(this.stateValue.pm.selection)) {
      this.emit("selectionUpdate", {
        editor: this,
        previousState,
        transaction,
        appendedTransactions
      });
    }
    this.emitFocusOrBlurFromTransactions(applied.transactions);
    if (
      !transaction.getMeta("preventUpdate") &&
      applied.transactions.some((appliedTransaction) => appliedTransaction.docChanged) &&
      !previousState.doc.eq(this.stateValue.doc)
    ) {
      this.runUpdateHooks(previousState, transaction, appendedTransactions);
      this.emit("update", {
        editor: this,
        previousState,
        transaction,
        appendedTransactions
      });
    }
    const updateReason = transaction.getMeta("quireViewUpdateReason") === "document-replace"
      ? "document-replace"
      : "transaction";

    this.updateMountedViews(updateReason, applied.transactions);
  }

  /**
   * Adds a dispatched transaction to the current capture buffer.
   *
   * @param transaction - Transaction dispatched while capture mode is active.
   */
  private captureDispatchedTransaction(transaction: Transaction): void {
    if (!this.capturedTransaction) {
      this.capturedTransaction = transaction;

      return;
    }

    for (const step of transaction.steps) {
      this.capturedTransaction.step(step);
    }
  }

  /**
   * Renders mounted views after an editor state change.
   *
   * @param reason - Why mounted views should refresh.
   * @param transactions - Applied transactions that contributed to the refresh.
   */
  private updateMountedViews(
    reason: QuireMountedViewUpdateReason,
    transactions?: readonly Transaction[]
  ): void {
    const focusedChildView = this.findFocusedChildView();

    if (this.mountedViewValue) {
      if (focusedChildView) {
        this.schedulePrimaryViewUpdate(reason, transactions);
      } else {
        this.clearScheduledPrimaryViewUpdate();
        this.mountedViewValue.update({
          editor: this,
          reason,
          ...(transactions === undefined ? {} : { transactions })
        });
      }
    }

    for (const childView of this.childViews.values()) {
      if (!this.shouldUpdateChildViewSynchronously(childView)) {
        this.scheduleChildViewUpdate(childView, reason, transactions);
        continue;
      }

      this.clearScheduledChildViewUpdate(childView);
      childView.view.update({
        editor: this,
        reason,
        ...(transactions === undefined ? {} : { transactions })
      });
    }
  }

  /** Destroys all child mounted views owned by this root editor. */
  private destroyChildViews(): void {
    for (const childView of this.childViews.values()) {
      this.clearScheduledChildViewUpdate(childView);
      childView.view.destroy();
    }

    this.childViews.clear();
  }

  /**
   * Finds the additional mounted view that currently owns focus.
   *
   * @returns Focused child view record, or undefined when focus is elsewhere.
   */
  private findFocusedChildView(): QuireEditorChildViewRecord | undefined {
    return Array.from(this.childViews.values()).find((childView) =>
      childView.view.hasFocus()
    );
  }

  /**
   * Reports whether a child view should refresh inside the active transaction.
   *
   * @param childView - Child view record being considered.
   * @returns Whether the child should update synchronously.
   */
  private shouldUpdateChildViewSynchronously(
    childView: QuireEditorChildViewRecord
  ): boolean {
    return childView.refreshMode === "focused-sync" && childView.view.hasFocus();
  }

  /**
   * Schedules the primary view refresh outside the active transaction.
   *
   * @param reason - Why the primary view should refresh.
   * @param transactions - Applied transactions that contributed to the refresh.
   */
  private schedulePrimaryViewUpdate(
    reason: QuireMountedViewUpdateReason,
    transactions?: readonly Transaction[]
  ): void {
    this.clearScheduledPrimaryViewUpdate();
    const view = this.mountedViewValue;

    if (!view) {
      return;
    }

    this.scheduledPrimaryViewUpdate = setTimeout(() => {
      this.scheduledPrimaryViewUpdate = undefined;

      if (this.destroyed || view.isDestroyed || this.mountedViewValue !== view) {
        return;
      }

      view.update({
        editor: this,
        reason,
        ...(transactions === undefined ? {} : { transactions })
      });
    }, 120);
  }

  /** Cancels pending deferred refresh work for the primary view. */
  private clearScheduledPrimaryViewUpdate(): void {
    if (this.scheduledPrimaryViewUpdate === undefined) {
      return;
    }

    clearTimeout(this.scheduledPrimaryViewUpdate);
    this.scheduledPrimaryViewUpdate = undefined;
  }

  /**
   * Schedules a child view refresh outside the active transaction.
   *
   * @param childView - Child view record to refresh.
   * @param reason - Why the child view should refresh.
   * @param transactions - Applied transactions that contributed to the refresh.
   */
  private scheduleChildViewUpdate(
    childView: QuireEditorChildViewRecord,
    reason: QuireMountedViewUpdateReason,
    transactions?: readonly Transaction[]
  ): void {
    this.clearScheduledChildViewUpdate(childView);
    childView.scheduledUpdate = setTimeout(() => {
      childView.scheduledUpdate = undefined;

      if (this.destroyed || childView.view.isDestroyed) {
        return;
      }

      childView.view.update({
        editor: this,
        reason,
        ...(transactions === undefined ? {} : { transactions })
      });
    }, 120);
  }

  /**
   * Cancels pending deferred refresh work for a child view.
   *
   * @param childView - Child view record whose pending update should be cleared.
   */
  private clearScheduledChildViewUpdate(
    childView: QuireEditorChildViewRecord
  ): void {
    if (childView.scheduledUpdate === undefined) {
      return;
    }

    clearTimeout(childView.scheduledUpdate);
    childView.scheduledUpdate = undefined;
  }

  /**
   * Registers Tiptap-compatible option callbacks as event listeners.
   *
   * @param options - Editor creation options.
   */
  private registerOptionEventCallbacks(options: QuireEditorOptions): void {
    this.on("mount", (payload) => this.options.onMount(payload));
    this.on("unmount", (payload) => this.options.onUnmount(payload));
    this.on("beforeCreate", (payload) => this.options.onBeforeCreate(payload));
    this.on("create", (payload) => this.options.onCreate(payload));
    this.on("contentError", (payload) => this.options.onContentError(payload));
    if (options.onBeforeTransaction) {
      this.on("beforeTransaction", options.onBeforeTransaction);
    }
    if (options.onClipboardPasteResult) {
      this.on("clipboardPasteResult", options.onClipboardPasteResult);
    }
    this.on("transaction", (payload) => this.options.onTransaction(payload));
    this.on("selectionUpdate", (payload) => this.options.onSelectionUpdate(payload));
    this.on("focus", (payload) => this.options.onFocus(payload));
    this.on("blur", (payload) => this.options.onBlur(payload));
    this.on("paste", ({ event, slice }) => this.options.onPaste(event, slice));
    this.on("drop", ({ event, slice, moved }) =>
      this.options.onDrop(event, slice, moved)
    );
    this.on("delete", (payload) => this.options.onDelete(payload));
    this.on("update", (payload) => this.options.onUpdate(payload));
    this.on("destroy", () => this.options.onDestroy());
  }

  /** Throws when callers try to use an editor after destruction. */
  private assertActive(): void {
    if (this.destroyed) {
      throw new RangeError("Cannot use a destroyed QuireKit editor.");
    }
  }

  /** Runs before-create lifecycle hooks for installed extensions. */
  private runBeforeCreateHooks(): void {
    for (const extension of this.extensions) {
      extension.onBeforeCreate?.call(
        this.createRuntimeHookContext(extension),
        this.createLifecycleContext(extension)
      );
    }
  }

  /** Runs create lifecycle hooks for installed extensions. */
  private runCreateHooks(): void {
    for (const extension of this.extensions) {
      extension.onCreate?.call(
        this.createRuntimeHookContext(extension),
        this.createLifecycleContext(extension)
      );
    }
  }

  /**
   * Runs update lifecycle hooks for installed extensions.
   *
   * @param previousState - Editor state before the update was applied.
   */
  private runUpdateHooks(
    previousState: QuireEditorState,
    transaction?: Transaction,
    appendedTransactions: readonly Transaction[] = []
  ): void {
    for (const extension of this.extensions) {
      extension.onUpdate?.call(
        this.createRuntimeHookContext(extension),
        this.createUpdateContext(
          extension,
          previousState,
          transaction,
          appendedTransactions
        )
      );
    }
  }

  /** Runs destroy lifecycle hooks for installed extensions. */
  private runDestroyHooks(): void {
    for (const extension of this.extensions) {
      extension.onDestroy?.call(
        this.createRuntimeHookContext(extension),
        this.createLifecycleContext(extension)
      );
    }
  }

  /**
   * Emits the latest focus or blur event carried by applied transactions.
   *
   * @param transactions - Transactions returned by ProseMirror application.
   */
  private emitFocusOrBlurFromTransactions(transactions: readonly Transaction[]): void {
    for (let index = transactions.length - 1; index >= 0; index -= 1) {
      const transaction = transactions[index]!;
      const focus = transaction.getMeta("focus") as
        | { readonly event?: FocusEvent | undefined }
        | undefined;
      const blur = transaction.getMeta("blur") as
        | { readonly event?: FocusEvent | undefined }
        | undefined;

      if (focus) {
        this.isFocused = true;
        if (focus.event) {
          const event: QuireEditorFocusEvent = {
            editor: this,
            transaction,
            event: focus.event
          };
          this.emit("focus", event);
          this.runFocusHooks(event);
        }
        return;
      }

      if (blur) {
        this.isFocused = false;
        if (blur.event) {
          const event: QuireEditorBlurEvent = {
            editor: this,
            transaction,
            event: blur.event
          };
          this.emit("blur", event);
          this.runBlurHooks(event);
        }
        return;
      }
    }
  }

  /**
   * Runs Tiptap-compatible focus hooks with a bound runtime `this` context.
   *
   * @param event - Focus event payload.
   */
  private runFocusHooks(event: QuireEditorFocusEvent): void {
    for (const extension of this.extensions) {
      extension.onFocus?.call(this.createRuntimeHookContext(extension), event);
    }
  }

  /**
   * Runs Tiptap-compatible blur hooks with a bound runtime `this` context.
   *
   * @param event - Blur event payload.
   */
  private runBlurHooks(event: QuireEditorBlurEvent): void {
    for (const extension of this.extensions) {
      extension.onBlur?.call(this.createRuntimeHookContext(extension), event);
    }
  }

  /**
   * Creates the common lifecycle hook context for an extension.
   *
   * @param extension - Extension receiving the lifecycle hook.
   * @returns Lifecycle context with the current editor state.
   */
  private createLifecycleContext(
    extension: QuireAnyExtension
  ): QuireExtensionLifecycleContext {
    return {
      editor: this,
      extension,
      state: this.state
    };
  }

  /**
   * Creates the Tiptap-compatible `this` object for runtime extension hooks.
   *
   * @param extension - Extension receiving the runtime hook.
   * @returns Runtime hook context bound as `this`.
   */
  private createRuntimeHookContext(
    extension: QuireAnyExtension
  ): QuireExtensionRuntimeThisContext<Record<string, unknown>, Record<string, unknown>> {
    return {
      name: extension.name,
      options: extension.options as Readonly<Record<string, unknown>>,
      storage: extension.storage as Record<string, unknown>,
      editor: this,
      parent: undefined
    };
  }

  /**
   * Creates the update lifecycle hook context for an extension.
   *
   * @param extension - Extension receiving the lifecycle hook.
   * @param previousState - Editor state before the update was applied.
   * @returns Update lifecycle context with previous and current editor state.
  */
  private createUpdateContext(
    extension: QuireAnyExtension,
    previousState: QuireEditorState,
    transaction: Transaction | undefined,
    appendedTransactions: readonly Transaction[]
  ): QuireExtensionUpdateContext {
    return {
      ...this.createLifecycleContext(extension),
      previousState,
      ...(transaction === undefined ? {} : { transaction }),
      appendedTransactions
    };
  }
}

/**
 * Creates a QuireKit editor instance.
 *
 * @param options - Editor creation options for content, schema, and extensions.
 * @returns A new QuireKit editor instance.
 */
export function createEditor(options: QuireEditorOptions = {}): QuireEditor {
  return new QuireEditor(options);
}

export { QuireEditor as Editor };

/**
 * Projects resolved core extensions into the renderer-neutral Markdown contract.
 *
 * @param extensions - Resolved editor extensions.
 * @returns Markdown extension descriptors with undefined fields omitted.
 */
function createMarkdownExtensions(
  extensions: readonly QuireAnyExtension[]
): readonly QuireMarkdownExtension[] {
  return extensions.flatMap((extension) => {
    const base: QuireMarkdownExtension = {
      name: extension.name,
      ...(extension.markdownTokenName === undefined ? {} : {
        markdownTokenName: extension.markdownTokenName
      }),
      ...(extension.parseMarkdown === undefined ? {} : {
        parseMarkdown: extension.parseMarkdown
      }),
      ...(extension.renderMarkdown === undefined ? {} : {
        renderMarkdown: extension.renderMarkdown
      }),
      ...(extension.markdownTokenizer === undefined ? {} : {
        markdownTokenizer: extension.markdownTokenizer
      }),
      ...(extension.markdownOptions === undefined ? {} : {
        markdownOptions: extension.markdownOptions
      })
    };
    const transforms = Object.entries(
      extension.markdownSerializationTransforms ?? {}
    ).map(([nodeName, transformMarkdown]) => ({
      name: `${extension.name}:markdown:${nodeName}`,
      markdownNodeName: nodeName,
      transformMarkdown
    }));

    return [base, ...transforms];
  });
}

/** Internal content parsing options enriched with editor-owned services. */
type QuireContentParseOptions = QuireSetContentOptions & {
  /** Markdown manager used for string content declared as Markdown. */
  readonly markdown?: MarkdownManager | undefined;
};

/** Internal refresh policy for additional mounted editor views. */
type QuireEditorChildViewRefreshMode = "focused-sync" | "deferred";

/** Internal record for an additional mounted view and its refresh policy. */
interface QuireEditorChildViewRecord {
  /** Additional mounted view owned by the editor session. */
  readonly view: QuireMountedEditorView;
  /** Whether this additional view can refresh synchronously while focused. */
  readonly refreshMode: QuireEditorChildViewRefreshMode;
  /** Pending deferred update timer for non-focused additional views. */
  scheduledUpdate?: ReturnType<typeof setTimeout> | undefined;
}

/**
 * Creates a headless view proxy for unmounted editor instances.
 *
 * @param editor - Editor that owns the headless view.
 * @returns Mounted-view-compatible headless proxy.
 */
function createHeadlessEditorView(editor: QuireEditor): QuireMountedEditorView {
  function someProp<PropName extends keyof QuireEditorProps, Result>(
    propName: PropName,
    f: (value: NonNullable<QuireEditorProps[PropName]>) => Result
  ): Result | undefined;
  function someProp<PropName extends keyof QuireEditorProps>(
    propName: PropName
  ): NonNullable<QuireEditorProps[PropName]> | undefined;
  function someProp<PropName extends keyof QuireEditorProps, Result>(
    propName: PropName,
    f?: (value: NonNullable<QuireEditorProps[PropName]>) => Result
  ): Result | NonNullable<QuireEditorProps[PropName]> | undefined {
    return f ? editor.someProp(propName, f) : editor.someProp(propName);
  }

  const headlessTarget = {
    id: "headless",
    mode: "html" as QuireViewMode,
    status: "primary" as const,
    get state() {
      return editor.state.pm;
    },
    get props(): QuireMountedEditorView["props"] {
      return {
        ...editor.editorProps,
        state: editor.state.pm
      };
    },
    get dom(): HTMLElement {
      throw new Error(
        "[quirekit error]: The editor view is not mounted, so view.dom is unavailable."
      );
    },
    get editable(): boolean {
      return editor.isEditable;
    },
    get hiddenTextViewMode() {
      return "normal" as const;
    },
    get root(): Document | ShadowRoot {
      throw new Error(
        "[quirekit error]: The editor view is not mounted, so view.root is unavailable."
      );
    },
    get elements(): QuireMountedEditorView["elements"] {
      throw new Error(
        "[quirekit error]: The editor view is not mounted, so view.elements is unavailable."
      );
    },
    dispatch(transaction: Transaction): void {
      editor.dispatchTransaction(transaction);
    },
    focus(): void {},
    hasFocus(): boolean {
      return false;
    },
    getWidgets: () => [],
    getWidgetById: () => undefined,
    getWidgetsByRole: () => [],
    getWidgetsByPart: () => [],
    getWidgetsByPosition: () => [],
    getWidgetsByRange: () => [],
    widgetAtPoint: () => null,
    someProp,
    setProps(props: Partial<QuireEditorProps>): void {
      editor.setEditorProps(props);
    },
    updateRoot(): void {},
    updateState(state: PMEditorState): void {
      if (state !== editor.state.pm) {
        throw new RangeError(
          "Headless view updateState() cannot replace QuireKit shared editor state. Dispatch a transaction through view.dispatch() instead."
        );
      }
    },
    setHiddenTextViewMode(): void {},
    refreshFontMetrics(): void {},
    dispatchEvent(event: Event): boolean {
      return (
        someProp("handleDOMEvents", (handlers) => {
          const handler = handlers[event.type];

          return handler === undefined
            ? false
            : handler(headlessTarget as QuireMountedEditorView, event) === true ||
                event.defaultPrevented;
        }) === true
      );
    },
    pasteHTML(): boolean {
      return false;
    },
    pasteText(): boolean {
      return false;
    },
    scrollRangeIntoView(): boolean {
      return false;
    },
    scrollToSelection(): boolean {
      return (
        someProp("handleScrollToSelection", (handler) =>
          typeof handler === "function" &&
          (handler as (view: QuireMountedEditorView) => boolean | void)(
            headlessTarget as unknown as QuireMountedEditorView
          ) === true
        ) === true
      );
    },
    serializeForClipboard(): never {
      throw new Error(
        "[quirekit error]: The editor view is not mounted, so view.serializeForClipboard() is unavailable."
      );
    },
    posAtCoords(): { readonly pos: number; readonly inside: number } | null {
      return null;
    },
    coordsAtPos(): { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number } {
      return {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      };
    },
    getObjectAnchor() {
      return {
        status: "unsupported" as const,
        kind: "object" as const,
        reason: "snapshot-version-unavailable" as const
      };
    },
    getTableChrome(): null {
      return null;
    },
    getInteractionTargetSnapshot(): null {
      return null;
    },
    endOfTextblock(): boolean {
      return false;
    },
    get isDestroyed() {
      return editor.isDestroyed;
    },
    update(): void {},
    destroy(): void {}
  };

  return new Proxy(headlessTarget as unknown as QuireMountedEditorView, {
    get(target, property, receiver) {
      if (editor.mountedView) {
        return Reflect.get(editor.mountedView, property, receiver);
      }

      if (property in target) {
        return Reflect.get(target, property, receiver);
      }

      return Reflect.get(target, property, receiver);
    }
  });
}

/**
 * Creates a lookup table for editor view adapters.
 *
 * @param adapters - View adapters supplied by the caller or extensions.
 * @returns Map keyed by view mode.
 */
function createViewAdapterMap(
  adapters: readonly QuireViewAdapter[]
): ReadonlyMap<QuireViewMode, QuireViewAdapter> {
  const entries = adapters.map((adapter) => [adapter.mode, adapter] as const);

  return new Map(entries);
}

/**
 * Creates the ProseMirror plugin list owned by an editor instance.
 *
 * @param editor - Editor whose commands should receive shortcut dispatches.
 * @param extensionManager - Extension manager that contributes plugins and
 * shortcut entries.
 * @returns ProseMirror plugins installed into the editor state.
 */
function createEditorPluginList(
  editor: QuireEditor,
  extensionManager: QuireExtensionManager
): QuirePluginList {
  const runtimeExtensionPlugins = createRuntimeExtensionPlugins(editor, extensionManager);
  const keyboardShortcuts = createRuntimeKeyboardShortcutEntries(editor, extensionManager);
  const shortcutPlugin = createKeyboardShortcutPlugin(
    editor,
    keyboardShortcuts
  );
  const inputRulePlugins = extensionManager.inputRules.length > 0
    ? [inputRulesPlugin({ editor, rules: extensionManager.inputRules })]
    : [];
  const pasteRulePlugins = pasteRulesPlugin({
    editor,
    rules: extensionManager.pasteRules
  });
  const plugins = [
    ...(shortcutPlugin ? [shortcutPlugin] : []),
    ...inputRulePlugins,
    ...pasteRulePlugins,
    ...(extensionManager.decorationManager?.plugin
      ? [extensionManager.decorationManager.plugin]
      : []),
    ...runtimeExtensionPlugins,
    ...extensionManager.plugins
  ];

  return plugins;
}

/**
 * Collects static and editor-bound Tiptap keyboard shortcuts.
 *
 * @param editor - Editor exposed as `this.editor` to shortcut factories.
 * @param extensionManager - Extension manager that owns resolved extensions.
 * @returns Keyboard shortcut entries in keyboard execution priority order.
 */
function createRuntimeKeyboardShortcutEntries(
  editor: QuireEditor,
  extensionManager: QuireExtensionManager
): readonly QuireKeyboardShortcutEntry[] {
  const entries: QuireKeyboardShortcutEntry[] = [];

  const extensions = sortExtensionsByKeyboardShortcutPriority(
    extensionManager.extensions
  );

  for (const extension of extensions) {
    for (const [shortcut, command] of Object.entries(extension.keyboardShortcuts ?? {})) {
      entries.push({ extension, shortcut, command });
    }

    const context: QuireRuntimeExtensionPluginContext = {
      name: extension.name,
      options: extension.options,
      storage: extension.storage,
      editor,
      extensions: extensionManager.extensions,
      parent: undefined
    };
    const addKeyboardShortcuts = getExtensionField<
      (() => Record<string, QuireKeyboardShortcutEntry["command"]>) |
      Record<string, QuireKeyboardShortcutEntry["command"]>
    >(extension, "addKeyboardShortcuts", context);
    const shortcuts = typeof addKeyboardShortcuts === "function"
      ? addKeyboardShortcuts()
      : addKeyboardShortcuts;

    for (const [shortcut, command] of Object.entries(shortcuts ?? {})) {
      entries.push({ extension, shortcut, command });
    }
  }

  return entries;
}

/**
 * Creates ProseMirror plugins from Tiptap-compatible editor-bound factories.
 *
 * @param editor - Editor exposed as `this.editor` to extension factories.
 * @param extensionManager - Extension manager that owns resolved extensions.
 * @returns Runtime plugin list contributed by `addProseMirrorPlugins()`.
 */
function createRuntimeExtensionPlugins(
  editor: QuireEditor,
  extensionManager: QuireExtensionManager
): QuirePluginList {
  const plugins: QuirePluginList[number][] = [];

  for (const extension of extensionManager.extensions) {
    const context: QuireRuntimeExtensionPluginContext = {
      name: extension.name,
      options: extension.options,
      storage: extension.storage,
      editor,
      extensions: extensionManager.extensions,
      parent: undefined
    };
    const addProseMirrorPlugins = getExtensionField<
      (() => QuirePluginList) | QuirePluginList
    >(extension, "addProseMirrorPlugins", context);
    const extensionPlugins = typeof addProseMirrorPlugins === "function"
      ? addProseMirrorPlugins()
      : addProseMirrorPlugins;

    if (extensionPlugins) {
      plugins.push(...extensionPlugins);
    }
  }

  return plugins;
}

/** Runtime `this` object used by editor-bound ProseMirror plugin factories. */
interface QuireRuntimeExtensionPluginContext {
  /** Extra extension fields used by parent-aware lookups. */
  readonly [key: string]: unknown;
  /** Name of the extension receiving the factory call. */
  readonly name: string;
  /** Resolved extension options. */
  readonly options: Readonly<Record<string, unknown>>;
  /** Resolved extension storage. */
  readonly storage: Record<string, unknown>;
  /** Editor instance exposed as `this.editor`. */
  readonly editor: QuireEditor;
  /** Full resolved extension list exposed as `this.extensions`. */
  readonly extensions: readonly QuireAnyExtension[];
  /** Parent factory field for `extend()` chains. */
  readonly parent: undefined;
}

/**
 * Creates a ProseMirror keymap plugin for Tiptap-compatible shortcuts.
 *
 * @param editor - Editor whose commands should receive shortcut dispatches.
 * @param entries - Extension shortcut entries in execution order.
 * @returns ProseMirror keymap plugin, or undefined when no shortcuts exist.
 */
function createKeyboardShortcutPlugin(
  editor: QuireEditor,
  entries: readonly QuireKeyboardShortcutEntry[]
): QuirePluginList[number] | undefined {
  const bindings = createKeyboardShortcutBindings(editor, entries);

  return Object.keys(bindings).length > 0 ? keymap(bindings) : undefined;
}

/**
 * Groups extension shortcut entries into ProseMirror keymap bindings.
 *
 * @param editor - Editor whose commands should receive shortcut dispatches.
 * @param entries - Extension shortcut entries in execution order.
 * @returns ProseMirror keymap bindings keyed by shortcut name.
 */
function createKeyboardShortcutBindings(
  editor: QuireEditor,
  entries: readonly QuireKeyboardShortcutEntry[]
): Record<string, PMCommand> {
  const groupedEntries = new Map<string, QuireKeyboardShortcutEntry[]>();

  for (const entry of entries) {
    const shortcutEntries = groupedEntries.get(entry.shortcut) ?? [];
    shortcutEntries.push(entry);
    groupedEntries.set(entry.shortcut, shortcutEntries);
  }

  const bindings: Record<string, PMCommand> = {};

  for (const [shortcut, shortcutEntries] of groupedEntries) {
    bindings[shortcut] = (state, dispatch) =>
      runKeyboardShortcutEntries(editor, shortcutEntries, state, dispatch);
  }

  return bindings;
}

/**
 * Resolves the key prefix used by ProseMirror plugins for dynamic removal.
 *
 * @param nameOrPluginKey - Plugin name or plugin key.
 * @returns Plugin key prefix used by ProseMirror.
 */
function getPluginKeyPrefix(nameOrPluginKey: string | PluginKey): string {
  return typeof nameOrPluginKey === "string"
    ? `${nameOrPluginKey}$`
    : nameOrPluginKey.key;
}

/**
 * Runs shortcut handlers for one shortcut until one handles the event.
 *
 * @param editor - Editor whose commands should receive shortcut dispatches.
 * @param entries - Shortcut handlers ordered by extension priority.
 * @param state - ProseMirror state supplied by the active keymap plugin.
 * @param dispatch - Optional ProseMirror dispatch callback from the active view.
 * @returns Whether any shortcut handler consumed the event.
 */
function runKeyboardShortcutEntries(
  editor: QuireEditor,
  entries: readonly QuireKeyboardShortcutEntry[],
  state: PMEditorState,
  dispatch: Parameters<PMCommand>[1]
): boolean {
  for (const entry of entries) {
    const commandManager = new QuireCommandManager({ editor, state });
    const transaction = state.tr;
    const handled = entry.command(
      commandManager.buildProps(transaction, dispatch !== undefined)
    );

    // Bound editor.commands may have already committed the shortcut. The props
    // transaction belongs to the old state in that case and must not be replayed.
    // Consume the native key so beforeinput cannot perform the same edit again.
    if (editor.state.pm !== state) {
      if (handled || !editor.state.pm.doc.eq(state.doc)) return true;
      // Declined bound commands can still dispatch a no-op transaction. Refresh
      // the candidate state and continue, so ordinary Enter reaches splitBlock.
      state = editor.state.pm;
      continue;
    }
    if (handled) {
      if (dispatch && !transaction.getMeta("preventDispatch")) {
        dispatch(transaction);
      }
      return true;
    }
  }

  return false;
}

/**
 * Checks whether a mount argument uses QuireKit's explicit view-mode form.
 *
 * @param value - Mount argument to inspect.
 * @returns Whether the argument is a QuireKit mount options object.
 */
function isEditorMountOptions(
  value: QuireEditorMountOptions | NonNullable<EditorOptions["element"]>
): value is QuireEditorMountOptions {
  return typeof value === "object" && "element" in value && "mode" in value;
}

/**
 * Resolves the Tiptap-compatible editor element option to a concrete host.
 *
 * @param element - Element, mount wrapper, callback, null, or undefined option.
 * @returns Concrete HTML host element, or undefined for a headless editor.
 */
function resolveInitialMountElement(
  element: QuireEditorOptions["element"]
): HTMLElement | undefined {
  if (element == null) {
    return undefined;
  }

  if (typeof element === "function") {
    const document = globalThis.document;

    if (!document) {
      throw new Error(
        "[quirekit error]: A callback editor element requires a DOM document."
      );
    }

    const host = document.createElement("div");
    element(host);

    return host;
  }

  if ("mount" in element) {
    return element.mount;
  }

  return element as HTMLElement;
}

/**
 * Resolves a schema from ProseMirror node content.
 *
 * @param content - Optional editor content.
 * @returns Schema when content is already a ProseMirror node.
 */
function resolveContentSchema(content: QuireEditorContent | undefined): Schema | undefined {
  return content && isProseMirrorNode(content) ? content.type.schema : undefined;
}

/**
 * Resolves accepted editor content into a ProseMirror document node.
 *
 * @param content - Optional editor content.
 * @param schema - Schema used to deserialize JSON content.
 * @returns ProseMirror document node or undefined when content is omitted.
 */
function createDocumentFromContent(
  content: QuireEditorContent | undefined,
  schema: Schema,
  options: QuireContentParseOptions = {}
): PMNode | undefined {
  if (content === undefined || content === null) {
    return undefined;
  }

  if (isProseMirrorNode(content)) {
    return content;
  }

  const nodeOrFragment = createNodeFromContent(content, schema, options);

  if (isProseMirrorNode(nodeOrFragment)) {
    return nodeOrFragment;
  }

  return schema.topNodeType.create(null, nodeOrFragment);
}

/**
 * Creates a ProseMirror node or fragment from Tiptap-compatible content.
 *
 * @param content - HTML, JSON, JSON array, or null editor content.
 * @param schema - Schema used to parse the content.
 * @param options - Parsing behavior for invalid content.
 * @returns ProseMirror node or fragment parsed from the content.
 */
function createNodeFromContent(
  content: Exclude<QuireEditorContent, PMNode>,
  schema: Schema,
  options: QuireContentParseOptions
): PMNode | Fragment {
  if (Array.isArray(content)) {
    return Fragment.fromArray(content.map((item) => schema.nodeFromJSON(item)));
  }

  if (typeof content === "object" && content !== null) {
    try {
      const node = schema.nodeFromJSON(content);

      if (options.errorOnInvalidContent) {
        node.check();
      }

      return node;
    } catch (error) {
      if (options.errorOnInvalidContent) {
        throw new Error("[quirekit error]: Invalid JSON content.", {
          cause: error as Error
        });
      }

      console.warn("[quirekit warn]: Invalid content.", "Passed value:", content, "Error:", error);

      return createEmptyDoc(schema);
    }
  }

  if (typeof content === "string") {
    return createNodeFromStringContent(content, schema, options);
  }

  return createEmptyDoc(schema);
}

/**
 * Parses string content using Tiptap-compatible HTML semantics.
 *
 * @param content - HTML string content.
 * @param schema - Schema used to parse the content.
 * @param options - Parsing behavior for invalid content.
 * @returns ProseMirror node parsed from the string content.
 */
function createNodeFromStringContent(
  content: string,
  schema: Schema,
  options: QuireContentParseOptions
): PMNode {
  if (content.trim().length === 0) {
    return createEmptyDoc(schema);
  }

  if (options.contentType === "markdown") {
    return createNodeFromJSONContent(
      (options.markdown ?? new MarkdownManager()).parse(content) as unknown as QuireJSONContent,
      schema,
      options
    );
  }

  const document = globalThis.document;

  if (!document) {
    if (options.errorOnInvalidContent) {
      throw new Error("[quirekit error]: HTML content requires a DOM document.");
    }

    return createEmptyDoc(schema);
  }

  const template = document.createElement("template");
  template.innerHTML = content.trim();

  return PMDOMParser.fromSchema(schema).parse(template.content, options.parseOptions);
}

/**
 * Creates a ProseMirror node from JSON content with shared error semantics.
 *
 * @param content - JSON document or node content.
 * @param schema - Schema used to create the ProseMirror node.
 * @param options - Parsing behavior for invalid content.
 * @returns Parsed ProseMirror node.
 */
function createNodeFromJSONContent(
  content: QuireJSONContent,
  schema: Schema,
  options: QuireContentParseOptions
): PMNode {
  try {
    const node = schema.nodeFromJSON(content);

    if (options.errorOnInvalidContent) {
      node.check();
    }

    return node;
  } catch (error) {
    if (options.errorOnInvalidContent) {
      throw new Error("[quirekit error]: Invalid JSON content.", {
        cause: error as Error
      });
    }

    console.warn("[quirekit warn]: Invalid content.", "Passed value:", content, "Error:", error);

    return createEmptyDoc(schema);
  }
}

/**
 * Checks whether a value is a ProseMirror node without relying on class identity.
 *
 * @param value - Value to inspect.
 * @returns Whether the value looks like a ProseMirror node.
 */
function isProseMirrorNode(value: unknown): value is PMNode {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof value.type === "object" &&
    value.type !== null &&
    "schema" in value.type
  );
}

/**
 * Creates the public editor state snapshot from a ProseMirror editor state.
 *
 * @param pm - ProseMirror editor state to expose through the core state
 * snapshot.
 * @param extensions - Extensions installed into the editor in execution order.
 * @param storage - Storage objects keyed by extension name.
 * @returns The public editor state snapshot consumed by commands and callers.
 */
function createEditorStateSnapshot(
  pm: PMEditorState,
  extensions: readonly QuireAnyExtension[],
  storage: Readonly<Record<string, unknown>>
): QuireEditorState {
  return {
    pm,
    doc: pm.doc,
    schema: pm.schema,
    extensions,
    storage
  };
}
