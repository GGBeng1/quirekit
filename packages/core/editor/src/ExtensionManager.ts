import type { Schema, Transaction } from "@quirekit/pm";
import {
  DecorationManager,
  type DecorationManagerEntry
} from "./decorations";
import {
  createQuireLayoutProviderRegistrationRegistry,
  type QuireLayoutProviderEntry,
  type QuireLayoutProviderRegistry
} from "./layout-provider";
import {
  createQuireDocumentProfileRegistry,
  type QuireDocumentProfileEntry,
  type QuireDocumentProfileRegistry
} from "./document-profile";
import {
  createQuireSelectionAdapterRegistry,
  type QuireSelectionAdapterEntry,
  type QuireSelectionAdapterRegistry
} from "./selection-adapter";
import type { QuireEditor } from "./Editor";
import { getAttributesFromExtensions } from "./helpers/getAttributesFromExtensions";
import { getExtensionField } from "./helpers/getExtensionField";
import { getMarkType } from "./helpers/getMarkType";
import { getNodeType } from "./helpers/getNodeType";
import { getRenderedAttributes } from "./helpers/getRenderedAttributes";
import { isExtensionRulesEnabled } from "./helpers/isExtensionRulesEnabled";
import { getSchema } from "./helpers/getSchema";
import { resolveExtensions } from "./helpers/resolveExtensions";
import { sortExtensionsByKeyboardShortcutPriority } from "./helpers/sortExtensionsByKeyboardShortcutPriority";
import { createSchemaSpec } from "./schema";
import type {
  AnyCommands,
  QuireAddDecorationsFactory,
  QuireAnyExtension,
  QuireBuiltInExtensionDiagnostic,
  QuireEnableRules,
  QuireExtensionAttribute,
  QuireExtensionDispatchTransactionHook,
  QuireExtensionViewEventHandlerMap,
  QuireInputRuleList,
  QuireKeyboardShortcutEntry,
  QuireMarkViewMap,
  QuireMarkViewRenderer,
  QuireNodeViewMap,
  QuireNodeViewRenderer,
  QuirePasteRuleList,
  QuirePluginList,
  QuireSchemaSpec,
  QuireTransformPastedHTMLHook,
  QuireViewAdapter
} from "./types";
import { callOrReturn } from "./utilities";

/** Options that control how extension contributions are collected. */
export interface QuireExtensionManagerOptions {
  /** Explicit compiled schema authority, when the editor does not rebuild its model. */
  readonly schema?: Schema | undefined;
  /** Resolved or unresolved extensions to sort, inspect, and aggregate. */
  readonly extensions?: readonly QuireAnyExtension[] | undefined;
  /** Editor instance used for editor-bound extension factories. */
  readonly editor?: QuireEditor | undefined;
  /** Whether input rules are enabled globally or for selected extensions. */
  readonly enableInputRules?: QuireEnableRules | undefined;
  /** Whether paste rules are enabled globally or for selected extensions. */
  readonly enablePasteRules?: QuireEnableRules | undefined;
  /** Whether extensions can intercept transaction dispatch. */
  readonly enableExtensionDispatchTransaction?: boolean | undefined;
}

/** Resolves extensions into ordered contributions and diagnostics. */
export class QuireExtensionManager {
  /** Whether extension dispatchTransaction hooks participate in dispatch. */
  private readonly extensionDispatchEnabled: boolean;

  /** Extensions installed into the editor in execution order. */
  readonly extensions: readonly QuireAnyExtension[];

  /** Storage objects keyed by extension name. */
  readonly storage: Readonly<Record<string, unknown>>;

  /** Raw command factories aggregated with Tiptap overwrite semantics. */
  readonly commands: AnyCommands;

  /** Resolved node and mark attributes contributed by extensions. */
  readonly attributes: readonly QuireExtensionAttribute[];

  /** Mark names that should be preserved when splitting blocks or list items. */
  readonly splittableMarks: readonly string[];

