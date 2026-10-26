import { readWhiteboardDocument, type WhiteboardDocument } from "@quirekit/whiteboard";
import type { WhiteboardPreviewUpload } from "../types";

/** @param dataUrl - Validated PNG data URL. @returns The decoded image. */
function pngBlob(dataUrl: string): Blob {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: "image/png" });
}

/**
 * Moves an inline preview to host storage before the synchronous commit. A failed upload keeps the
 * inline preview so the edit is never lost; cancellation still rejects.
 * @param embed - Prepared revision whose preview is inline.
 * @param upload - Host storage; omitted keeps the inline form.
 * @param signal - Dialog lifetime.
 * @returns The revision with a linked preview, or the original when nothing was uploaded.
 */
export async function storeWhiteboardPreview(embed: WhiteboardDocument, upload: WhiteboardPreviewUpload | undefined, signal: AbortSignal): Promise<WhiteboardDocument> {
  const preview = embed.preview;
  if (!upload || !preview?.dataUrl) return embed;
  let url: string;
  try {
    url = await upload(pngBlob(preview.dataUrl), { signal, name: embed.title });
  } catch (error) {
    if (signal.aborted) throw error;
    return embed;
  }
  return readWhiteboardDocument({ ...embed, version: 2, preview: { url, width: preview.width, height: preview.height } });
}
