import { Extendable } from "./Extendable";
import { getExtensionField } from "./helpers/getExtensionField";
import { mergeExtensionOptions } from "./utilities/mergeDeep";
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
import type {
  QuireAnyExtension,
  AnyCommands,
  QuireExtension,
  QuireExtensionBeforeCreateHook,
  QuireExtensionBlurHook,
  QuireExtensionConfig,
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
  QuireMarkSpecMap,
  QuireMarkdownConfigFields,
  QuireMarkdownOptions,
  QuireNodeCanvasTextStyleMap,
  QuireNodeHTMLSerializationTransformMap,
  QuireNodeMarkdownSerializationTransformMap,
  QuireNodeSpecMap,
  QuirePasteRuleList,
  QuirePluginList,
  QuireSchemaAttributeContribution,
  QuireTransformPastedHTMLHook,
  QuireViewAdapter,
  MarkdownTokenizer
} from "./types";

/** Extension config input accepted by Tiptap-compatible class factories. */
export type QuireExtensionConfigInput<
  Options extends object = object,
  Storage extends object = object
> =
  | QuireExtensionConfig<Options, Storage>
  | (() => QuireExtensionConfig<Options, Storage>);

/** Base class for Tiptap-compatible behavior-only QuireKit extensions. */
export class Extension<
  Options extends object = object,
  Storage extends object = object
> extends Extendable<
  Options,
  Storage,
  QuireExtensionConfig<Options, Storage>