  /** ProseMirror plugins contributed by installed extensions. */
  readonly plugins: QuirePluginList;

  /** Declarative decoration lifecycle shared by installed extensions. */
  readonly decorationManager: DecorationManager | null;

  /** Keyboard shortcuts contributed by installed extensions. */
  readonly keyboardShortcuts: readonly QuireKeyboardShortcutEntry[];

  /** Input rules contributed by installed extensions. */
  readonly inputRules: QuireInputRuleList;

  /** Paste rules contributed by installed extensions. */
  readonly pasteRules: QuirePasteRuleList;

  /** Mounted view adapters contributed by installed extensions. */
  readonly viewAdapters: readonly QuireViewAdapter[];

  /** qkView event handlers contributed by installed extensions. */
  readonly viewEventHandlers: QuireExtensionViewEventHandlerMap;

  /** Layout-provider registrations in extension execution order. */
  readonly layoutProviders: readonly QuireLayoutProviderEntry[];

  /** Deterministic layout-provider lookup, or null when registration is invalid. */
  readonly layoutProviderRegistry: QuireLayoutProviderRegistry | null;

  /** Document-profile registrations in extension execution order. */
  readonly documentProfiles: readonly QuireDocumentProfileEntry[];

  /** Deterministic document-profile lookup, or null when registration is invalid. */
  readonly documentProfileRegistry: QuireDocumentProfileRegistry | null;

  /** Structured-range selection adapters in deterministic precedence order. */
  readonly selectionAdapters: readonly QuireSelectionAdapterEntry[];

  /** Deterministic selection-adapter lookup, or null when registration is invalid. */
  readonly selectionAdapterRegistry: QuireSelectionAdapterRegistry | null;

  /** Renderer-neutral node view constructors contributed by node extensions. */
  readonly nodeViews: QuireNodeViewMap;

  /** Renderer-neutral mark view constructors contributed by mark extensions. */
  readonly markViews: QuireMarkViewMap;

  /** Schema spec built from base schema and extension contributions. */
  readonly schemaSpec: QuireSchemaSpec;

  /** Schema built from base schema and extension contributions. */
  readonly schema: Schema;

  /** Diagnostics collected while resolving extensions. */
  readonly diagnostics: readonly QuireBuiltInExtensionDiagnostic[];

  /**
   * Creates a manager for a set of resolved extensions.
   *
   * @param extensionsOrOptions - Resolved extensions or manager options.
   */
  constructor(
    extensionsOrOptions:
      | readonly QuireAnyExtension[]
      | QuireExtensionManagerOptions = []
  ) {
    const options = normalizeExtensionManagerOptions(extensionsOrOptions);

    const extensions = options.extensions ?? [];

    this.extensionDispatchEnabled = options.enableExtensionDispatchTransaction ?? true;
    this.extensions = resolveExtensions(extensions);
    this.storage = createExtensionStorage(this.extensions);
    this.commands = createExtensionCommands(this.extensions);
    this.attributes = getAttributesFromExtensions(this.extensions);
    this.splittableMarks = createExtensionSplittableMarks(this.extensions);
    this.plugins = createExtensionPlugins(this.extensions);
    this.keyboardShortcuts = createExtensionKeyboardShortcuts(this.extensions);
    this.inputRules = createExtensionInputRules(
      this.extensions,
      options.enableInputRules ?? true
    );
    this.pasteRules = createExtensionPasteRules(
      this.extensions,
      options.enablePasteRules ?? true
    );
    this.viewAdapters = createExtensionViewAdapters(this.extensions);
    this.viewEventHandlers = createExtensionViewEventHandlers(this.extensions);
    this.layoutProviders = createExtensionLayoutProviders(this.extensions);
    const layoutProviderResult =
      createQuireLayoutProviderRegistrationRegistry(this.layoutProviders);
    this.layoutProviderRegistry = layoutProviderResult.valid
      ? layoutProviderResult.registry
      : null;
    this.documentProfiles = this.extensions.flatMap(
      (extension) => extension.documentProfiles ?? []
    );
    const documentProfileResult =
      createQuireDocumentProfileRegistry(this.documentProfiles);
    this.documentProfileRegistry = documentProfileResult.valid
      ? documentProfileResult.registry
      : null;
    const selectionAdapters = createExtensionSelectionAdapters(this.extensions);
    const selectionAdapterResult =
      createQuireSelectionAdapterRegistry(selectionAdapters);
    this.selectionAdapters = selectionAdapterResult.valid
      ? selectionAdapterResult.registry.entries
      : selectionAdapters;
    this.selectionAdapterRegistry = selectionAdapterResult.valid
      ? selectionAdapterResult.registry
      : null;
    this.schemaSpec = createSchemaSpec(this.extensions);
    this.schema = options.schema ?? getSchema(this.extensions);
    this.decorationManager = options.editor
      ? new DecorationManager({
          editor: options.editor,
          entries: createDecorationEntries(this.extensions, options.editor)
        })
      : null;
    this.nodeViews = options.editor
      ? createExtensionNodeViews(
          this.extensions,
          this.attributes,
          this.schema,
          options.editor
        )
      : {};
    this.markViews = options.editor
      ? createExtensionMarkViews(
          this.extensions,
          this.attributes,
          this.schema,
          options.editor
        )
      : {};
    this.diagnostics = createExtensionDiagnostics(this.extensions);
  }

