import {
  init as initializeHarfBuzzSubset,
  subset as harfBuzzSubset
} from "hb-subset-wasm";

let runtimeInitialization: Promise<void> | undefined;

/**
 * Subsets one standalone face through the pinned HarfBuzz WebAssembly runtime.
 *
 * @param source - Complete standalone sfnt bytes.
 * @param codePoints - Normalized Unicode scalars to retain.
 * @param preserveHinting - Whether TrueType hinting programs remain.
 * @param preserveKerning - Whether kerning positioning tables remain.
 * @returns Source-flavor-preserving subset bytes.
 */
export async function subsetWithHarfBuzz(
  source: Uint8Array,
  codePoints: readonly number[],
  preserveHinting: boolean,
  preserveKerning: boolean
): Promise<Uint8Array> {
  await ensureHarfBuzzSubsetRuntime();
  return harfBuzzSubset(source, {
    unicodes: [...codePoints],
    noHinting: !preserveHinting,
    dropTables: [
      ...(preserveKerning ? [] : ["GPOS", "kern", "kerx"]),
      ...(preserveHinting ? [] : ["gasp"])
    ]
  });
}

/**
 * Initializes the shared runtime once while allowing a failed load to retry.
 *
 * @returns Completion of WebAssembly initialization.
 */
async function ensureHarfBuzzSubsetRuntime(): Promise<void> {
  runtimeInitialization ??= initializeRuntime().catch((error: unknown) => {
    runtimeInitialization = undefined;
    throw error;
  });
  return runtimeInitialization;
}

/**
 * Loads the package-owned WebAssembly asset in browser or Node runtimes.
 *
 * Source/HMR modules resolve the pinned dependency asset. The published bundle
 * resolves the copy emitted beside `dist/index.mjs`.
 *
 * @returns Completion of third-party runtime initialization.
 */
async function initializeRuntime(): Promise<void> {
  const wasmUrl = resolveHarfBuzzSubsetWasmUrl();
  if (wasmUrl.protocol === "file:") {
    const { readFile } = await import("node:fs/promises");
    await initializeHarfBuzzSubset(await readFile(wasmUrl));
    return;
  }
  const response = await fetch(wasmUrl);
  if (!response.ok) {
    throw new Error(
      `Could not load the OFD font subset runtime (${response.status}).`
    );
  }
  await initializeHarfBuzzSubset(await response.arrayBuffer());
}

/**
 * Resolves the development dependency or published package asset.
 *
 * @returns Absolute HarfBuzz subset WebAssembly URL.
 */
function resolveHarfBuzzSubsetWasmUrl(): URL {
  return import.meta.url.includes("/src/text/font-subset/")
    ? new URL(
        "../../../node_modules/hb-subset-wasm/dist/hb-subset.wasm",
        import.meta.url
      )
    : new URL("./hb-subset.wasm", import.meta.url);
}
