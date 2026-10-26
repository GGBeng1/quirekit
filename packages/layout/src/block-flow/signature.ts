/** Object that can expose a position-independent layout signature. */
export interface QuireLayoutSignatureCarrier {
  /** Optional position-independent layout signature. */
  readonly layoutSignature?: string | undefined;
}

/** Lazily computed layout-signature metadata. */
interface QuireLazyLayoutSignatureEntry {
  /** Computes the signature on first read. */
  readonly compute: () => string | undefined;
  /** Whether the signature has been computed. */
  materialized: boolean;
  /** Cached signature value after materialization. */
  value: string | undefined;
}

const lazyLayoutSignatureEntries = new WeakMap<object, QuireLazyLayoutSignatureEntry>();

/**
 * Defines a lazy `layoutSignature` getter on an object.
 *
 * @param target - Object that should expose the lazy signature.
 * @param compute - Callback that computes the signature on first read.
 * @returns The same target object for fluent construction.
 */
export function defineQuireLazyLayoutSignature<Target extends object>(
  target: Target,
  compute: () => string | undefined
): Target {
  const entry: QuireLazyLayoutSignatureEntry = {
    compute,
    materialized: false,
    value: undefined
  };

  lazyLayoutSignatureEntries.set(target, entry);
  Object.defineProperty(target, "layoutSignature", {
    enumerable: true,
    configurable: true,
    get() {
      if (!entry.materialized) {
        entry.value = entry.compute();
        entry.materialized = true;
      }

      return entry.value;
    }
  });

  return target;
}

/**
 * Forwards a layout signature without forcing lazy materialization.
 *
 * @param target - Object receiving the signature property.
 * @param source - Object that may already expose a signature.
 * @returns The same target object for fluent construction.
 */
export function forwardQuireLayoutSignature<
  Target extends object,
  Source extends QuireLayoutSignatureCarrier
>(target: Target, source: Source): Target {
  const descriptor = Object.getOwnPropertyDescriptor(source, "layoutSignature");

  if (descriptor === undefined) {
    return target;
  }

  const lazyEntry = lazyLayoutSignatureEntries.get(source);
  if (lazyEntry !== undefined) {
    return defineQuireLazyLayoutSignature(target, () => source.layoutSignature);
  }

  if ("value" in descriptor && descriptor.value !== undefined) {
    Object.defineProperty(target, "layoutSignature", {
      enumerable: true,
      configurable: true,
      value: descriptor.value
    });
  }

  return target;
}

/**
 * Reads a layout signature only after it has been materialized.
 *
 * @param source - Object that may carry a lazy or eager signature.
 * @returns Materialized signature, or undefined when reading would compute it.
 */
export function readMaterializedQuireLayoutSignature(
  source: QuireLayoutSignatureCarrier
): string | undefined {
  const entry = lazyLayoutSignatureEntries.get(source);

  if (entry !== undefined && !entry.materialized) {
    return undefined;
  }

  return source.layoutSignature;
}
