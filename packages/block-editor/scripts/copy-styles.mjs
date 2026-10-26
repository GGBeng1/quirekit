import { copyFile } from "node:fs/promises";

await copyFile(new URL("../src/ui/styles.css", import.meta.url), new URL("../dist/styles.css", import.meta.url));