  /**
   * Composes extension dispatchTransaction hooks around a base dispatcher.
   *
   * @param editor - Editor whose transaction is being dispatched.
   * @param baseDispatch - Core dispatch function that applies a transaction.
   * @returns Dispatch function wrapped by extension hooks in priority order.
   */
  dispatchTransaction(
    editor: QuireEditor,
    baseDispatch: (transaction: Transaction) => void
  ): (transaction: Transaction) => void {
    if (!this.extensionDispatchEnabled) {
      return baseDispatch;
    }

    return this.extensions.reduceRight((next, extension) => {
      const context = {
        name: extension.name,
        options: extension.options,
        storage: extension.storage,
        editor,
        parent: undefined
      };
      const dispatchTransaction =
        getExtensionField<QuireExtensionDispatchTransactionHook>(
          extension,
          "dispatchTransaction",
          context
        );

      if (!dispatchTransaction) {
        return next;
      }

      return (transaction: Transaction) => {
        dispatchTransaction.call(context, { transaction, next });
      };
    }, baseDispatch);
  }

  /**
   * Composes transformPastedHTML hooks around an optional base transform.
   *
   * @param editor - Editor whose extensions should transform pasted HTML.
   * @param baseTransform - Optional direct editor prop transform.
   * @returns Composed transform, or undefined when no transform exists.
   */
  transformPastedHTML(
    editor: QuireEditor,
    baseTransform?: ((html: string, view?: unknown) => string) | undefined
  ): ((html: string, view?: unknown) => string) | undefined {
    let hasTransform = typeof baseTransform === "function";
    const initialTransform =
      baseTransform ?? ((html: string) => html);
    const transform = this.extensions.reduce((previousTransform, extension) => {
      const context = {
        name: extension.name,
        options: extension.options,
        storage: extension.storage,
        editor,
        parent: undefined
      };
      const extensionTransform =
        getExtensionField<QuireTransformPastedHTMLHook>(
          extension,
          "transformPastedHTML",
          context
        );

      if (!extensionTransform) {
        return previousTransform;
      }

      hasTransform = true;

      return (html: string, view?: unknown) =>
        extensionTransform.call(context, previousTransform(html, view), view);
    }, initialTransform);

    return hasTransform ? transform : undefined;
  }
}

/**
 * Normalizes constructor input while keeping the legacy array signature.
 *
 * @param extensionsOrOptions - Extension array or manager options.
 * @returns Normalized manager options.
 */
