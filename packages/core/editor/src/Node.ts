import type {
  DOMOutputSpec,
  Node as PMNode,
  NodeSpec,
  TagParseRule
} from "@quirekit/pm";
import { Extendable, type QuireExtendableConfig } from "./Extendable";
import type {
  QuireLayoutProviderEntry,
  QuireLayoutProviderRegistration
} from "./layout-provider";
import type {
  QuireDocumentProfileEntry,
  QuireDocumentProfileRegistration
} from "./document-profile";
import type {
  QuireSelectionAdapterEntry,
  QuireSelectionAdapterRegistration,
  QuireSelectionContribution
} from "./selection-adapter";
import { createHTMLAttributes } from "./helpers/createHTMLAttributes";
import { getExtensionField } from "./helpers/getExtensionField";
import type {
  QuireAnyExtension,
  AnyCommands,
  QuireExtension,
  QuireExtensionBeforeCreateHook,
  QuireExtensionCreateHook,
  QuireExtensionBlurHook,
  QuireExtensionDispatchTransactionHook,
  QuireExtensionDestroyHook,
  QuireExtensionFocusHook,
  QuireExtensionKind,
  QuireExtensionUpdateHook,
  QuireExtensionViewEventHandlerMap,
  QuireInputRuleList,
  QuireKeyboardShortcutMap,
  QuireMarkdownConfigFields,
  QuireMarkdownOptions,
  NodeConfig,
  QuireNodeCanvasTextStyleMap,
  QuireNodeCanvasTextStyleResolver,
  QuireNodeConfig,
  QuireNodeSpecMap,
  QuireMarkSpecMap,
  QuirePasteRuleList,
  QuirePluginList,
  QuireSchemaAttributeContribution,
  QuireSchemaAttributeMap,
  QuireTextSerializer,
  QuireTransformPastedHTMLHook,
  QuireExtensionThisContext,
  MarkdownTokenizer
} from "./types";

/** Node config input accepted by Tiptap-compatible class factories. */
export type QuireNodeConfigInput<
  Options extends object = object,
  Storage extends object = object
> =
  | QuireNodeConfig<Options, Storage>
  | (() => QuireNodeConfig<Options, Storage>);

/** Tiptap-compatible class for node-owning QuireKit extensions. */
export class Node<
  Options extends object = object,
  Storage extends object = object
> extends Extendable<
  Options,
  Storage,
  QuireNodeConfig<Options, Storage>
