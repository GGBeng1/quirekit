import { resolve } from "node:path";
import { readPolicy, readWorkspace } from "./workspace.mjs";
import { packageTier, validateLicenses } from "./policy.mjs";

const root = resolve(import.meta.dirname, "../..");
const policy = readPolicy(root);
const entries = readWorkspace(root);
const errors = validateLicenses(root, policy, entries);
if (errors.length > 0) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exitCode = 1;
} else {
  const counts = Object.keys(policy.tiers).map((tier) => `${entries
    .filter((entry) => packageTier(policy, entry.manifest.name) === tier).length} ${tier}`);
  process.stdout.write(`License policy verified: ${entries.length} workspace manifests (${counts.join(", ")}), `
    + `${policy.boundaryBaseline.length} baseline upward edges pending decoupling, `
    + "standard texts, preserved upstream notices and local license copies.\n");
}