function normalizeExtensionManagerOptions(
  extensionsOrOptions:
    | readonly QuireAnyExtension[]
    | QuireExtensionManagerOptions
): QuireExtensionManagerOptions {
  if (Array.isArray(extensionsOrOptions)) {
    return { extensions: extensionsOrOptions };
  }

  return extensionsOrOptions as QuireExtensionManagerOptions;
}

/**
 * Collects mark names whose `keepOnSplit` config remains enabled.
 *
 * @param extensions - Resolved extensions that may include mark extensions.
 * @returns Mark extension names that should preserve active marks on split.
 */
function createExtensionSplittableMarks(
  extensions: readonly QuireAnyExtension[]
): readonly string[] {
  const marks: string[] = [];

  for (const extension of extensions) {
    if (extension.kind !== "mark") {
      continue;
    }

    const keepOnSplit = getExtensionField<boolean | (() => boolean)>(
      extension,
      "keepOnSplit",
      {
        name: extension.name,
        options: extension.options,
        storage: extension.storage
      }
    );

    if (callOrReturn(keepOnSplit ?? true)) {
      marks.push(extension.name);
    }
  }

  return marks;
}

/**
 * Collects input rules in extension execution order.
 *
 * @param extensions - Extensions that contribute input rules.
 * @param enabled - Rule enablement policy.
 * @returns Input rules ordered by extension priority and declaration order.
 */
function createExtensionInputRules(
  extensions: readonly QuireAnyExtension[],
  enabled: QuireEnableRules
): QuireInputRuleList {
  const inputRules: QuireInputRuleList[number][] = [];

  for (const extension of extensions) {
    if (!isExtensionRulesEnabled(extension, enabled)) {
      continue;
    }

    inputRules.push(...extension.inputRules);
  }

  return inputRules;
}

/**
 * Collects paste rules in extension execution order.
 *
 * @param extensions - Extensions that contribute paste rules.
 * @param enabled - Rule enablement policy.
 * @returns Paste rules ordered by extension priority and declaration order.
 */
function createExtensionPasteRules(
  extensions: readonly QuireAnyExtension[],
  enabled: QuireEnableRules
): QuirePasteRuleList {
  const pasteRules: QuirePasteRuleList[number][] = [];

  for (const extension of extensions) {
    if (!isExtensionRulesEnabled(extension, enabled)) {
      continue;
    }

    pasteRules.push(...extension.pasteRules);
  }

  return pasteRules;
}

/**
 * Collects extension storage objects by extension name.
 *
 * @param extensions - Extensions that own storage objects.
 * @returns Storage objects keyed by extension name.
 */
function createExtensionStorage(
  extensions: readonly QuireAnyExtension[]
): Readonly<Record<string, unknown>> {
  const storage: Record<string, unknown> = {};

  for (const extension of extensions) {
    if (!Object.prototype.hasOwnProperty.call(storage, extension.name)) {
      storage[extension.name] = extension.storage;
    }
  }

  return storage;
}

/**
 * Aggregates raw command factories in resolved extension order.
 *
 * Later extensions overwrite earlier command names, matching Tiptap's command
 * registry behavior instead of executing same-name handlers as fallbacks.
 *
 * @param extensions - Extensions that contribute raw command factories.
 * @returns One command factory per public command name.
 */
function createExtensionCommands(
  extensions: readonly QuireAnyExtension[]
): AnyCommands {
  return extensions.reduce<AnyCommands>((commands, extension) => ({
    ...commands,
    ...extension.commands
  }), {});
}

/**
 * Collects ProseMirror plugins in extension execution order.
 *
 * @param extensions - Extensions that contribute ProseMirror plugins.
 * @returns ProseMirror plugins ordered by extension priority and declaration
 * order within each extension.
 */
function createExtensionPlugins(extensions: readonly QuireAnyExtension[]): QuirePluginList {
  const plugins: QuirePluginList[number][] = [];

  for (const extension of extensions) {
    plugins.push(...extension.plugins);
  }

  return plugins;
}