> implements QuireExtension<Options, Storage> {
  /** Tiptap-compatible authoring family alias. */
  override type: QuireExtensionKind = "node";

  /**
   * Creates a resolved node extension instance.
   *
   * @param config - Node config to compile into a QuireKit extension.
   * @param configuredOptions - Option overrides applied after default options.
   */
  constructor(
    config: QuireNodeConfigInput<Options, Storage>
  ) {
    super(resolveNodeConfigInput(config));
  }

  /**
   * Returns the resolved extension family.
   *
   * @returns The node extension family.
   */
  get kind(): QuireExtensionKind {
    return "node";
  }

  /**
   * Returns the configured priority.
   *
   * @returns Extension priority, or undefined.
   */
  get priority(): number | undefined {
    return getNodeField<number>(this, "priority");
  }

  /**
   * Returns the configured keyboard-only priority.
   *
   * @returns Keyboard shortcut priority, or undefined.
   */
  get keyboardShortcutPriority(): number | undefined {
    return getNodeField<number>(this, "keyboardShortcutPriority");
  }

  /**
   * Returns the top node name when `topNode` is enabled.
   *
   * @returns This node name, or undefined.
   */
  get topNodeName(): string | undefined {
    const topNode = callNodeFactory<boolean>(
      this,
      "topNode",
      createNodeContext(this)
    );

    return topNode ? this.name : undefined;
  }

  /**
   * Returns commands contributed by `addCommands()`.
   *
   * @returns Command map, or undefined when empty.
   */
  get commands(): AnyCommands | undefined {
    const commands = callNodeFactory<AnyCommands>(
      this,
      "addCommands",
      createNodeContext(this)
    ) ?? {};

    return Object.keys(commands).length > 0 ? commands : undefined;
  }

  /**
   * Returns static keyboard shortcuts.
   *
   * Runtime shortcut factories are collected by the editor after it exists.
   *
   * @returns Static keyboard shortcut map, or undefined.
   */
  get keyboardShortcuts(): QuireKeyboardShortcutMap | undefined {
    return undefined;
  }

  /**
   * Returns input rules contributed by `addInputRules()`.
   *
   * @returns Input rules in extension-local order.
   */
  get inputRules(): QuireInputRuleList {
    return callNodeFactory<QuireInputRuleList>(
      this,
      "addInputRules",
      createNodeContext(this)
    ) ?? [];
  }

  /**
   * Returns paste rules contributed by `addPasteRules()`.
   *
   * @returns Paste rules in extension-local order.
   */
  get pasteRules(): QuirePasteRuleList {
    return callNodeFactory<QuirePasteRuleList>(
      this,
      "addPasteRules",
      createNodeContext(this)
    ) ?? [];
  }

  /**
   * Returns child extensions contributed by `addExtensions()`.
   *
   * @returns Child extensions in extension-local order.
   */
  get extensions(): readonly QuireAnyExtension[] {
    return callNodeFactory<readonly QuireAnyExtension[]>(
      this,
      "addExtensions",
      createNodeContext(this)
    ) ?? [];
  }

  /**
   * Returns this node's ProseMirror spec map.
   *
   * @returns Node spec map keyed by this node name.
   */
  get nodes(): QuireNodeSpecMap {
    return {
      [this.name]: createNodeSpec(
        this,
        createNodeContext(this)
      )
    };
  }

  /**
   * Returns mark specs contributed by node extensions.
   *
   * @returns Empty mark spec map.
   */
  get marks(): QuireMarkSpecMap {
    return {};
  }

  /**
   * Returns static ProseMirror plugins.
   *
   * Runtime plugin factories are collected by the editor after it exists.
   *
   * @returns Static plugin list.
   */
  get plugins(): QuirePluginList {
    return [];
  }

  /**
   * Returns the base canvas text style resolver contributed by this node config.
   *
   * @returns Style resolver map keyed by this node name, or undefined.
   */
  get canvasTextStyle(): QuireNodeCanvasTextStyleMap | undefined {
    const canvasTextStyle = getNodeField<QuireNodeCanvasTextStyleResolver>(
      this,
      "canvasTextStyle"
    );

    return canvasTextStyle ? { [this.name]: canvasTextStyle } : undefined;
  }

  /**
   * Returns layout-provider registrations contributed by this node extension.
   *
   * @returns Registrations annotated with this node extension name.
   */
  get layoutProviders(): readonly QuireLayoutProviderEntry[] {
    return (callNodeFactory<readonly QuireLayoutProviderRegistration[]>(
      this,
      "addLayoutProviders",
      createNodeContext(this)
    ) ?? []).map((registration) => ({
      ...registration,
      extensionName: this.name
    }));
  }

  /**
   * Returns document-profile registrations contributed by this node extension.
   *
   * @returns Registrations annotated with this node extension name.
   */
  get documentProfiles(): readonly QuireDocumentProfileEntry[] {
    return (callNodeFactory<readonly QuireDocumentProfileRegistration[]>(
      this,
      "addDocumentProfiles",
      createNodeContext(this)
    ) ?? []).map((registration) => ({
      ...registration,
      extensionName: this.name
    }));
  }

  /**
   * Returns structured-range selection adapters contributed by this node.
   *
   * @returns Adapter registrations annotated with this node extension name.
   */
  get selectionAdapters(): readonly QuireSelectionAdapterEntry[] {
    const context = createNodeContext(this);
    const contributions = callNodeFactory<
      readonly QuireSelectionContribution[]
    >(this, "addSelection", context) ?? [];
    const adapters = callNodeFactory<
      readonly QuireSelectionAdapterRegistration[]
    >(this, "addSelectionAdapters", context) ?? [];

    return [...contributions, ...adapters].map((registration) => ({
      ...registration,
      extensionName: this.name
    }));
  }

  /**
   * Returns qkView event handlers contributed by this node extension.
   *
   * @returns Event-handler map, or undefined when empty.
   */
  get viewEventHandlers(): QuireExtensionViewEventHandlerMap | undefined {
    const viewEventHandlers = {
      ...(getNodeField<QuireExtensionViewEventHandlerMap>(this, "viewEventHandlers") ?? {}),
      ...(callNodeFactory<QuireExtensionViewEventHandlerMap>(
        this,
        "addViewEventHandlers",
        createNodeContext(this)
      ) ?? {})
    };

    return Object.keys(viewEventHandlers).length > 0 ? viewEventHandlers : undefined;
  }

  /**
   * Returns the before-create lifecycle hook.
   *
   * @returns Lifecycle hook, or undefined.
   */
  get onBeforeCreate(): QuireExtensionBeforeCreateHook<Options, Storage> | undefined {
    return getRawNodeField(this, "onBeforeCreate");
  }

  /**
   * Returns the create lifecycle hook.
   *
   * @returns Lifecycle hook, or undefined.
   */
  get onCreate(): QuireExtensionCreateHook<Options, Storage> | undefined {
    return getRawNodeField(this, "onCreate");
  }

  /**
   * Returns the update lifecycle hook.
   *
   * @returns Lifecycle hook, or undefined.
   */
  get onUpdate(): QuireExtensionUpdateHook<Options, Storage> | undefined {
    return getRawNodeField(this, "onUpdate");
  }

  /**
   * Returns the destroy lifecycle hook.
   *
   * @returns Lifecycle hook, or undefined.
   */
  get onDestroy(): QuireExtensionDestroyHook<Options, Storage> | undefined {
    return getRawNodeField(this, "onDestroy");
  }

  /**
   * Returns the focus lifecycle hook.
   *
   * @returns Lifecycle hook, or undefined.
   */
  get onFocus(): QuireExtensionFocusHook<Options, Storage> | undefined {
    return getRawNodeField(this, "onFocus");
  }

  /**
   * Returns the blur lifecycle hook.
   *
   * @returns Lifecycle hook, or undefined.
   */
  get onBlur(): QuireExtensionBlurHook<Options, Storage> | undefined {
    return getRawNodeField(this, "onBlur");
  }

  /**
   * Returns the dispatch transaction hook.
   *
   * @returns Dispatch hook, or undefined.
   */
  get dispatchTransaction():
    | QuireExtensionDispatchTransactionHook<Options, Storage>
    | undefined {
    return getRawNodeField(this, "dispatchTransaction");
  }

  /**
   * Returns the pasted HTML transform hook.
   *
   * @returns Transform hook, or undefined.
   */
  get transformPastedHTML():
    | QuireTransformPastedHTMLHook<Options, Storage>
    | undefined {
    return getRawNodeField(this, "transformPastedHTML");
  }

  /**
   * Returns the Markdown token name contributed by this node extension.
   *
   * @returns Markdown token name, or undefined.
   */
  get markdownTokenName(): string | undefined {
    return getNodeField<string>(this, "markdownTokenName");
  }

  /**
   * Returns the Markdown parse handler contributed by this node extension.
   *
   * @returns Markdown parse handler, or undefined.
   */
  get parseMarkdown(): QuireMarkdownConfigFields["parseMarkdown"] | undefined {
    return getNodeField<QuireMarkdownConfigFields["parseMarkdown"]>(
      this,
      "parseMarkdown"
    );
  }

  /**
   * Returns the Markdown render handler contributed by this node extension.
   *
   * @returns Markdown render handler, or undefined.
   */
  get renderMarkdown(): QuireMarkdownConfigFields["renderMarkdown"] | undefined {
    return getNodeField<QuireMarkdownConfigFields["renderMarkdown"]>(
      this,
      "renderMarkdown"
    );
  }

  /**
   * Returns the custom Markdown tokenizer contributed by this node extension.
   *
   * @returns Markdown tokenizer, or undefined.
   */
  get markdownTokenizer(): MarkdownTokenizer | undefined {
    return getNodeField<MarkdownTokenizer>(this, "markdownTokenizer");
  }

  /**
   * Returns Markdown rendering options contributed by this node extension.
   *
   * @returns Markdown options, or undefined.
   */
  get markdownOptions(): QuireMarkdownOptions | undefined {
    return getNodeField<QuireMarkdownOptions>(this, "markdownOptions");
  }

  /**
   * Returns legacy lowered attribute contributions.
   *
   * @returns Empty attribute contribution list.
   */
  get attributes(): readonly QuireSchemaAttributeContribution[] {
    return [];
  }

  /**
   * Creates a Tiptap-compatible node class instance.
   *
   * @param config - Node config to compile into a QuireKit extension.
   * @returns Resolved node extension class instance.
   */
  static create<
    Options extends object = object,
    Storage extends object = object
  >(config: QuireNodeConfigInput<Options, Storage>): Node<Options, Storage>;
  static create<
    Options extends object = object,
    Storage extends object = object
  >(
    config: NodeConfig<Options, Storage> | (() => NodeConfig<Options, Storage>)
  ): Node<Options, Storage>;
  static create<
    Options extends object = object,
    Storage extends object = object
  >(
    config:
      | QuireNodeConfigInput<Options, Storage>
      | NodeConfig<Options, Storage>
      | (() => NodeConfig<Options, Storage>)
  ): Node<Options, Storage> {
    return new Node(config as QuireNodeConfigInput<Options, Storage>);
  }

  /**
   * Creates a new node extension instance with merged options.
   *
   * @param options - Option overrides to merge with the current extension
   * options.
   * @returns A new node extension instance with merged options.
   */
  override configure(options: Partial<Options> = {}): Node<Options, Storage> {
    return super.configure(options) as Node<Options, Storage>;
  }

  /**
   * Creates a child node extension with fields merged over the current config.
   *
   * @param config - Node config fields to merge on top of this node.
   * @returns A new node extension instance with merged config.
   */
  override extend<
    ExtendedOptions extends object = Options,
    ExtendedStorage extends object = Storage
  >(
    config?: Partial<QuireNodeConfig<ExtendedOptions, ExtendedStorage>>
  ): Node<ExtendedOptions, ExtendedStorage>;
  override extend<
    ExtendedOptions extends object = Options,
    ExtendedStorage extends object = Storage,
    ExtendedConfig extends QuireExtendableConfig<
      ExtendedOptions,
      ExtendedStorage
    > = QuireExtendableConfig<ExtendedOptions, ExtendedStorage>
  >(
    config: Partial<ExtendedConfig> = {}
  ): Node<ExtendedOptions, ExtendedStorage> {
    return super.extend<
      ExtendedOptions,
      ExtendedStorage,
      QuireNodeConfig<ExtendedOptions, ExtendedStorage>
    >(
      config as Partial<QuireNodeConfig<ExtendedOptions, ExtendedStorage>>
    ) as Node<ExtendedOptions, ExtendedStorage>;
  }
}

