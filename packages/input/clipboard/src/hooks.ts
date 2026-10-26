import type {
  QuireClipboardResource,
  QuireClipboardResourcePasteContribution,
  QuireEditor,
  QuireMountedEditorView
} from "@quirekit/core";
import type { ResolvedPos, Slice } from "@quirekit/pm";

/**
 * Runs extension-owned copy transforms before serializing clipboard data.
 *
 * @param slice - Slice selected for copy or cut.
 * @param view - Mounted view that owns clipboard prop lookup.
 * @returns Slice after copy transforms.
 */
export function transformQuireCopiedSlice(
  slice: Slice,
  view: QuireMountedEditorView
): Slice {
  let transformedSlice = slice;

  view.someProp("transformCopied", (transform) => {
    const transformCopied = transform as (slice: Slice, view?: unknown) => Slice;
    transformedSlice = transformCopied(transformedSlice, view);

    return false;
  });

  return transformedSlice;
}

/**
 * Collects extension-owned resources referenced by one transformed copied slice.
 *
 * @param slice - Slice after copied-content transforms have run.
 * @param view - Mounted view that owns clipboard prop lookup.
 * @returns Resource candidates in extension resolution order.
 */
export function collectQuireClipboardResources(
  slice: Slice,
  view: QuireMountedEditorView
): readonly QuireClipboardResource[] {
  const resources: QuireClipboardResource[] = [];

  view.someProp("quireClipboardResources", (collect) => {
    resources.push(...collect(slice, view));
    return false;
  });

  return resources;
}

/** Result of composing every compatible feature-owned resource importer. */
export interface QuireClipboardResourcePastePreparation {
  /** Slice after every owner has applied target-local identity remapping. */
  readonly slice: Slice;
  /** Metadata mutations applied after the final slice replacement. */
  readonly contributions: readonly QuireClipboardResourcePasteContribution[];
}

/**
 * Composes feature-owned resource importers without letting one owner swallow
 * another owner's payload.
 *
 * @param editor - Editor receiving the private clipboard transfer.
 * @param slice - Parsed and transformed clipboard slice.
 * @param resources - Validated resources carried beside the slice.
 * @param view - Mounted view that owns clipboard prop lookup.
 * @returns Prepared slice and mutations, or null when no owner handled data.
 */
export function prepareQuireClipboardResourcePaste(
  editor: QuireEditor,
  slice: Slice,
  resources: readonly QuireClipboardResource[],
  view: QuireMountedEditorView
): QuireClipboardResourcePastePreparation | null {
  let preparedSlice = slice;
  const contributions: QuireClipboardResourcePasteContribution[] = [];

  view.someProp("quireClipboardResourcePaste", (prepare) => {
    const contribution = prepare({
      editor,
      slice: preparedSlice,
      resources
    });
    if (contribution !== null) {
      preparedSlice = contribution.slice;
      contributions.push(contribution);
    }
    return false;
  });

  return contributions.length === 0
    ? null
    : { slice: preparedSlice, contributions };
}

/**
 * Runs extension-owned clipboard text serialization.
 *
 * @param slice - Slice being serialized.
 * @param view - Mounted view that owns clipboard prop lookup.
 * @returns Serialized text, or null when no serializer handled the slice.
 */
export function serializeQuireClipboardText(
  slice: Slice,
  view: QuireMountedEditorView
): string | null {
  return (
    view.someProp("clipboardTextSerializer", (serialize) => {
      const serializeText = serialize as (slice?: Slice, view?: unknown) => string;

      return serializeText(slice, view);
    }) ?? null
  );
}

/**
 * Runs extension-owned pasted text transforms before text parsing.
 *
 * @param text - Raw pasted text.
 * @param editor - Editor whose selection gives code/plain-text context.
 * @param view - Mounted view that owns clipboard prop lookup.
 * @param plainText - Whether the paste is explicitly plain text.
 * @returns Text after pasted text transforms.
 */
export function transformQuireClipboardText(
  text: string,
  editor: QuireEditor,
  view: QuireMountedEditorView,
  plainText: boolean
): string {
  let transformedText = text;
  const inCode = editor.state.pm.selection.$from.parent.type.spec.code === true;

  view.someProp("transformPastedText", (transform) => {
    const transformText = transform as (
      text: string,
      plainText: boolean,
      view?: unknown
    ) => string;
    transformedText = transformText(transformedText, inCode || plainText, view);

    return false;
  });

  return transformedText;
}

/**
 * Parses transformed plain text through extension-owned text parsers.
 *
 * @param text - Transformed pasted text.
 * @param view - Mounted view that owns clipboard prop lookup.
 * @param context - Selection context used by PM text parsers.
 * @param plainText - Whether the paste is explicitly plain text.
 * @returns Parsed slice, or null when no parser handled the text.
 */
export function parseQuireClipboardTextWithProps(
  text: string,
  view: QuireMountedEditorView,
  context: ResolvedPos,
  plainText: boolean
): Slice | null {
  return (
    view.someProp("clipboardTextParser", (parse) => {
      const parseText = parse as (
        text: string,
        context: ResolvedPos,
        plainText: boolean,
        view?: unknown
      ) => Slice | null;

      return parseText(text, context, plainText, view);
    }) ?? null
  );
}

/**
 * Runs extension-owned paste transforms after parsing clipboard content.
 *
 * @param slice - Parsed pasted slice.
 * @param view - Mounted view that owns clipboard prop lookup.
 * @param plainText - Whether the paste came from a plain text path.
 * @returns Slice after paste transforms.
 */
export function transformQuirePastedSlice(
  slice: Slice,
  view: QuireMountedEditorView,
  plainText: boolean
): Slice {
  let transformedSlice = slice;

  view.someProp("transformPasted", (transform) => {
    const transformPasted = transform as (
      slice: Slice,
      view?: unknown,
      plainText?: boolean
    ) => Slice;
    transformedSlice = transformPasted(transformedSlice, view, plainText);

    return false;
  });

  return transformedSlice;
}

/**
 * Resolves the mounted view that owns clipboard hook dispatch.
 *
 * @param editor - Editor whose primary view is used as a fallback.
 * @param view - Optional mounted view that initiated the clipboard action.
 * @returns Mounted view used for PM-compatible clipboard props.
 */
export function resolveQuireClipboardView(
  editor: QuireEditor,
  view?: QuireMountedEditorView
): QuireMountedEditorView {
  return view ?? editor.view;
}
