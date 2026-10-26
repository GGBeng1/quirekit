import { collectQuireExtensionContributions, type QuireAnyExtension } from "@quirekit/core";
import type { Node, Schema } from "@quirekit/pm";
import type { QuireAccessibilityCapability, QuireAccessibleNodeDescription } from "../contract";
import type { AccessibilityRegistry } from "./types";
import type { QuireAccessibilityOptions } from "../types";

/**
 * Compiles once per enabled editor, rejecting ambiguous semantic ownership.
 * @param extensions - Fully resolved extension set.
 * @param schema - Canonical schema against which claims are validated.
 * @param fallback - Legacy host callback, used only for nodes without a registered owner.
 * @returns Editor-local semantic readers; the engine never branches on schema node names.
 */
export function compileAccessibilityRegistry(extensions: readonly QuireAnyExtension[], schema: Schema,
  fallback?: QuireAccessibilityOptions["describeBlock"]): AccessibilityRegistry {
  const nodes = new Map<string, Extract<QuireAccessibilityCapability, { kind: "node" }>>();
  const marks = new Map<string, Extract<QuireAccessibilityCapability, { kind: "mark" }>>();
  const owners = new Map<string, string>();
  for (const { extensionName, contribution } of collectQuireExtensionContributions<QuireAccessibilityCapability>(extensions, "addAccessibility")) {
    if (!contribution || (contribution.kind !== "node" && contribution.kind !== "mark")
      || typeof contribution.name !== "string" || typeof contribution.describe !== "function") {
      throw new TypeError(`Invalid addAccessibility contribution from ${extensionName}`);
    }
    const key = `${contribution.kind}:${contribution.name}`;
    const previous = owners.get(key);
    if (previous) throw new TypeError(`Accessibility ${key} is claimed by both ${previous} and ${extensionName}`);
    if (!Object.hasOwn(contribution.kind === "node" ? schema.nodes : schema.marks, contribution.name)) {
      throw new TypeError(`Accessibility ${key} from ${extensionName} is absent from the schema`);
    }
    owners.set(key, extensionName);
    if (contribution.kind === "node") nodes.set(contribution.name, contribution);
    else marks.set(contribution.name, contribution);
  }
  // Only immutable node facts are cached; editor state, permissions and source positions are not.
  const cache = new WeakMap<Node, QuireAccessibleNodeDescription | null>();
  return {
    node(node) {
      if (cache.has(node)) return cache.get(node)!;
      const owner = nodes.get(node.type.name);
      const legacy = owner ? null : fallback?.(node);
      const result = owner ? owner.describe(node) : legacy ? {
        ...legacy, ...(node.isTextblock && legacy.kind !== "description" ? { editable: true } : {})
      } : null;
      cache.set(node, result);
      return result;
    },
    mark(mark) { return marks.get(mark.type.name)?.describe(mark) ?? null; }
  };
}
