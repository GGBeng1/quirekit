import {
  copyFileSync,
  mkdirSync
} from "node:fs";
import { createRequire } from "node:module";
import {
  dirname,
  resolve
} from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = resolve(packageRoot, "dist");
const require = createRequire(import.meta.url);
const wasmPath = require.resolve("hb-subset-wasm/hb-subset.wasm");
const noticesPath = resolve(wasmPath, "../../THIRD_PARTY_NOTICES");

mkdirSync(outputRoot, { recursive: true });
copyFileSync(wasmPath, resolve(outputRoot, "hb-subset.wasm"));
copyFileSync(
  noticesPath,
  resolve(outputRoot, "HARFBUZZ-THIRD-PARTY-NOTICES.txt")
);