/**
 * Resolves a node config input into a concrete node config.
 *
 * @param input - Static node config or factory function.
 * @returns Concrete node config.
 */
function resolveNodeConfigInput<
  Options extends object = object,
  Storage extends object = object
>(
  input: QuireNodeConfigInput<Options, Storage>
): QuireNodeConfig<Options, Storage> {
  return typeof input === "function" ? input() : input;
}

/**
 * Creates the `this` context used by editor-independent node config fields.
 *
 * @param nodeExtension - Node extension receiving the config field call.
 * @returns Node extension factory context.
 */
function createNodeContext<
  Options extends object = object,
  Storage extends object = object
>(
  nodeExtension: Node<Options, Storage>
): QuireExtensionThisContext<Options, Storage> {
  return {
    name: nodeExtension.name,
    options: nodeExtension.options,
    storage: nodeExtension.storage,
    parent: undefined
  };
}

/**
 * Resolves and calls a Tiptap-compatible node config factory.
 *
 * @param nodeExtension - Node extension that owns the config.
 * @param field - Config field to resolve.
 * @param context - Context bound as `this`.
 * @returns Factory result, static field value, or undefined.
 */
function callNodeFactory<Result>(
  nodeExtension: Node<any, any>,
  field: keyof QuireNodeConfig<any, any>,
  context: QuireExtensionThisContext<any, any>
): Result | undefined {
  const fieldValue = getExtensionField<Result | ((context: QuireExtensionThisContext<any, any>) => Result)>(
    nodeExtension,
    field,
    context as unknown as Readonly<Record<string, unknown>>
  );

  if (typeof fieldValue === "function") {
    return (fieldValue as (context: QuireExtensionThisContext<any, any>) => Result)(
      context
    );
  }

  return fieldValue as Result | undefined;
}