/**
 * Collects editor-bound `addDecorations()` factories in extension order.
 *
 * @param extensions - Resolved extensions that may contribute decorations.
 * @param editor - Editor exposed to contribution factories.
 * @returns Lazy decoration-manager entries.
 */
function createDecorationEntries(
  extensions: readonly QuireAnyExtension[],
  editor: QuireEditor
): readonly DecorationManagerEntry[] {
  const entries: DecorationManagerEntry[] = [];

  for (const extension of extensions) {
    const context = {
      name: extension.name,
      options: extension.options,
      storage: extension.storage,
      editor,
      extensions,
      parent: undefined
    };
    const addDecorations = getExtensionField<QuireAddDecorationsFactory>(
      extension,
      "addDecorations",
      context
    );

    if (addDecorations) {
      entries.push({
        name: extension.name,
        addDecorations: () => addDecorations.call(context, context)
      });
    }
  }

  return entries;
}

/**
 * Collects keyboard shortcuts in extension execution order.
 *
 * @param extensions - Extensions that contribute keyboard shortcuts.
 * @returns Keyboard shortcut entries ordered by keyboard execution priority.
 */
function createExtensionKeyboardShortcuts(
  extensions: readonly QuireAnyExtension[]
): readonly QuireKeyboardShortcutEntry[] {
  const entries: QuireKeyboardShortcutEntry[] = [];

  for (const extension of sortExtensionsByKeyboardShortcutPriority(extensions)) {
    for (const [shortcut, command] of Object.entries(extension.keyboardShortcuts ?? {})) {
      entries.push({ extension, shortcut, command });
    }
  }

  return entries;
}

/**
 * Collects mounted view adapters in extension execution order.
 *
 * @param extensions - Extensions that contribute mounted view adapters.
 * @returns View adapters ordered by extension priority and declaration order.
 */
function createExtensionViewAdapters(
  extensions: readonly QuireAnyExtension[]
): readonly QuireViewAdapter[] {
  const viewAdapters: QuireViewAdapter[] = [];

  for (const extension of extensions) {
    viewAdapters.push(...(extension.viewAdapters ?? []));
  }

  return viewAdapters;
}

/**
 * Collects qkView event handlers in extension execution order.
 *
 * @param extensions - Extensions that contribute qkView event handlers.
 * @returns qkView event handlers keyed by handler id.
 */
function createExtensionViewEventHandlers(
  extensions: readonly QuireAnyExtension[]
): QuireExtensionViewEventHandlerMap {
  const viewEventHandlers: Record<string, QuireExtensionViewEventHandlerMap[string]> = {};

  for (const extension of extensions) {
    for (const [handlerId, handler] of Object.entries(extension.viewEventHandlers ?? {})) {
      if (!Object.prototype.hasOwnProperty.call(viewEventHandlers, handlerId)) {
        viewEventHandlers[handlerId] = handler;
      }
    }
  }

  return viewEventHandlers;
}

/**
 * Collects layout-provider registrations and annotates their extension owner.
 *
 * @param extensions - Extensions that may contribute layout providers.
 * @returns Provider entries ordered by extension priority and declaration order.
 */
function createExtensionLayoutProviders(
  extensions: readonly QuireAnyExtension[]
): readonly QuireLayoutProviderEntry[] {
  const entries: QuireLayoutProviderEntry[] = [];

  for (const extension of extensions) {
    entries.push(...(extension.layoutProviders ?? []));
  }

  return entries;
}

/**
 * Collects structured-range selection adapters from installed extensions.
 *
 * @param extensions - Extensions that may contribute selection adapters.
 * @returns Adapter entries in extension and declaration order.
 */
