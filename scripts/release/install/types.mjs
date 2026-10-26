import { execFile } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * tsc codes that mean a module or its declarations cannot be found. Other diagnostics in
 * shipped declarations (strictness, lib mismatches) are a separate quality question.
 */
const resolutionCodes = new Set(["TS2307", "TS2306", "TS7016", "TS2792", "TS2875"]);

/**
 * Type-imports every declared entry from the consumer under NodeNext resolution and reports
 * module resolution failures, both for the entries themselves and inside QuireKit `.d.mts` files.
 * @param {string} consumer - Consumer project with the tarballs installed.
 * @param {{ specifier: string }[]} entries - Entries that declare a `types` target.
 * @returns {Promise<string[]>} One diagnostic per unresolved module.
 */
export async function checkDeclarations(consumer, entries) {
  writeFileSync(join(consumer, "entries.mts"),
    entries.map(({ specifier }, index) => `import type * as e${index} from "${specifier}";\nexport type { e${index} };\n`).join(""));
  writeFileSync(join(consumer, "tsconfig.json"), `${JSON.stringify({
    compilerOptions: {
      module: "NodeNext", moduleResolution: "NodeNext", target: "ES2022", lib: ["ES2023", "DOM", "DOM.Iterable"],
      noEmit: true, strict: false, skipLibCheck: false, types: []
    },
    files: ["entries.mts"]
  }, null, 2)}\n`);
  const output = await run(join(consumer, "node_modules/.bin/tsc"), ["-p", "tsconfig.json", "--pretty", "false"], {
    cwd: consumer, maxBuffer: 256 * 1024 * 1024
  }).then(({ stdout }) => stdout, (error) => {
    // tsc exits non-zero for any diagnostic; only a run without diagnostics means it never checked.
    if (!/error TS\d+/u.test(error.stdout ?? "")) throw new Error(`tsc did not run: ${error.message}`);
    return error.stdout;
  });
  const unresolved = [];
  for (const line of output.split("\n")) {
    const match = /^(.+?)\((\d+),\d+\): error (TS\d+): (.*)$/u.exec(line);
    if (!match || !resolutionCodes.has(match[3])) continue;
    const file = match[1].replace(/^.*node_modules\//u, "");
    // Each entry occupies two lines of entries.mts; map the line back to its specifier.
    const owner = file === "entries.mts" ? entries[Math.floor((Number(match[2]) - 1) / 2)]?.specifier : file;
    // Third-party declaration bugs are not ours to ship; only QuireKit files and entry imports count.
    if (file !== "entries.mts" && !file.startsWith("@quirekit/")) continue;
    unresolved.push(`types ${owner}: ${match[4]}`);
  }
  return unresolved;
}
