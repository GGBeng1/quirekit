import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Reads the checked-in licensing policy without deriving legal choices from code.
 * @param {string} root - Repository root.
 * @returns {object} Explicit license policy.
 */
export function readPolicy(root) {
  const policy = JSON.parse(readFileSync(join(root, "licenses/policy.json"), "utf8"));
  if (policy.version !== 3) throw new Error("Unsupported licensing policy version.");
  if (!policy.tiers[policy.defaultTier]) throw new Error("Licensing policy default tier is undefined.");
  for (const names of Object.values(policy.packages)) {
    if (new Set(names).size !== names.length) throw new Error("Duplicate package in a licensing tier.");
  }
  return policy;
}

/**
 * Uses pnpm's actual workspace membership, excluding nested manifest fixtures.
 * @param {string} root - Repository root.
 * @returns {object[]} Workspace records with current, unmodified manifest text.
 */
export function readWorkspace(root) {
  const listed = JSON.parse(execFileSync("pnpm", ["list", "-r", "--depth", "-1", "--json"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }));
  return listed.map(({ path }) => {
    const source = readFileSync(join(path, "package.json"), "utf8");
    return {
      directory: relative(root, path).replaceAll("\\", "/"),
      manifest: JSON.parse(source),
      source
    };
  });
}