> implements QuireExtension<Options, Storage> {
  /** Tiptap-compatible authoring family alias. */
  override type: QuireExtensionKind = "extension";

  /**
   * Creates a resolved extension instance.
   *
   * @param config - Extension config to resolve.
   * @param configuredOptions - Option overrides used by still-migrating node
   * and mark wrappers.
   */
  constructor(
    config: QuireExtensionConfig<Options, Storage>,
    configuredOptions: Partial<Options> = {}
  ) {
    super(config);

    if (Object.keys(configuredOptions).length > 0) {
      const baseOptions = this.options as Options;

      this.config = {
        ...this.config,
        addOptions: () => mergeExtensionOptions(baseOptions, configuredOptions)
      } as QuireExtensionConfig<Options, Storage> & Readonly<Record<string, unknown>>;
    }
  }

  /**
   * Creates a Tiptap-compatible extension class instance.
   *
   * @param config - Extension config to resolve.
   * @returns Resolved extension class instance.
   */
  static create<
    Options extends object = object,
    Storage extends object = object
  >(config: QuireExtensionConfigInput<Options, Storage>): Extension<Options, Storage> {
    return new Extension(resolveExtensionConfigInput(config));
  }

  /**
   * Returns the resolved extension family.
   *
   * @returns The behavior-only extension family.
   */
  get kind(): QuireExtensionKind {
    return "extension";
  }

  /**
   * Returns the configured priority.
   *
   * @returns Extension priority, or undefined.
   */
  get priority(): number | undefined {
    return getRawExtensionField<number>(this, "priority");
  }

  /**
   * Returns the configured keyboard-only priority.
   *
   * @returns Keyboard shortcut priority, or undefined.
   */
  get keyboardShortcutPriority(): number | undefined {
    return getRawExtensionField<number>(this, "keyboardShortcutPriority");
  }

  /**
   * Returns the optional schema top node name.
   *
   * @returns Top node name, or undefined.
   */
  get topNodeName(): string | undefined {
    return callExtensionFactory<string | undefined>(
      this,
      "addTopNodeName",
      createExtensionContext(this)
    );
  }

  /**
   * Returns commands contributed by `addCommands()`.
   *
   * @returns Command map, or undefined when the extension has no commands.
   */
  get commands(): AnyCommands | undefined {
    const commands = callExtensionFactory<AnyCommands>(
      this,
      "addCommands",
      createExtensionContext(this)
    ) ?? {};

    return Object.keys(commands).length > 0 ? commands : undefined;
  }

  /**
   * Returns static keyboard shortcuts.
   *
   * Editor-bound `addKeyboardShortcuts()` factories are collected later with
   * access to the editor instance, matching Tiptap's ExtensionManager flow.
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
    return callExtensionFactory<QuireInputRuleList>(
      this,
      "addInputRules",
      createExtensionContext(this)
    ) ?? [];
  }

  /**
   * Returns paste rules contributed by `addPasteRules()`.
   *
   * @returns Paste rules in extension-local order.
   */
  get pasteRules(): QuirePasteRuleList {
    return callExtensionFactory<QuirePasteRuleList>(
      this,
      "addPasteRules",
      createExtensionContext(this)
    ) ?? [];
  }

  /**
   * Returns node specs directly contributed by behavior extensions.
   *
   * @returns Node spec map.
   */
  get nodes(): QuireNodeSpecMap {
    return callExtensionFactory<QuireNodeSpecMap>(
      this,
      "addNodes" as keyof QuireExtensionConfig<any, any>,
      createExtensionContext(this)
    ) ?? {};
  }

  /**
   * Returns mark specs directly contributed by behavior extensions.
   *
   * @returns Mark spec map.
   */
  get marks(): QuireMarkSpecMap {
    return callExtensionFactory<QuireMarkSpecMap>(
      this,
      "addMarks" as keyof QuireExtensionConfig<any, any>,
      createExtensionContext(this)
    ) ?? {};
  }

  /**
   * Returns static ProseMirror plugins.
   *
   * Runtime `addProseMirrorPlugins()` factories are evaluated after the editor
   * exists, so this getter intentionally stays empty for behavior extensions.
   *
   * @returns Static plugin list.
   */
  get plugins(): QuirePluginList {
    return [];
  }

  /**
   * Returns base Canvas/SVG text styles contributed for existing node types.
   *
   * @returns Style resolver map, or undefined when the extension contributes none.
   */
  get canvasTextStyle(): QuireNodeCanvasTextStyleMap | undefined {
    const styles = callExtensionFactory<QuireNodeCanvasTextStyleMap>(
      this,
      "addNodeCanvasTextStyles",
      createExtensionContext(this)
    ) ?? {};

    return Object.keys(styles).length > 0 ? styles : undefined;
  }

  /**
   * Returns HTML serialization transforms contributed for existing node types.
   *
   * @returns Transform map, or undefined when the extension contributes none.
   */
  get htmlSerializationTransforms():
    | QuireNodeHTMLSerializationTransformMap
    | undefined {
    const transforms =
      callExtensionFactory<QuireNodeHTMLSerializationTransformMap>(
        this,
        "addNodeHTMLSerializationTransforms",
        createExtensionContext(this)
      ) ?? {};

    return Object.keys(transforms).length > 0 ? transforms : undefined;
  }

  /**
   * Returns Markdown serialization transforms contributed for existing node types.
   *
   * @returns Transform map, or undefined when the extension contributes none.
   */
  get markdownSerializationTransforms():
    | QuireNodeMarkdownSerializationTransformMap
    | undefined {
    const transforms =
      callExtensionFactory<QuireNodeMarkdownSerializationTransformMap>(
        this,
        "addNodeMarkdownSerializationTransforms",
        createExtensionContext(this)
      ) ?? {};

    return Object.keys(transforms).length > 0 ? transforms : undefined;
  }

  /**
   * Returns layout-provider registrations contributed by this extension.
   *
   * @returns Registrations annotated with this extension name.
   */
  get layoutProviders(): readonly QuireLayoutProviderEntry[] {
    return (callExtensionFactory<readonly QuireLayoutProviderRegistration[]>(
      this,
      "addLayoutProviders",
      createExtensionContext(this)
    ) ?? []).map((registration) => ({
      ...registration,
      extensionName: this.name
    }));
  }

  /**
   * Returns document-profile registrations contributed by this extension.
   *
   * @returns Registrations annotated with this extension name.
   */
  get documentProfiles(): readonly QuireDocumentProfileEntry[] {
    return (callExtensionFactory<readonly QuireDocumentProfileRegistration[]>(
      this,
      "addDocumentProfiles",
      createExtensionContext(this)
    ) ?? []).map((registration) => ({
      ...registration,
      extensionName: this.name
    }));
  }

  /**
   * Returns structured-range selection adapters contributed by this extension.
   *
   * @returns Adapter registrations annotated with this extension name.
   */
  get selectionAdapters(): readonly QuireSelectionAdapterEntry[] {
    const context = createExtensionContext(this);
    const contributions = callExtensionFactory<
      readonly QuireSelectionContribution[]
    >(this, "addSelection", context) ?? [];
    const adapters = callExtensionFactory<
      readonly QuireSelectionAdapterRegistration[]
    >(this, "addSelectionAdapters", context) ?? [];

    return [...contributions, ...adapters].map((registration) => ({
      ...registration,
      extensionName: this.name
    }));
  }

  /**
   * Returns mounted view adapters contributed by `addViewAdapters()`.
   *
   * @returns View adapters in extension-local order.
   */
  get viewAdapters(): readonly QuireViewAdapter[] {
    return callExtensionFactory<readonly QuireViewAdapter[]>(
      this,
      "addViewAdapters",
      createExtensionContext(this)
    ) ?? [];
  }

  /**
   * Returns qkView event handlers contributed by this extension.
   *
   * @returns Event-handler map, or undefined when empty.
   */
  get viewEventHandlers(): QuireExtensionViewEventHandlerMap | undefined {
    const viewEventHandlers = {
      ...(getStaticExtensionField<QuireExtensionViewEventHandlerMap>(
        this,
        "viewEventHandlers"
      ) ?? {}),
      ...(callExtensionFactory<QuireExtensionViewEventHandlerMap>(
        this,
        "addViewEventHandlers",
        createExtensionContext(this)
      ) ?? {})
    };

    return Object.keys(viewEventHandlers).length > 0 ? viewEventHandlers : undefined;
  }

  /**
   * Returns child extensions contributed by `addExtensions()`.
   *
   * @returns Child extensions in extension-local order.
   */
  get extensions(): readonly QuireAnyExtension[] {
    return callExtensionFactory<readonly QuireAnyExtension[]>(
      this,
      "addExtensions",
      createExtensionContext(this)
    ) ?? [];
  }

  /**
   * Returns the before-create lifecycle hook.
   *
   * @returns Lifecycle hook, or undefined.
   */
  get onBeforeCreate(): QuireExtensionBeforeCreateHook<Options, Storage> | undefined {
    return getRawExtensionField(this, "onBeforeCreate");
  }

  /**
   * Returns the create lifecycle hook.
   *
   * @returns Lifecycle hook, or undefined.
   */
  get onCreate(): QuireExtensionCreateHook<Options, Storage> | undefined {
    return getRawExtensionField(this, "onCreate");
  }

  /**
   * Returns the update lifecycle hook.
   *
   * @returns Lifecycle hook, or undefined.
   */
  get onUpdate(): QuireExtensionUpdateHook<Options, Storage> | undefined {
    return getRawExtensionField(this, "onUpdate");
  }

  /**
   * Returns the destroy lifecycle hook.
   *
   * @returns Lifecycle hook, or undefined.
   */
  get onDestroy(): QuireExtensionDestroyHook<Options, Storage> | undefined {
    return getRawExtensionField(this, "onDestroy");
  }

  /**
   * Returns the focus lifecycle hook.
   *
   * @returns Lifecycle hook, or undefined.
   */
  get onFocus(): QuireExtensionFocusHook<Options, Storage> | undefined {
    return getRawExtensionField(this, "onFocus");
  }

  /**
   * Returns the blur lifecycle hook.
   *
   * @returns Lifecycle hook, or undefined.
   */
  get onBlur(): QuireExtensionBlurHook<Options, Storage> | undefined {
    return getRawExtensionField(this, "onBlur");
  }

  /**
   * Returns the dispatch transaction hook.
   *
   * @returns Dispatch hook, or undefined.
   */
  get dispatchTransaction():
    | QuireExtensionDispatchTransactionHook<Options, Storage>
    | undefined {
    return getRawExtensionField(this, "dispatchTransaction");
  }

  /**
   * Returns the pasted HTML transform hook.
   *
   * @returns Transform hook, or undefined.
   */
  get transformPastedHTML():
    | QuireTransformPastedHTMLHook<Options, Storage>
    | undefined {
    return getRawExtensionField(this, "transformPastedHTML");
  }

  /**
   * Returns the Markdown token name contributed by this extension.
   *
   * @returns Markdown token name, or undefined.
   */
  get markdownTokenName(): string | undefined {
    return getStaticExtensionField<string>(this, "markdownTokenName");
  }

  /**
   * Returns the Markdown parse handler contributed by this extension.
   *
   * @returns Markdown parse handler, or undefined.
   */
  get parseMarkdown(): QuireMarkdownConfigFields["parseMarkdown"] | undefined {
    return getStaticExtensionField<QuireMarkdownConfigFields["parseMarkdown"]>(
      this,
      "parseMarkdown"
    );
  }

  /**
   * Returns the Markdown render handler contributed by this extension.
   *
   * @returns Markdown render handler, or undefined.
   */
  get renderMarkdown(): QuireMarkdownConfigFields["renderMarkdown"] | undefined {
    return getStaticExtensionField<QuireMarkdownConfigFields["renderMarkdown"]>(
      this,
      "renderMarkdown"
    );
  }

  /**
   * Returns the custom Markdown tokenizer contributed by this extension.
   *
   * @returns Markdown tokenizer, or undefined.
   */
  get markdownTokenizer(): MarkdownTokenizer | undefined {
    return getStaticExtensionField<MarkdownTokenizer>(this, "markdownTokenizer");
  }

  /**
   * Returns Markdown rendering options contributed by this extension.
   *
   * @returns Markdown options, or undefined.
   */
  get markdownOptions(): QuireMarkdownOptions | undefined {
    return getStaticExtensionField<QuireMarkdownOptions>(this, "markdownOptions");
  }

  /**
   * Returns legacy lowered attribute contributions.
   *
   * The schema path now resolves attributes directly from Tiptap config fields,
   * so behavior extensions should not pre-lower attributes here.
   *
   * @returns Empty attribute contribution list.
   */
  get attributes(): readonly QuireSchemaAttributeContribution[] {
    return [];
  }

  /**
   * Creates a configured copy of this extension.
   *
   * @param options - Option overrides to merge with the current options.
   * @returns Configured extension instance.
   */
  override configure(options: Partial<Options> = {}): Extension<Options, Storage> {
    return super.configure(options) as Extension<Options, Storage>;
  }

  /**
   * Creates a child extension with fields merged over the current config.
   *
   * @param extension - Extension fields to merge on top of this extension.
   * @returns Extended extension instance.
   */
  override extend<
    ExtendedOptions extends object = Options,
    ExtendedStorage extends object = Storage
  >(
    extension: Partial<QuireExtensionConfig<ExtendedOptions, ExtendedStorage>> = {}
  ): Extension<ExtendedOptions, ExtendedStorage> {
    return super.extend<
      ExtendedOptions,
      ExtendedStorage,
      QuireExtensionConfig<ExtendedOptions, ExtendedStorage>
    >(extension) as Extension<ExtendedOptions, ExtendedStorage>;
  }
}

