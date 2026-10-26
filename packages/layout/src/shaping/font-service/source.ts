import type { QuireShaperFontSource } from "../types";
import type {
  QuireFontServiceSource,
  QuireFontServiceSourceData,
  QuireFontServiceSourceDataLoader,
  QuireFontServiceSourceDataValue
} from "./types";

/**
 * Resolves a host font-service source into backend-ready font bytes.
 *
 * @param source - Host-configured font source metadata.
 * @param loadSourceData - Optional host byte loader for sources without data.
 * @returns Backend-ready font source with an isolated `ArrayBuffer`.
 */
export async function resolveQuireFontServiceSource(
  source: QuireFontServiceSource,
  loadSourceData?: QuireFontServiceSourceDataLoader
): Promise<QuireShaperFontSource> {
  const dataInput = source.data ?? loadSourceData?.(source);

  if (dataInput === undefined) {
    throw new Error(`Canvas font source "${source.id}" is missing font data`);
  }

  const { data: _data, ...metadata } = source;

  return {
    ...metadata,
    data: await resolveQuireFontServiceSourceData(dataInput)
  };
}

/**
 * Resolves eager, promised, or lazy font bytes into an isolated `ArrayBuffer`.
 *
 * @param data - Host-provided font data input.
 * @returns Copied font bytes suitable for backend ownership.
 */
export async function resolveQuireFontServiceSourceData(
  data: QuireFontServiceSourceData
): Promise<ArrayBuffer> {
  const resolved = typeof data === "function" ? await data() : await data;

  return copyQuireFontServiceSourceData(resolved);
}

/**
 * Copies host font bytes into a standalone `ArrayBuffer`.
 *
 * @param data - Host-provided raw font bytes.
 * @returns Copied font bytes.
 */
function copyQuireFontServiceSourceData(
  data: QuireFontServiceSourceDataValue
): ArrayBuffer {
  if (data instanceof ArrayBuffer) {
    return data.slice(0);
  }

  if (ArrayBuffer.isView(data)) {
    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);

    return copy.buffer;
  }

  throw new Error("Canvas font source data must be an ArrayBuffer or ArrayBufferView");
}