function createExtensionSelectionAdapters(
  extensions: readonly QuireAnyExtension[]
): readonly QuireSelectionAdapterEntry[] {
  const entries: QuireSelectionAdapterEntry[] = [];

  for (const extension of extensions) {
    entries.push(...(extension.selectionAdapters ?? []));
  }

  return entries;
}

/**
 * Collects renderer-neutral node view constructors in extension execution order.
 *
 * @param extensions - Extensions that may contribute node view renderers.
 * @param attributes - Resolved extension attributes for rendered attributes.
 * @param schema - Schema used to resolve node type objects.
 * @param editor - Editor instance exposed to node view factories.
 * @returns Node view constructors keyed by node type name.
 */
function createExtensionNodeViews(
  extensions: readonly QuireAnyExtension[],
  attributes: readonly QuireExtensionAttribute[],
  schema: Schema,
  editor: QuireEditor
): QuireNodeViewMap {
  const nodeViews: Record<string, QuireNodeViewMap[string]> = {};

  for (const extension of extensions) {
    if (extension.kind !== "node") {
      continue;
    }

    const context = {
      name: extension.name,
      options: extension.options,
      storage: extension.storage,
      editor,
      extensions,
      type: getNodeType(extension.name, schema)
    };
    const addNodeView = getExtensionField<
      (() => QuireNodeViewRenderer | null | undefined) | undefined
    >(extension, "addNodeView", context);
    const renderer = addNodeView?.();

    if (!renderer) {
      continue;
    }

    nodeViews[extension.name] = (
      node,
      view,
      getPos,
      decorations,
      innerDecorations
    ) =>
      renderer({
        node,
        view,
        getPos,
        decorations,
        innerDecorations,
        editor,
        extension,
        HTMLAttributes: getRenderedAttributes(node, attributes)
      });
  }

  return nodeViews;
}

/**
 * Collects renderer-neutral mark view constructors in extension execution order.
 *
 * @param extensions - Extensions that may contribute mark view renderers.
 * @param attributes - Resolved extension attributes for rendered attributes.
 * @param schema - Schema used to resolve mark type objects.
 * @param editor - Editor instance exposed to mark view factories.
 * @returns Mark view constructors keyed by mark type name.
 */
function createExtensionMarkViews(
  extensions: readonly QuireAnyExtension[],
  attributes: readonly QuireExtensionAttribute[],
  schema: Schema,
  editor: QuireEditor
): QuireMarkViewMap {
  const markViews: Record<string, QuireMarkViewMap[string]> = {};

  for (const extension of extensions) {
    if (extension.kind !== "mark") {
      continue;
    }

    const context = {
      name: extension.name,
      options: extension.options,
      storage: extension.storage,
      editor,
      extensions,
      type: getMarkType(extension.name, schema)
    };
    const addMarkView = getExtensionField<
      (() => QuireMarkViewRenderer | null | undefined) | undefined
    >(extension, "addMarkView", context);
    const renderer = addMarkView?.();

    if (!renderer) {
      continue;
    }

    markViews[extension.name] = (mark, view, inline) =>
      renderer({
        mark,
        view,
        inline,
        editor,
        extension,
        HTMLAttributes: getRenderedAttributes(mark, attributes),
        updateAttributes: (attrs) => {
          editor.commands.updateAttributes(extension.name, attrs);
        }
      });
  }

  return markViews;
}

/**
 * Creates diagnostics for duplicate extension names, command names, and top nodes.
 *
 * @param extensions - Extensions to inspect for duplicate names, commands,
 * and top nodes.
 * @returns Diagnostics collected while resolving the extension set.
 */
