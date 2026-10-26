// Copied into the consumer project so every specifier resolves from the consumer's
// node_modules, exactly as an application importing the published packages would.
import { createRequire, register } from "node:module";

const require = createRequire(import.meta.url);

// Packages built for bundlers import their stylesheets; load them as empty modules so the
// rest of the module graph is still checked.
register(`data:text/javascript,${encodeURIComponent(`
export async function load(url, context, next) {
  if (new URL(url).pathname.endsWith(".css")) return { format: "module", source: "", shortCircuit: true };
  return next(url, context);
}`)}`);

/**
 * Loads each requested entry and reports the first line of every failure.
 * @param {{ specifier: string, kind: "import" | "require" }[]} entries - Entries of one package.
 * @returns {Promise<{ specifier: string, error: string }[]>} Failed entries.
 */
async function probe(entries) {
  const failures = [];
  for (const { specifier, kind } of entries) {
    try {
      if (kind === "require") require(specifier);
      else await import(specifier);
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      failures.push({ specifier, error: message.split("\n")[0] });
    }
  }
  return failures;
}

const failures = await probe(JSON.parse(process.argv[2]));
process.stdout.write(JSON.stringify(failures));
process.exit(0);
