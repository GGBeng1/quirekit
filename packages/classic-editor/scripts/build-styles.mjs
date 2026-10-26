import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const components = ["standalone-components.css", "vue-components.css"];
// The gallery currently uses only shared recipes; include its CSS whenever that entry emits any.
if (existsSync(new URL("dist/image-gallery-components.css", root))) components.push("image-gallery-components.css");

// All distributions contribute CSS to the one public stylesheet; missing output fails the build.
for (const file of components) await readFile(new URL(`dist/${file}`, root), "utf8");
const authored = await readFile(new URL("src/styles.css", root), "utf8");
const imports = components.map(file => `@import "./${file}";`).join("\n");
await writeFile(new URL("dist/styles.css", root), `${imports}\n${authored}`);
