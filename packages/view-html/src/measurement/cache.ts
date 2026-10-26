import type { QuireDocumentRange } from "@quirekit/renderer";
import { HtmlDomMappingGapError } from "../document";
import type { CreateHtmlDomMeasurementProviderOptions, HtmlMeasurementCacheKey } from "./types";

/** Small document-local cache for immutable client rectangle arrays. */
export class HtmlMeasurementCache<T> {
  private readonly entries = new Map<string, T>();

  /**
   * Reads a cached measurement.
   *
   * @param key - Complete descriptor, range, epoch, and projection identity.
   * @returns Cached product, or undefined when it must be measured.
   */
  get(key: HtmlMeasurementCacheKey): T | undefined {
    return this.entries.get(serializeHtmlMeasurementCacheKey(key));
  }

  /**
   * Stores one immutable measurement product.
   *
   * @param key - Complete measurement identity.
   * @param value - Product to retain.
   */
  set(key: HtmlMeasurementCacheKey, value: T): void {
    this.entries.set(serializeHtmlMeasurementCacheKey(key), value);
  }

  /** Releases every retained measurement product. */
  clear(): void {
    this.entries.clear();
  }
}

/**
 * Serializes one complete measurement cache identity.
 *
 * @param key - Descriptor, range, epoch, projection, and product kind.
 * @returns Stable document-local cache key.
 */
function serializeHtmlMeasurementCacheKey(key: HtmlMeasurementCacheKey): string {
  return [
    key.kind,
    key.descriptorId,
    key.geometryEpoch,
    key.range.from,
    key.range.to,
    key.projection
  ].join(":");
}

/**
 * Creates a complete cache key from current descriptor and surface projection.
 * @param options - Retained document and mounted surface inputs.
 * @param descriptorId - Descriptor owning the measurement.
 * @param range - Canonical measured range.
 * @param kind - Measurement product kind.
 * @returns Cache identity tied to descriptor epoch and surface projection.
 */
export function createHtmlMeasurementCacheKey(
  options: CreateHtmlDomMeasurementProviderOptions,
  descriptorId: string,
  range: QuireDocumentRange,
  kind: HtmlMeasurementCacheKey["kind"]
): HtmlMeasurementCacheKey {
  const descriptor = options.documentView.descriptorById(descriptorId);
  if (!descriptor || descriptor.destroyed) {
    throw new HtmlDomMappingGapError(`HTML measurement descriptor "${descriptorId}" is stale.`);
  }
  const rect = options.surface.getBoundingClientRect();
  return {
    descriptorId,
    geometryEpoch: descriptor.geometryEpoch,
    range,
    projection: `${rect.left},${rect.top},${rect.width},${rect.height}`,
    kind
  };
}
