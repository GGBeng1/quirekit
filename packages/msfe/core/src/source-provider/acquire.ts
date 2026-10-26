import type { CompiledExtensions } from "../extensions/types";
import type { MsfeEditorOptions } from "../editor/types";
import type { MsfeSourceLease } from "./types";

/** @param compiled - Validated feature order. @param options - Host initialization. @returns A validated lease, or the standalone default. */
export function acquireSource(compiled: CompiledExtensions, options: MsfeEditorOptions): MsfeSourceLease | undefined {
  if (!compiled.sourceProvider) return undefined;
  if (options.markdown !== undefined) throw new Error("source-provider-markdown");
  for (const feature of compiled.ordered) if (feature.states?.some(slot => slot.history === "effects") || feature.history === "effects") {
    throw new Error(`unsupported-history-effect: ${feature.id}`);
  }
  const lease = compiled.sourceProvider.acquire();
  try {
    if (!lease.documentId || (options.documentId !== undefined && options.documentId !== lease.documentId)) throw new Error("source-provider-document");
    if (typeof lease.source.text !== "string" || lease.source.text.includes("\r")
      || typeof lease.source.bom !== "boolean" || !["\n", "\r\n"].includes(lease.source.lineEnding)) throw new Error("source-provider-format");
    return lease;
  } catch (error) { lease.release(); throw error; }
}
