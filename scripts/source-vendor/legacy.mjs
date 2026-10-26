import { cpSync, rmSync } from "node:fs";
import { resolve } from "node:path";

// Legacy modes are authored as ESM JavaScript with accompanying declarations.
// Ship these source modules directly; their imports already use the shared owner.
const root = resolve(import.meta.dirname, "../../packages/cm/legacy-modes");
rmSync(resolve(root, "dist"), { recursive: true, force: true });
cpSync(resolve(root, "mode"), resolve(root, "dist/mode"), { recursive: true });
