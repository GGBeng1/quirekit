import type {
  DOMOutputSpec,
  Mark as PMMark,
  MarkSpec,
  ParseRule
} from "@quirekit/pm";
import { Extendable, type QuireExtendableConfig } from "./Extendable";
import { createHTMLAttributes } from "./helpers/createHTMLAttributes";
import { getExtensionField } from "./helpers/getExtensionField";
import type {
  QuireAnyExtension,
  AnyCommands,
  QuireExtension,
  QuireExtensionBeforeCreateHook,
  QuireExtensionBlurHook,
  QuireExtensionCreateHook,
  QuireExtensionDestroyHook,
  QuireExtensionDispatchTransactionHook,
  QuireExtensionFocusHook,
  QuireExtensionKind,
  QuireExtensionThisContext,
  QuireExtensionUpdateHook,
  QuireExtensionViewEventHandlerMap,
  QuireInputRuleList,
  QuireKeyboardShortcutMap,
  MarkConfig,
  QuireMarkCanvasStyleMap,
  QuireMarkCanvasStyleResolver,
  QuireMarkConfig,
  QuireMarkSpecMap,
  QuireMarkdownConfigFields,
  QuireMarkdownOptions,
  QuireNodeSpecMap,
  QuirePasteRuleList,
  QuirePluginList,
  QuireSchemaAttributeContribution,
  QuireSchemaAttributeMap,
  QuireTransformPastedHTMLHook,
  MarkdownTokenizer
} from "./types";

/** Mark config input accepted by Tiptap-compatible class factories. */
export type QuireMarkConfigInput<
  Options extends object = object,
  Storage extends object = object
> =
  | QuireMarkConfig<Options, Storage>
  | (() => QuireMarkConfig<Options, Storage>);

/** Tiptap-compatible class for mark-owning QuireKit extensions. */
export class Mark<
  Options extends object = object,
  Storage extends object = object
> extends Extendable<
  Options,
  Storage,
  QuireMarkConfig<Options, Storage>