/**
 * Resolves an extension config input into a concrete config.
 *
 * @param input - Static extension config or factory function.
 * @returns Concrete extension config.
 */
function resolveExtensionConfigInput<
  Options extends object = object,
  Storage extends object = object
>(
  input: QuireExtensionConfigInput<Options, Storage>
): QuireExtensionConfig<Options, Storage> {
  return typeof input === "function" ? input() : input;
}

/**
 * Creates the `this` context used by editor-independent extension factories.
 *
 * @param extension - Extension receiving the factory call.
 * @returns Extension factory context.
 */
function createExtensionContext<
  Options extends object = object,
  Storage extends object = object
>(
  extension: Extension<Options, Storage>
): QuireExtensionThisContext<Options, Storage> {
  return {
    name: extension.name,
    options: extension.options,
    storage: extension.storage,
    parent: undefined
  };
}

/**
 * Resolves and calls an extension factory from config.
 *
 * @param extension - Extension that owns the config.
 * @param field - Config field to resolve.
 * @param context - Context bound as `this`.
 * @returns Factory result, static field value, or undefined.
 */
function callExtensionFactory<Result>(
  extension: Extension<any, any>,
  field: keyof QuireExtensionConfig<any, any>,
  context: QuireExtensionThisContext<any, any>
): Result | undefined {
  const fieldValue = getExtensionField<Result | (() => Result)>(
    extension,
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
 * Resolves a static config field through the Tiptap parent chain.
 *
 * @param extension - Extension that owns the config.
 * @param field - Config field to resolve.
 * @returns Static field value, or undefined.
 */
function getStaticExtensionField<Result>(
  extension: Extension<any, any>,
  field: keyof QuireExtensionConfig<any, any>
): Result | undefined {
  return getExtensionField<Result>(extension, field, {
    name: extension.name,
    options: extension.options,
    storage: extension.storage,
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
 * @param extension - Extension that owns the config.
 * @param field - Config field to resolve.
 * @returns Raw field value, or undefined.
 */
function getRawExtensionField<Result>(
  extension: Extension<any, any>,
  field: keyof QuireExtensionConfig<any, any>
): Result | undefined {
  const fieldValue = extension.config[field];

  if (fieldValue === undefined && extension.parent) {
    return getRawExtensionField(
      extension.parent as Extension<any, any>,
      field
    );
  }

  return fieldValue as Result | undefined;
}