/**
 * Resolves a config field through the Tiptap parent chain.
 *
 * @param nodeExtension - Node extension that owns the config.
 * @param field - Config field to resolve.
 * @returns Resolved field value, or undefined.
 */
function getNodeField<Result>(
  nodeExtension: Node<any, any>,
  field: keyof QuireNodeConfig<any, any>
): Result | undefined {
  return getExtensionField<Result>(nodeExtension, field, {
    name: nodeExtension.name,
    options: nodeExtension.options,
    storage: nodeExtension.storage,
    parent: undefined
  });
}

/**
 * Resolves a raw config field without binding function `this`.
 *
 * Runtime lifecycle hooks need the editor to bind `this` at call time, so they
 * cannot be resolved through `getExtensionField()`, which eagerly binds
 * functions to an editor-independent context.
 *
 * @param nodeExtension - Node extension that owns the config.
 * @param field - Config field to resolve.
 * @returns Raw field value, or undefined.
 */
function getRawNodeField<Result>(
  nodeExtension: Node<any, any>,
  field: keyof QuireNodeConfig<any, any>
): Result | undefined {
  const fieldValue = nodeExtension.config[field];

  if (fieldValue === undefined && nodeExtension.parent) {
    return getRawNodeField(
      nodeExtension.parent as Node<any, any>,
      field
    );
  }

  return fieldValue as Result | undefined;
}

