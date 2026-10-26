import { Extension } from "../extension";
import { Mark } from "../Mark";
import { Node } from "../Node";
import type { QuireAnyExtension, QuireExtensionFieldSource } from "../types";
import { appendLayoutDependencyTokens, readLayoutDependencyDeclaration } from "./declaration";
import type { QuireLayoutDependencyContext } from "./types";

const knownStyleGetters = new Map<Function | undefined, string>([
  [Object.getOwnPropertyDescriptor(Mark.prototype, "canvasStyle")?.get, "canvasStyle"],
  [Object.getOwnPropertyDescriptor(Node.prototype, "canvasTextStyle")?.get, "canvasTextStyle"],
  [Object.getOwnPropertyDescriptor(Extension.prototype, "canvasTextStyle")?.get, "addNodeCanvasTextStyles"]
]);

/**
 * Reads both exposed style surfaces without invoking unknown getters/factories.
 *
 * @param extension - Actual configured extension instance.
 * @param context - Current layout owner and exact state.
 * @param tokens - Owned comparison tokens.
 * @returns Unknown authority description, or undefined after successful collection.
 */
export function appendStyleAuthority(
  extension: QuireAnyExtension,
  context: QuireLayoutDependencyContext,
  tokens: unknown[]
): string | undefined {
  tokens.push(extension, extension.name);
  for (const surface of ["canvasStyle", "canvasTextStyle"] as const) {
    const descriptor = readPropertyDescriptor(extension, surface);
    if (descriptor === undefined) continue;
    if (descriptor.get !== undefined) {
      const field = readKnownStyleField(descriptor.get);
      if (field === undefined) return `unknown-style-getter:${extension.name}:${surface}`;
      const raw = readRawField(extension, field);
      if (raw?.get !== undefined) return `unknown-style-field-getter:${extension.name}:${field}`;
      const callback = raw?.value;
      if (callback === undefined) continue;
      tokens.push(surface, callback);
      if (!appendLayoutDependencyTokens(tokens, readLayoutDependencyDeclaration(callback), context)) {
        return `unknown-style-callback:${extension.name}:${field}`;
      }
      continue;
    }
    const map = descriptor.value;
    if (map === undefined) continue;
    if (map === null || typeof map !== "object") return `unknown-style-map:${extension.name}:${surface}`;
    const prototype = Object.getPrototypeOf(map) as object | null;
    if (prototype !== null && prototype !== Object.prototype) {
      return `unknown-style-map-prototype:${extension.name}:${surface}`;
    }
    tokens.push(surface, map);
    for (const key of Object.getOwnPropertyNames(map)) {
      const entry = readPropertyDescriptor(map, key);
      if (entry?.get !== undefined) return `unknown-style-entry-getter:${extension.name}:${key}`;
      const callback = entry?.value;
      tokens.push(key, callback);
      if (!appendLayoutDependencyTokens(tokens, readLayoutDependencyDeclaration(callback), context)) {
        return `unknown-style-callback:${extension.name}:${key}`;
      }
    }
  }
  return undefined;
}

/**
 * Identifies Core accessors whose implementation exclusively resolves raw config.
 *
 * Arbitrary overridden accessors remain unknown even if their config has a
 * declaration. This recognizes an implementation identity, not an extension name.
 *
 * @param getter - Actual exposed property getter.
 * @returns Raw config field consumed by that accessor, when known.
 */
function readKnownStyleField(getter: () => unknown): string | undefined {
  return knownStyleGetters.get(getter);
}

/**
 * Follows the same undefined-only parent fallback as getExtensionField, without bind.
 *
 * @param source - Current config owner in the extension parent chain.
 * @param field - Concrete callback or factory field.
 * @returns Raw descriptor, preserving unknown accessors without executing them.
 */
function readRawField(source: QuireExtensionFieldSource, field: string): PropertyDescriptor | undefined {
  const descriptor = readPropertyDescriptor(source.config, field);
  if (descriptor?.get !== undefined || descriptor?.value !== undefined || source.parent === undefined) {
    return descriptor;
  }
  return readRawField(source.parent, field);
}

/**
 * Finds a property without evaluating any accessor along its prototype chain.
 *
 * @param owner - Object whose public property is consumed by layout.
 * @param key - Property name to inspect.
 * @returns First effective property descriptor, or undefined.
 */
function readPropertyDescriptor(owner: object, key: string): PropertyDescriptor | undefined {
  let current: object | null = owner;
  while (current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor !== undefined) return descriptor;
    current = Object.getPrototypeOf(current) as object | null;
  }
  return undefined;
}
