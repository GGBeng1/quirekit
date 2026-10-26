const limit = 20 * 1024 * 1024;
/** @param url - Application-selected asset, never inferred from SVG. @param signal - Task lifetime. @returns Complete font bytes bounded while streaming, with no partial cache. */
export async function loadFlowchartPdfFont(url: string, signal: AbortSignal): Promise<Uint8Array<ArrayBuffer>> {
  signal.throwIfAborted();
  const response = await fetch(url, { signal }); if (!response.ok) throw new Error("PDF 字体加载失败");
  if (Number(response.headers.get("content-length")) > limit) throw new RangeError("PDF 字体超过资源预算");
  const reader = response.body?.getReader();
  if (!reader) { const result = new Uint8Array(await response.arrayBuffer()); signal.throwIfAborted(); if (result.byteLength > limit) throw new RangeError("PDF 字体超过资源预算"); return result; }
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); signal.throwIfAborted(); if (done) break;
      length += value.byteLength; if (length > limit) throw new RangeError("PDF 字体超过资源预算"); chunks.push(value);
    }
  } finally { await reader.cancel(); reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}