/**
 * Creates a ProseMirror node spec from a node config.
 *
 * @param config - Node config that owns the schema fields.
 * @param context - Resolved extension context.
 * @returns ProseMirror node spec for the config.
 */
function createNodeSpec<
  Options extends object = object,
  Storage extends object = object
>(
  nodeExtension: Node<Options, Storage>,
  context: QuireExtensionThisContext<Options, Storage>
): NodeSpec {
  const spec: NodeSpec = {};

  assignDefined(spec, "content", resolveNodeConfigField<NodeSpec["content"]>(nodeExtension, "content", context));
  assignDefined(spec, "marks", resolveNodeConfigField<NodeSpec["marks"]>(nodeExtension, "marks", context));
  assignDefined(spec, "group", resolveNodeConfigField<NodeSpec["group"]>(nodeExtension, "group", context));
  assignDefined(spec, "inline", resolveNodeConfigField<NodeSpec["inline"]>(nodeExtension, "inline", context));
  assignDefined(spec, "atom", resolveNodeConfigField<NodeSpec["atom"]>(nodeExtension, "atom", context));
  assignDefined(
    spec,
    "selectable",
    resolveNodeConfigField<NodeSpec["selectable"]>(nodeExtension, "selectable", context)
  );
  assignDefined(
    spec,
    "draggable",
    resolveNodeConfigField<NodeSpec["draggable"]>(nodeExtension, "draggable", context)
  );
  assignDefined(spec, "code", resolveNodeConfigField<NodeSpec["code"]>(nodeExtension, "code", context));
  assignDefined(
    spec,
    "whitespace",
    resolveNodeConfigField<NodeSpec["whitespace"]>(nodeExtension, "whitespace", context)
  );
  assignDefined(
    spec,
    "linebreakReplacement",
    resolveNodeConfigField<NodeSpec["linebreakReplacement"]>(
      nodeExtension,
      "linebreakReplacement",
      context
    )
  );
  assignDefined(
    spec,
    "defining",
    resolveNodeConfigField<NodeSpec["defining"]>(nodeExtension, "defining", context)
  );
  assignDefined(
    spec,
    "definingAsContext",
    resolveNodeConfigField<NodeSpec["definingAsContext"]>(
      nodeExtension,
      "definingAsContext",
      context
    )
  );
  assignDefined(
    spec,
    "definingForContent",
    resolveNodeConfigField<NodeSpec["definingForContent"]>(
      nodeExtension,
      "definingForContent",
      context
    )
  );
  assignDefined(
    spec,
    "isolating",
    resolveNodeConfigField<NodeSpec["isolating"]>(nodeExtension, "isolating", context)
  );

  const attributes = callNodeConfigFactory<QuireSchemaAttributeMap>(
    nodeExtension,
    "addAttributes",
    context
  );
  if (attributes && Object.keys(attributes).length > 0) {
    spec.attrs = { ...attributes };
  }

  const parseDOM = callNodeConfigFactory<readonly TagParseRule[]>(
    nodeExtension,
    "parseHTML",
    context
  );
  if (parseDOM && parseDOM.length > 0) {
    spec.parseDOM = parseDOM;
  }

  const renderHTML = getNodeConfigField(nodeExtension, "renderHTML", context);
  if (renderHTML) {
    spec.toDOM = createNodeToDOM(nodeExtension, context);
  }

  const renderText = getNodeConfigField(nodeExtension, "renderText", context) as
    | OmitThisParameter<NonNullable<QuireNodeConfig<Options, Storage>["renderText"]>>
    | undefined;
  if (renderText) {
    (spec as NodeSpec & { toText?: QuireTextSerializer }).toText = renderText as QuireTextSerializer;
  }

  return spec;
}