> implements QuireExtension<Options, Storage> {
  /** Tiptap-compatible authoring family alias. */
  override type: QuireExtensionKind = "mark";

  /**
   * Creates a resolved mark extension instance.
   *
   * @param config - Mark config to compile into a QuireKit extension.
   */
  constructor(config: QuireMarkConfigInput<Options, Storage>) {
    super(resolveMarkConfigInput(config));
  }

  /**
   * Returns the resolved extension family.
   *
   * @returns The mark extension family.
   */
  get kind(): QuireExtensionKind {
    return "mark";
  }

  /**
   * Returns the configured priority.
   *
   * @returns Extension priority, or undefined.
   */
  get priority(): number | undefined {
    return getMarkField<number>(this, "priority");
  }

  /**
   * Returns the configured keyboard-only priority.
   *
   * @returns Keyboard shortcut priority, or undefined.
   */
  get keyboardShortcutPriority(): number | undefined {
    return getMarkField<number>(this, "keyboardShortcutPriority");
  }

  /**
   * Returns the optional schema top node name.
   *
   * @returns Always undefined for mark extensions.
   */
  get topNodeName(): string | undefined {
    return undefined;
  }

  /**
   * Returns commands contributed by `addCommands()`.
   *
   * @returns Command map, or undefined when empty.
   */
  get commands(): AnyCommands | undefined {
    const commands = callMarkFactory<AnyCommands>(
      this,
      "addCommands",
      createMarkContext(this)
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
    return callMarkFactory<QuireInputRuleList>(
      this,
      "addInputRules",
      createMarkContext(this)
    ) ?? [];
  }

  /**
   * Returns paste rules contributed by `addPasteRules()`.
   *
   * @returns Paste rules in extension-local order.
   */
  get pasteRules(): QuirePasteRuleList {
    return callMarkFactory<QuirePasteRuleList>(
      this,
      "addPasteRules",
      createMarkContext(this)
    ) ?? [];
  }

  /**
   * Returns child extensions contributed by `addExtensions()`.
   *
   * @returns Child extensions in extension-local order.
   */
  get extensions(): readonly QuireAnyExtension[] {
    return callMarkFactory<readonly QuireAnyExtension[]>(
      this,
      "addExtensions",
      createMarkContext(this)
    ) ?? [];
  }

  /**
   * Returns node specs contributed by mark extensions.
   *
   * @returns Empty node spec map.
   */
  get nodes(): QuireNodeSpecMap {
    return {};
  }

  /**
   * Returns this mark's ProseMirror spec map.
   *
   * @returns Mark spec map keyed by this mark name.
   */
  get marks(): QuireMarkSpecMap {
    return {
      [this.name]: createMarkSpec(this, createMarkContext(this))
    };
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
   * Returns the canvas text style resolver contributed by this mark config.
   *
   * @returns Style resolver map keyed by this mark name, or undefined.
   */
  get canvasStyle(): QuireMarkCanvasStyleMap | undefined {
    const canvasStyle = getMarkField<QuireMarkCanvasStyleResolver>(this, "canvasStyle");

    return canvasStyle ? { [this.name]: canvasStyle } : undefined;
  }

  /**
   * Returns qkView event handlers contributed by this mark extension.
   *
   * @returns Event-handler map, or undefined when empty.
   */
  get viewEventHandlers(): QuireExtensionViewEventHandlerMap | undefined {
    const viewEventHandlers = {
      ...(getMarkField<QuireExtensionViewEventHandlerMap>(this, "viewEventHandlers") ?? {}),
      ...(callMarkFactory<QuireExtensionViewEventHandlerMap>(
        this,
        "addViewEventHandlers",
        createMarkContext(this)
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
    return getRawMarkField(this, "onBeforeCreate");
  }

  /**
   * Returns the create lifecycle hook.
   *
   * @returns Lifecycle hook, or undefined.
   */
  get onCreate(): QuireExtensionCreateHook<Options, Storage> | undefined {
    return getRawMarkField(this, "onCreate");
  }

  /**
   * Returns the update lifecycle hook.
   *
   * @returns Lifecycle hook, or undefined.
   */
  get onUpdate(): QuireExtensionUpdateHook<Options, Storage> | undefined {
    return getRawMarkField(this, "onUpdate");
  }

  /**
   * Returns the destroy lifecycle hook.
   *
   * @returns Lifecycle hook, or undefined.
   */
  get onDestroy(): QuireExtensionDestroyHook<Options, Storage> | undefined {
    return getRawMarkField(this, "onDestroy");
  }

  /**
   * Returns the focus lifecycle hook.
   *
   * @returns Lifecycle hook, or undefined.
   */
  get onFocus(): QuireExtensionFocusHook<Options, Storage> | undefined {
    return getRawMarkField(this, "onFocus");
  }

  /**
   * Returns the blur lifecycle hook.
   *
   * @returns Lifecycle hook, or undefined.
   */
  get onBlur(): QuireExtensionBlurHook<Options, Storage> | undefined {
    return getRawMarkField(this, "onBlur");
  }

  /**
   * Returns the dispatch transaction hook.
   *
   * @returns Dispatch hook, or undefined.
   */
  get dispatchTransaction():
    | QuireExtensionDispatchTransactionHook<Options, Storage>
    | undefined {
    return getRawMarkField(this, "dispatchTransaction");
  }

  /**
   * Returns the pasted HTML transform hook.
   *
   * @returns Transform hook, or undefined.
   */
  get transformPastedHTML():
    | QuireTransformPastedHTMLHook<Options, Storage>
    | undefined {
    return getRawMarkField(this, "transformPastedHTML");
  }

  /**
   * Returns the Markdown token name contributed by this mark extension.
   *
   * @returns Markdown token name, or undefined.
   */
  get markdownTokenName(): string | undefined {
    return getMarkField<string>(this, "markdownTokenName");
  }

  /**
   * Returns the Markdown parse handler contributed by this mark extension.
   *
   * @returns Markdown parse handler, or undefined.
   */
  get parseMarkdown(): QuireMarkdownConfigFields["parseMarkdown"] | undefined {
    return getMarkField<QuireMarkdownConfigFields["parseMarkdown"]>(
      this,
      "parseMarkdown"
    );
  }

  /**
   * Returns the Markdown render handler contributed by this mark extension.
   *
   * @returns Markdown render handler, or undefined.
   */
  get renderMarkdown(): QuireMarkdownConfigFields["renderMarkdown"] | undefined {
    return getMarkField<QuireMarkdownConfigFields["renderMarkdown"]>(
      this,
      "renderMarkdown"
    );
  }

  /**
   * Returns the custom Markdown tokenizer contributed by this mark extension.
   *
   * @returns Markdown tokenizer, or undefined.
   */
  get markdownTokenizer(): MarkdownTokenizer | undefined {
    return getMarkField<MarkdownTokenizer>(this, "markdownTokenizer");
  }

  /**
   * Returns Markdown rendering options contributed by this mark extension.
   *
   * @returns Markdown options, or undefined.
   */
  get markdownOptions(): QuireMarkdownOptions | undefined {
    return getMarkField<QuireMarkdownOptions>(this, "markdownOptions");
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
   * Creates a Tiptap-compatible mark class instance.
   *
   * @param config - Mark config to compile into a QuireKit extension.
   * @returns Resolved mark extension class instance.
   */
  static create<
    Options extends object = object,
    Storage extends object = object
  >(config: QuireMarkConfigInput<Options, Storage>): Mark<Options, Storage>;
  static create<
    Options extends object = object,
    Storage extends object = object
  >(
    config: MarkConfig<Options, Storage> | (() => MarkConfig<Options, Storage>)
  ): Mark<Options, Storage>;
  static create<
    Options extends object = object,
    Storage extends object = object
  >(
    config:
      | QuireMarkConfigInput<Options, Storage>
      | MarkConfig<Options, Storage>
      | (() => MarkConfig<Options, Storage>)
  ): Mark<Options, Storage> {
    return new Mark(config as QuireMarkConfigInput<Options, Storage>);
  }

  /**
   * Creates a new mark extension instance with merged options.
   *
   * @param options - Option overrides to merge with the current extension
   * options.
   * @returns A new mark extension instance with merged options.
   */
  override configure(options: Partial<Options> = {}): Mark<Options, Storage> {
    return super.configure(options) as Mark<Options, Storage>;
  }

  override extend<
    ExtendedOptions extends object = Options,
    ExtendedStorage extends object = Storage
  >(
    config?: Partial<QuireMarkConfig<ExtendedOptions, ExtendedStorage>>
  ): Mark<ExtendedOptions, ExtendedStorage>;
  /**
   * Creates a child mark extension with fields merged over the current config.
   *
   * @param config - Mark config fields to merge on top of this mark.
   * @returns A new mark extension instance with merged config.
   */
  override extend<
    ExtendedOptions extends object = Options,
    ExtendedStorage extends object = Storage,
    ExtendedConfig extends QuireExtendableConfig<
      ExtendedOptions,
      ExtendedStorage
    > = QuireExtendableConfig<ExtendedOptions, ExtendedStorage>
  >(
    config: Partial<ExtendedConfig> = {}
  ): Mark<ExtendedOptions, ExtendedStorage> {
    return super.extend<
      ExtendedOptions,
      ExtendedStorage,
      QuireMarkConfig<ExtendedOptions, ExtendedStorage>
    >(
      config as Partial<QuireMarkConfig<ExtendedOptions, ExtendedStorage>>
    ) as Mark<ExtendedOptions, ExtendedStorage>;
  }
}

/**
 * Resolves a mark config input into a concrete mark config.
 *
 * @param input - Static mark config or factory function.
 * @returns Concrete mark config.
 */
function resolveMarkConfigInput<
  Options extends object = object,
  Storage extends object = object
>(
  input: QuireMarkConfigInput<Options, Storage>
): QuireMarkConfig<Options, Storage> {
  return typeof input === "function" ? input() : input;
}

/**
 * Creates the `this` context used by editor-independent mark config fields.
 *
 * @param markExtension - Mark extension receiving the config field call.
 * @returns Mark extension factory context.
 */
function createMarkContext<
  Options extends object = object,
  Storage extends object = object
>(
  markExtension: Mark<Options, Storage>
): QuireExtensionThisContext<Options, Storage> {
  return {
    name: markExtension.name,
    options: markExtension.options,
    storage: markExtension.storage,
    parent: undefined
  };
}

/**
 * Resolves and calls a Tiptap-compatible mark config factory.
 *
 * @param markExtension - Mark extension that owns the config.
 * @param field - Config field to resolve.
 * @param context - Context bound as `this`.
 * @returns Factory result, static field value, or undefined.
 */
function callMarkFactory<Result>(
  markExtension: Mark<any, any>,
  field: keyof QuireMarkConfig<any, any>,
  context: QuireExtensionThisContext<any, any>
): Result | undefined {
  const fieldValue = getExtensionField<
    Result | ((context: QuireExtensionThisContext<any, any>) => Result)
  >(
    markExtension,
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
 * @param markExtension - Mark extension that owns the config.
 * @param field - Config field to resolve.
 * @returns Resolved field value, or undefined.
 */
function getMarkField<Result>(
  markExtension: Mark<any, any>,
  field: keyof QuireMarkConfig<any, any>
): Result | undefined {
  return getExtensionField<Result>(markExtension, field, {
    name: markExtension.name,
    options: markExtension.options,
    storage: markExtension.storage,
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
 * @param markExtension - Mark extension that owns the config.
 * @param field - Config field to resolve.
 * @returns Raw field value, or undefined.
 */
function getRawMarkField<Result>(
  markExtension: Mark<any, any>,
  field: keyof QuireMarkConfig<any, any>
): Result | undefined {
  const fieldValue = markExtension.config[field];

  if (fieldValue === undefined && markExtension.parent) {
    return getRawMarkField(
      markExtension.parent as Mark<any, any>,
      field
    );
  }

  return fieldValue as Result | undefined;
}

/**
 * Creates a ProseMirror mark spec from a mark config.
 *
 * @param markExtension - Mark extension that owns the schema fields.
 * @param context - Resolved extension context.
 * @returns ProseMirror mark spec for the config.
 */
function createMarkSpec<
  Options extends object = object,
  Storage extends object = object
>(
  markExtension: Mark<Options, Storage>,
  context: QuireExtensionThisContext<Options, Storage>
): MarkSpec {
  const spec: MarkSpec = {};

  assignDefined(
    spec,
    "inclusive",
    resolveMarkConfigField<MarkSpec["inclusive"]>(
      markExtension,
      "inclusive",
      context
    )
  );
  assignDefined(
    spec,
    "excludes",
    resolveMarkConfigField<MarkSpec["excludes"]>(
      markExtension,
      "excludes",
      context
    )
  );
  assignDefined(
    spec,
    "group",
    resolveMarkConfigField<MarkSpec["group"]>(markExtension, "group", context)
  );
  assignDefined(
    spec,
    "spanning",
    resolveMarkConfigField<MarkSpec["spanning"]>(
      markExtension,
      "spanning",
      context
    )
  );
  assignDefined(
    spec,
    "code",
    resolveMarkConfigField<MarkSpec["code"]>(markExtension, "code", context)
  );

  const attributes = callMarkConfigFactory<QuireSchemaAttributeMap>(
    markExtension,
    "addAttributes",
    context
  );
  if (attributes && Object.keys(attributes).length > 0) {
    spec.attrs = { ...attributes };
  }

  const parseDOM = callMarkConfigFactory<readonly ParseRule[]>(
    markExtension,
    "parseHTML",
    context
  );
  if (parseDOM && parseDOM.length > 0) {
    spec.parseDOM = parseDOM;
  }

  const renderHTML = getMarkConfigField(markExtension, "renderHTML", context);
  if (renderHTML) {
    spec.toDOM = createMarkToDOM(markExtension, context);
  }

  return spec;
}

/**
 * Creates a ProseMirror toDOM serializer for a mark config.
 *
 * @param markExtension - Mark extension that owns the renderHTML callback.
 * @param context - Resolved extension context.
 * @returns ProseMirror toDOM serializer for this mark type.
 */
function createMarkToDOM<
  Options extends object = object,
  Storage extends object = object
>(
  markExtension: Mark<Options, Storage>,
  context: QuireExtensionThisContext<Options, Storage>
): NonNullable<MarkSpec["toDOM"]> {
  const renderHTML = getMarkConfigField(markExtension, "renderHTML", context) as
    | OmitThisParameter<NonNullable<QuireMarkConfig<Options, Storage>["renderHTML"]>>
    | undefined;

  /**
   * Serializes a ProseMirror mark to a DOM output spec.
   *
   * @param mark - ProseMirror mark being serialized.
   * @returns DOM output spec returned by the mark config.
   */
  function toDOM(mark: PMMark): DOMOutputSpec {
    const renderContext = {
      ...context,
      mark,
      HTMLAttributes: createHTMLAttributes(mark.attrs)
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
function assignDefined<Key extends keyof MarkSpec>(
  target: MarkSpec,
  key: Key,
  value: MarkSpec[Key] | undefined
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

/**
 * Resolves and calls a Tiptap-compatible mark config factory.
 *
 * @param markExtension - Mark extension that owns the config.
 * @param field - Config field to resolve.
 * @param context - Context exposed as the Tiptap-compatible `this` value.
 * @returns Factory result, or undefined when no factory exists.
 */
function callMarkConfigFactory<Result = unknown>(
  markExtension: Mark<any, any>,
  field: keyof QuireMarkConfig,
  context: QuireExtensionThisContext<any, any>
): Result | undefined {
  const fieldValue = getMarkConfigField(markExtension, field, context);
  if (typeof fieldValue !== "function") {
    return fieldValue as Result | undefined;
  }

  return (fieldValue as (context: QuireExtensionThisContext<any, any>) => Result)(
    context
  );
}

/**
 * Resolves a mark schema field value through the parent chain.
 *
 * @param markExtension - Mark extension that owns the config.
 * @param field - Config field to resolve.
 * @param context - Resolved extension context.
 * @returns Resolved field value.
 */
function resolveMarkConfigField<Value>(
  markExtension: Mark<any, any>,
  field: keyof QuireMarkConfig,
  context: QuireExtensionThisContext<any, any>
): Value | undefined {
  const fieldValue = getMarkConfigField(markExtension, field, context);
  if (typeof fieldValue === "function") {
    return (fieldValue as (context: QuireExtensionThisContext<any, any>) => Value)(
      context
    );
  }

  return fieldValue as Value | undefined;
}

/**
 * Resolves a mark config field through an `extend()` parent chain.
 *
 * @param markExtension - Mark extension to inspect.
 * @param field - Mark config field to resolve.
 * @param context - Context used to bind function fields.
 * @returns Resolved field value or bound function.
 */
function getMarkConfigField<Context>(
  markExtension: Mark<any, any>,
  field: keyof QuireMarkConfig,
  context: Context
): unknown {
  return getExtensionField(
    markExtension,
    field,
    context as unknown as Readonly<Record<string, unknown>>
  );
}
