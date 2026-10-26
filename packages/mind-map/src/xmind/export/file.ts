import type { MindMapDocument } from "../../model/types";
import type { XmindFileExport } from "../types";
import { exportXmindContent } from "./content";

/** @param input - One portable document or ordered workbook documents. @returns Modern .xmind archive without filesystem access. */
export async function exportXmindFile(input: MindMapDocument | readonly MindMapDocument[]): Promise<XmindFileExport> {
  const projected = exportXmindContent(input), { zipSync, strToU8 } = await import("fflate");
  const files: Record<string, Uint8Array> = { "content.json": strToU8(JSON.stringify(projected.content)), "metadata.json": strToU8("{}") };
  for (const [name, bytes] of projected.resources) files[name] = bytes;
  files["manifest.json"] = strToU8(JSON.stringify({ "file-entries": Object.fromEntries(Object.keys(files).map(name => [name, {}])) }));
  return Object.freeze({ bytes: zipSync(files, { level: 6 }), diagnostics: projected.diagnostics });
}