/**
 * Creates a ProseMirror toDOM serializer for a node config.
 *
 * @param config - Node config that owns the renderHTML callback.
 * @param context - Resolved extension context.
 * @returns ProseMirror toDOM serializer for this node type.
 */
function createNodeToDOM<
  Options extends object = object,
  Storage extends object = object
>(
  nodeExtension: Node<Options, Storage>,
  context: QuireExtensionThisContext<Options, Storage>
): NonNullable<NodeSpec["toDOM"]> {
  const renderHTML = getNodeConfigField(nodeExtension, "renderHTML", context) as
    | OmitThisParameter<NonNullable<QuireNodeConfig<Options, Storage>["renderHTML"]>>
    | undefined;

  /**
   * Serializes a ProseMirror node to a DOM output spec.
   *
   * @param node - ProseMirror node being serialized.
   * @returns DOM output spec returned by the node config.
   */
  function toDOM(node: PMNode): DOMOutputSpec {
    const renderContext = {
      ...context,
      node,
      HTMLAttributes: createHTMLAttributes(node.attrs)
    };

    return renderHTML!(renderContext);
  }

  return toDOM;
}

/**
 * Assigns a schema field when its value is defined.
 *
 * @param target - Mutable schema spec object.
 * @param key - Schema field name to assign.
 * @param value - Field value to assign when defined.
 */
function assignDefined<Key extends keyof NodeSpec>(
  target: NodeSpec,
  key: Key,
  value: NodeSpec[Key] | undefined
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

/**
 * Resolves and calls a Tiptap-compatible node config factory through the parent
 * config chain.
 *
 * @param config - Node config that may define or inherit the factory.
 * @param field - Node config field to resolve.
 * @param context - Context exposed as the Tiptap-compatible `this` value.
 * @returns Factory result, or undefined when no factory exists.
 */
function callNodeConfigFactory<Result = unknown>(
  nodeExtension: Node<any, any>,
  field: keyof QuireNodeConfig,
  context: QuireExtensionThisContext<any, any>
): Result | undefined {
  const fieldValue = getNodeConfigField(nodeExtension, field, context);
  if (typeof fieldValue !== "function") {
    return fieldValue as Result | undefined;
  }

  return (fieldValue as (context: QuireExtensionThisContext<any, any>) => Result)(context);
}

/**
 * Resolves a node schema field value through the parent config chain.
 *
 * @param config - Node config that may define or inherit the field.
 * @param field - Node config field to resolve.
 * @param context - Resolved extension context.
 * @returns Resolved field value.
 */
function resolveNodeConfigField<Value>(
  nodeExtension: Node<any, any>,
  field: keyof QuireNodeConfig,
  context: QuireExtensionThisContext<any, any>
): Value | undefined {
  const fieldValue = getNodeConfigField(nodeExtension, field, context);
  if (typeof fieldValue === "function") {
    return (fieldValue as (context: QuireExtensionThisContext<any, any>) => Value)(context);
  }

  return fieldValue as Value | undefined;
}

/**
 * Resolves a node config field through an `extend()` parent chain.
 *
 * @param config - Node config to inspect.
 * @param field - Node config field to resolve.
 * @param context - Context used to bind function fields.
 * @returns Resolved field value or bound function.
 */
function getNodeConfigField<Context>(
  nodeExtension: Node<any, any>,
  field: keyof QuireNodeConfig,
  context: Context
): unknown {
  return getExtensionField(
    nodeExtension,
    field,
    context as unknown as Readonly<Record<string, unknown>>
  );
}
