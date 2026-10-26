import { cpSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

// Styles are emitted beside their relative KaTeX font URLs. Keep the dependency's
// assets and notice beside each reader build rather than relying on host aliases.
const require = createRequire(join(process.cwd(), "package.json"));
const distribution = dirname(require.resolve("katex/dist/katex.min.css"));
cpSync(join(distribution, "fonts"), join(process.cwd(), "dist/fonts"), { recursive: true });
mkdirSync(join(process.cwd(), "dist/licenses"), { recursive: true });
copyFileSync(join(distribution, "../LICENSE"), join(process.cwd(), "dist/licenses/katex.txt"));