function createExtensionDiagnostics(
  extensions: readonly QuireAnyExtension[]
): readonly QuireBuiltInExtensionDiagnostic[] {
  const diagnostics: QuireBuiltInExtensionDiagnostic[] = [];
  const extensionNames = new Set<string>();
  const commandOwners = new Map<string, QuireAnyExtension>();
  const reportedCommandNames = new Set<string>();
  const layoutProviderResult =
    createQuireLayoutProviderRegistrationRegistry(
      extensions.flatMap((extension) => extension.layoutProviders ?? [])
    );
  const documentProfileResult = createQuireDocumentProfileRegistry(
    extensions.flatMap((extension) => extension.documentProfiles ?? [])
  );
  const selectionAdapterResult = createQuireSelectionAdapterRegistry(
    extensions.flatMap((extension) => extension.selectionAdapters ?? [])
  );
  let topNodeOwner: QuireAnyExtension | null = null;

  for (const extension of extensions) {
    if (extensionNames.has(extension.name)) {
      diagnostics.push({
        code: "duplicate-extension-name",
        extensionName: extension.name,
        message: `Extension "${extension.name}" is installed more than once.`,
        severity: "error"
      });
    } else {
      extensionNames.add(extension.name);
    }

    for (const commandName of Object.keys(extension.commands ?? {})) {
      const owner = commandOwners.get(commandName);
      if (!owner) {
        commandOwners.set(commandName, extension);
        continue;
      }

      if (!reportedCommandNames.has(commandName)) {
        diagnostics.push({
          code: "duplicate-command-name",
          commandName,
          extensionName: owner.name,
          message: `Command "${commandName}" is provided by multiple extensions; "${extension.name}" overwrites "${owner.name}".`,
          severity: "warning"
        });
        reportedCommandNames.add(commandName);
      }
    }

    if (extension.topNodeName) {
      if (!topNodeOwner) {
        topNodeOwner = extension;
      } else {
        diagnostics.push({
          code: "duplicate-top-node",
          extensionName: extension.name,
          message: `Extension "${extension.name}" declares top node "${extension.topNodeName}" after "${topNodeOwner.name}" already declared "${topNodeOwner.topNodeName}".`,
          severity: "error"
        });
      }
    }
  }

  if (!layoutProviderResult.valid) {
    for (const gap of layoutProviderResult.gaps) {
      if (gap.code === "duplicate-layout-provider-id") {
        diagnostics.push({
          code: gap.code,
          extensionName: gap.entries[0]?.extensionName ?? "",
          providerId: gap.id,
          message: `Layout provider "${gap.id}" is registered by multiple extensions.`,
          severity: "error"
        });
      } else {
        diagnostics.push({
          code: gap.code,
          extensionName: gap.entries[0]?.extensionName ?? "",
          nodeType: gap.nodeType,
          message: `Node type "${gap.nodeType}" has multiple layout providers.`,
          severity: "error"
        });
      }
    }
  }

  if (!documentProfileResult.valid) {
    for (const gap of documentProfileResult.gaps) {
      const extensionName = gap.entries[0]?.extensionName ?? "";
      diagnostics.push(gap.code === "duplicate-document-profile-id"
        ? {
            code: gap.code,
            extensionName,
            profileId: gap.id,
            message: `Document profile "${gap.id}" is registered by multiple extensions.`,
            severity: "error"
          }
        : {
            code: gap.code,
            extensionName,
            facet: gap.facet,
            message: `Document profile facet "${gap.facet}" is supplied by multiple profiles.`,
            severity: "error"
          });
    }
  }

  if (!selectionAdapterResult.valid) {
    for (const gap of selectionAdapterResult.gaps) {
      if (gap.code === "duplicate-selection-adapter-id") {
        diagnostics.push({
          code: gap.code,
          extensionName: gap.entries[0]?.extensionName ?? "",
          adapterId: gap.id,
          message: `Selection adapter "${gap.id}" is registered by multiple extensions.`,
          severity: "error"
        });
      } else {
        diagnostics.push({
          code: gap.code,
          extensionName: gap.entries[0]?.extensionName ?? "",
          nodeType: gap.nodeType,
          priority: gap.priority,
          message: `Node type "${gap.nodeType}" has multiple selection adapters at priority ${gap.priority}.`,
          severity: "error"
        });
      }
    }
  }

  return diagnostics;
}
