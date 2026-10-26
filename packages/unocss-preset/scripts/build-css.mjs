import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { generateQuireKitCss } from "../dist/index.mjs";

const outputPath = fileURLToPath(new URL("../dist/quirekit.css", import.meta.url));
await writeFile(outputPath, await generateQuireKitCss(), "utf8");
