import type { QuireEditor } from "../Editor";
import type { QuireAnyExtension, QuireEditorOptions } from "../types";
import type { QuireEditorReadOnlySnapshotOptions } from "./types";

/**
 * Copies presentation declarations without replaying source extension lifecycles.
 * @param source - Live editor whose immutable presentation contracts are reusable.
 * @param options - Snapshot document and independently constructed view adapters.
 * @returns Fresh constructor options, excluding host and collaboration authorities.
 */
export function createReadOnlySnapshotOptions(
  source: QuireEditor,
  options: QuireEditorReadOnlySnapshotOptions
): QuireEditorOptions {
  const document = options.document ?? source.state.doc;
  if (document.type.schema !== source.schema) {
    throw new RangeError("A read-only snapshot must use the source editor schema.");
  }
  // Preserve style precedence, but never keep an extension's config, parent,
  // storage, commands or hooks: those may close over a live provider/session.
  const extensions = source.extensions.map((extension, index) => (
    presentationExtension(`snapshot-style-${index}`, {
      canvasStyle: extension.canvasStyle,
      canvasTextStyle: extension.canvasTextStyle
    })
  ));
  extensions.push(presentationExtension("snapshot-presentation", {
    layoutProviders: source.extensionManager.layoutProviders,
    documentProfiles: source.extensionManager.documentProfiles,
    selectionAdapters: source.extensionManager.selectionAdapters,
    viewAdapters: options.viewAdapters ?? []
  }));
  return { schema: source.schema, content: document, editable: false, extensions };
}

/**
 * Materializes an allowlisted presentation contribution with fresh local storage.
 * @param name - Snapshot-local diagnostic identity.
 * @param fields - Pure rendering and selection declarations.
 * @returns Behavior-free normalized extension.
 */
function presentationExtension(
  name: string,
  fields: Pick<QuireAnyExtension,
    "canvasStyle" | "canvasTextStyle" | "layoutProviders" | "documentProfiles"
    | "selectionAdapters" | "viewAdapters">
): QuireAnyExtension {
  return {
    name, kind: "extension", type: "extension", config: {}, options: {}, storage: {},
    nodes: {}, marks: {}, attributes: [], inputRules: [], pasteRules: [], plugins: [],
    ...fields,
    /** @returns A fresh copy of the same immutable presentation declarations. */
    configure() { return presentationExtension(name, fields); }
  };
}
