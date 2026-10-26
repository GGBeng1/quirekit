import { getDebugJSON, type QuireEditor } from "@quirekit/core";
import type {
  QuireDevtoolsRenderSummary,
  QuireDevtoolsSchemaSummary,
  QuireDevtoolsSelectionSummary,
  QuireDevtoolsSnapshot,
  QuireDevtoolsSnapshotOptions
} from "./types";

/**
 * Creates a snapshot for the currently attached editor.
 *
 * @param editor - Attached editor, or undefined when detached.
 * @param latestRender - Latest mounted render summary.
 * @param options - Snapshot detail options.
 * @returns Serializable devtools snapshot.
 */
export function createQuireDevtoolsSnapshot(
  editor: QuireEditor | undefined,
  latestRender: QuireDevtoolsRenderSummary | undefined,
  options: QuireDevtoolsSnapshotOptions = {}
): QuireDevtoolsSnapshot {
  if (!editor || editor.isDestroyed) {
    return createDetachedSnapshot(latestRender);
  }

  const snapshot: QuireDevtoolsSnapshot = {
    attached: true,
    docSize: editor.state.doc.nodeSize,
    textLength: editor.getText().length,
    selection: summarizeSelection(editor),
    schema: summarizeSchema(editor),
    extensionNames: editor.extensions.map((extension) => extension.name),
    pluginKeys: editor.state.pm.plugins.map((plugin) => plugin.key),
    storageKeys: Object.keys(editor.storage),
    ...(options.includeJSON ? { document: editor.getJSON() } : {}),
    ...(options.includeDebugJSON
      ? { debugDocument: getDebugJSON(editor.state.doc) }
      : {}),
    ...(latestRender ? { latestRender } : {})
  };

  return snapshot;
}

/**
 * Creates an empty snapshot used when no editor is attached.
 *
 * @param latestRender - Latest mounted render summary.
 * @returns Detached devtools snapshot.
 */
function createDetachedSnapshot(
  latestRender: QuireDevtoolsRenderSummary | undefined
): QuireDevtoolsSnapshot {
  return {
    attached: false,
    docSize: 0,
    textLength: 0,
    extensionNames: [],
    pluginKeys: [],
    storageKeys: [],
    ...(latestRender ? { latestRender } : {})
  };
}

/**
 * Summarizes the current editor selection.
 *
 * @param editor - Editor whose selection should be summarized.
 * @returns Serializable selection summary.
 */
function summarizeSelection(editor: QuireEditor): QuireDevtoolsSelectionSummary {
  const { selection } = editor.state.pm;

  return {
    from: selection.from,
    to: selection.to,
    empty: selection.empty,
    anchor: selection.anchor,
    head: selection.head
  };
}

/**
 * Summarizes the current editor schema.
 *
 * @param editor - Editor whose schema should be summarized.
 * @returns Serializable schema summary.
 */
function summarizeSchema(editor: QuireEditor): QuireDevtoolsSchemaSummary {
  return {
    topNode: editor.schema.topNodeType.name,
    nodes: Object.keys(editor.schema.nodes),
    marks: Object.keys(editor.schema.marks)
  };
}
