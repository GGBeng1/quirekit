import { ClipboardTextSerializer } from "./extensions/clipboardTextSerializer";
import { Commands } from "./extensions/commands";
import { Delete } from "./extensions/delete";
import { Drop } from "./extensions/drop";
import { Editable } from "./extensions/editable";
import { FocusEvents } from "./extensions/focusEvents";
import { Keymap } from "./extensions/keymap";
import { Paste } from "./extensions/paste";
import { Tabindex } from "./extensions/tabindex";
import { TextDirection } from "./extensions/textDirection";
import type {
  EditorOptions,
  QuireAnyExtension,
  QuireEditorEvents,
  QuireEditorOptions
} from "./types";

/**
 * Normalizes partial QuireKit options into Tiptap's complete public option map.
 *
 * @param options - New option values supplied by construction or setOptions().
 * @param base - Existing canonical options used as merge defaults.
 * @returns Complete canonical editor options.
 */
export function createCanonicalEditorOptions(
  options: Partial<QuireEditorOptions>,
  base?: EditorOptions
): EditorOptions {
  const defaults: EditorOptions = base ?? {
    element: null,
    content: "",
    extensions: [],
    injectCSS: true,
    injectNonce: undefined,
    autofocus: false,
    editable: true,
    textDirection: undefined,
    editorProps: {},
    parseOptions: {},
    coreExtensionOptions: {},
    enableInputRules: true,
    enablePasteRules: true,
    enableCoreExtensions: true,
    enableContentCheck: false,
    emitContentError: false,
    onBeforeCreate: () => undefined,
    onCreate: () => undefined,
    onMount: () => undefined,
    onUnmount: () => undefined,
    onContentError: ({ error }) => {
      throw error;
    },
    onUpdate: () => undefined,
    onSelectionUpdate: () => undefined,
    onTransaction: () => undefined,
    onFocus: () => undefined,
    onBlur: () => undefined,
    onDestroy: () => undefined,
    onPaste: () => undefined,
    onDrop: () => undefined,
    onDelete: () => undefined,
    enableExtensionDispatchTransaction: true
  };

  return {
    element: options.element === undefined ? defaults.element : options.element,
    content: options.content === undefined
      ? defaults.content
      : options.content as EditorOptions["content"],
    extensions: options.extensions === undefined
      ? defaults.extensions
      : [...options.extensions],
    injectCSS: options.injectCSS ?? defaults.injectCSS,
    injectNonce: options.injectNonce ?? defaults.injectNonce,
    autofocus: options.autofocus ?? defaults.autofocus,
    editable: options.editable ?? defaults.editable,
    textDirection: options.textDirection ?? defaults.textDirection,
    editorProps: options.editorProps ?? defaults.editorProps,
    parseOptions: options.parseOptions ?? defaults.parseOptions,
    coreExtensionOptions: options.coreExtensionOptions ?? defaults.coreExtensionOptions,
    enableInputRules: normalizeRuleOption(
      options.enableInputRules,
      defaults.enableInputRules
    ),
    enablePasteRules: normalizeRuleOption(
      options.enablePasteRules,
      defaults.enablePasteRules
    ),
    enableCoreExtensions: options.enableCoreExtensions ?? defaults.enableCoreExtensions,
    enableContentCheck: options.enableContentCheck ?? defaults.enableContentCheck,
    emitContentError: options.emitContentError ?? defaults.emitContentError,
    onBeforeCreate: options.onBeforeCreate ?? defaults.onBeforeCreate,
    onCreate: options.onCreate ?? defaults.onCreate,
    onMount: options.onMount ?? defaults.onMount,
    onUnmount: options.onUnmount ?? defaults.onUnmount,
    onContentError: options.onContentError ?? defaults.onContentError,
    onUpdate: options.onUpdate
      ? (payload) => options.onUpdate?.(
          payload as QuireEditorEvents["update"]
        )
      : defaults.onUpdate,
    onSelectionUpdate: options.onSelectionUpdate
      ? (payload) => options.onSelectionUpdate?.(
          payload as QuireEditorEvents["selectionUpdate"]
        )
      : defaults.onSelectionUpdate,
    onTransaction: options.onTransaction ?? defaults.onTransaction,
    onFocus: options.onFocus ?? defaults.onFocus,
    onBlur: options.onBlur ?? defaults.onBlur,
    onDestroy: options.onDestroy ?? defaults.onDestroy,
    onPaste: options.onPaste ?? defaults.onPaste,
    onDrop: options.onDrop ?? defaults.onDrop,
    onDelete: options.onDelete ?? defaults.onDelete,
    enableExtensionDispatchTransaction:
      options.enableExtensionDispatchTransaction ??
      defaults.enableExtensionDispatchTransaction
  };
}

/**
 * Creates and filters built-in extensions from Tiptap-compatible editor options.
 *
 * @param options - Editor options that configure built-in extensions.
 * @returns Enabled built-in extensions in canonical order.
 */
export function createCoreExtensions(
  options: QuireEditorOptions
): readonly QuireAnyExtension[] {
  if (options.enableCoreExtensions === false) {
    return [];
  }

  const coreOptions = options.coreExtensionOptions;
  const deleteOptions = coreOptions?.delete;
  const tabindexOptions = coreOptions?.tabindex;
  const extensions: readonly QuireAnyExtension[] = [
    Commands,
    Editable,
    ClipboardTextSerializer.configure(
      coreOptions?.clipboardTextSerializer ?? {}
    ),
    FocusEvents,
    Keymap,
    Paste,
    Drop,
    Delete.configure({
      ...(deleteOptions?.async === undefined
        ? {}
        : { async: deleteOptions.async }),
      ...(deleteOptions?.filterTransaction === undefined
        ? {}
        : { filterTransaction: deleteOptions.filterTransaction })
    }),
    Tabindex.configure(
      tabindexOptions?.value === undefined
        ? {}
        : { value: tabindexOptions.value }
    ),
    TextDirection.configure({ direction: options.textDirection })
  ];
  const enabledCoreExtensions = options.enableCoreExtensions;

  if (typeof enabledCoreExtensions !== "object") {
    return extensions;
  }

  return extensions.filter((extension) =>
    enabledCoreExtensions[extension.name as keyof typeof enabledCoreExtensions] !== false
  );
}

/**
 * Converts immutable QuireKit rule lists to Tiptap's mutable public option shape.
 *
 * @param value - New rule option, when provided.
 * @param fallback - Existing canonical rule option.
 * @returns Boolean rule flag or mutable extension selector list.
 */
function normalizeRuleOption(
  value: QuireEditorOptions["enableInputRules"],
  fallback: EditorOptions["enableInputRules"]
): EditorOptions["enableInputRules"] {
  if (value === undefined) {
    return fallback;
  }

  return typeof value === "boolean" ? value : [...value];
}
