import { createFlowchartEmbed } from "@quirekit/flowchart";
import { createMindMapEmbed } from "@quirekit/mind-map";
import { createWhiteboardDocument } from "@quirekit/whiteboard";
import { createDataView, dataViewMarkdown, serializeDataView } from "@quirekit/data-view";
import { flowchartMarkdown } from "@quirekit/msfe-flowchart";
import { mindMapMarkdown } from "@quirekit/msfe-mind-map";
import { whiteboardMarkdown } from "@quirekit/msfe-whiteboard";
import type { MsfeEditor } from "@quirekit/msfe-core";
import { openMdFlowchartDialog } from "../../flowchart/open";
import { openMdMindMapDialog } from "../../mind-map/open";
import { openMdWhiteboardDialog } from "../../whiteboard/open";
import { openMdDataView } from "../../data-view/open";
import type { MdBlockInsertionWriter } from "./types";
import { v4 as uuidv4 } from "uuid";

/** @param serialize - Feature-owned validated serializer. @param writer - Captured source destination. @returns Validation or source conflicts without leaking a partial fence. */
function save(serialize: () => string, writer: MdBlockInsertionWriter): "saved" | "conflict" {
  try { return writer.commit(serialize()) ? "saved" : "conflict"; }
  catch { return "conflict"; }
}

/** @param value - Installed native workspace family. @param editor - Owning editor. @param writer - Shared source intent. @param close - Release the host UI. @returns Disposable task, or null for other families. */
export function openBlockWorkspace(value: string, editor: MsfeEditor, writer: MdBlockInsertionWriter, close: () => void): { close(): void } | null {
  // Codec owners validate complete source. Only the commit destination changes;
  // cancellation never writes a placeholder fence into the document.
  if (value === "flowchart") {
    const document = createFlowchartEmbed(uuidv4());
    return openMdFlowchartDialog({ document, release: close,
      commit: next => next.id === document.id && next.document.revision === document.document.revision + 1 ? save(() => flowchartMarkdown(next), writer) : "conflict",
    }, editor);
  }
  if (value === "mindMap") {
    const document = createMindMapEmbed(uuidv4());
    return openMdMindMapDialog({ document, release: close,
      commit: next => next.id === document.id && next.document.revision === document.document.revision + 1 ? save(() => mindMapMarkdown(next), writer) : "conflict",
    }, editor);
  }
  if (value === "whiteboard") {
    const document = createWhiteboardDocument(uuidv4());
    return openMdWhiteboardDialog({ document, release: close,
      commit: next => next.id === document.id && next.revision === document.revision + 1 ? save(() => whiteboardMarkdown(next), writer) : "conflict",
    }, editor);
  }
  if (value === "dataView") {
    const value = createDataView(uuidv4()), base = serializeDataView(value);
    return openMdDataView({ value, release: close,
      commit: next => ({ accepted: next.base === base && next.value.id === value.id && save(() => dataViewMarkdown(next.value), writer) === "saved" }),
    }, editor);
  }
  return null;
}
