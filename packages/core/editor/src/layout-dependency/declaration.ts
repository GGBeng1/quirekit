import type { QuireLayoutDependency, QuireLayoutDependencyContext } from "./types";

// Metadata travels with the actual raw callback across package distributions.
// Bound copies are deliberately excluded: field ownership is resolved before bind.
const declarationKey = Symbol.for("@quirekit/core/layout-dependency");

/**
 * Declares the dependency contract of one concrete callback without wrapping it.
 *
 * @param callback - Raw resolver or contribution factory installed in config.
 * @param dependency - Explicit promise covering this implementation's inputs.
 * @returns The original callback with unchanged call and this semantics.
 */
export function declareQuireLayoutDependency<Callback extends Function>(
  callback: Callback,
  dependency: QuireLayoutDependency
): Callback {
  Object.defineProperty(callback, declarationKey, {
    value: Object.freeze({ ...dependency }),
    configurable: true
  });
  return callback;
}

/**
 * Reads a declaration from the exact raw callback chosen by field inheritance.
 *
 * @param callback - Original configured callback.
 * @returns Declared dependency or undefined for an unknown callback.
 */
export function readLayoutDependencyDeclaration(callback: unknown): QuireLayoutDependency | undefined {
  if (typeof callback !== "function") return undefined;
  return Object.getOwnPropertyDescriptor(callback, declarationKey)?.value as QuireLayoutDependency | undefined;
}

/**
 * Copies this invocation's version evidence into an owned comparison vector.
 *
 * @param tokens - Mutable tokens owned by the current reader invocation.
 * @param dependency - Explicit contribution dependency.
 * @param context - Exact current editor state and optional extension owner.
 * @returns Whether the declaration is understood by this runtime.
 */
export function appendLayoutDependencyTokens(
  tokens: unknown[],
  dependency: QuireLayoutDependency | undefined,
  context: QuireLayoutDependencyContext
): boolean {
  if (dependency?.kind !== "document") return false;
  if (dependency.getVersion !== undefined && typeof dependency.getVersion !== "function") return false;
  tokens.push(dependency, dependency.getVersion);
  const version = dependency.getVersion?.(context);
  if (Array.isArray(version)) {
    tokens.push("version-vector", version.length, ...version);
  } else {
    tokens.push("version-token", version);
  }
  return true;
}
