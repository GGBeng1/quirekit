import { execFile } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/** npm's resolver can loop forever on conflicting peers; a bounded run turns that into an error. */
const resolveTimeout = 10 * 60_000;

/**
 * Resolves the same tarballs with npm (lockfile only, nothing installed). pnpm tolerates peer
 * conflicts that make npm's arborist replace the same packages endlessly, so a clean pnpm
 * install alone does not prove that `npm install` finishes for users.
 * @param {string} directory - Empty directory for the npm consumer.
 * @param {Record<string, string>} local - Package name to `file:` tarball spec.
 * @param {NodeJS.ProcessEnv} env - Environment without the parent run's npm overrides.
 * @param {number} [timeout] - Resolution time limit in milliseconds.
 * @returns {Promise<string[]>} One diagnostic when npm fails or does not finish.
 */
export async function checkNpmResolution(directory, local, env, timeout = resolveTimeout) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "package.json"), `${JSON.stringify({
    name: "quirekit-npm-check", private: true, dependencies: local, overrides: local
  }, null, 2)}\n`);
  writeFileSync(join(directory, ".npmrc"), "registry=https://registry.npmjs.org/\n");
  try {
    await run("npm", ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"], {
      cwd: directory, env, timeout, killSignal: "SIGKILL", maxBuffer: 64 * 1024 * 1024
    });
    return [];
  } catch (error) {
    if (error.killed) return [`npm install did not finish resolving within ${Math.round(timeout / 1000)} seconds (resolver loop on conflicting peers)`];
    return [`npm install failed:\n${String(error.stderr).slice(-2000)}`];
  }
}
