import {
  areQuireMediaReferencesEqual,
  parseQuireMediaResourceKey,
  type QuireMediaIntrinsicSize,
  type QuireResolvedMediaAsset
} from "@quirekit/media";
import { resolveQuireImageDecodeSize } from "./decode-size";
import type {
  QuireDecodedImageResource,
  QuireMountedImageResourceManagerOptions,
  QuireMountedImageResourceState
} from "./types";

/** One reference-counted async resource entry. */
export interface MountedImageResourceEntry {
  /** Current public state. */
  readonly state: QuireMountedImageResourceState;
  /** Decoded paint inputs after successful resolution. */
  readonly decoded: QuireDecodedImageResource | undefined;
  /** Number of stable display command slots using this entry. */
  references: number;
  /**
   * Records the latest raster demand and re-decodes when its level differs.
   *
   * @param demand - Device pixels the whole image needs.
   */
  request(demand: QuireMediaIntrinsicSize): void;
  /** Stops publication and releases current or late decoded state. */
  release(): void;
}

/** Mutable implementation hidden behind the entry contract. */
class DefaultMountedImageResourceEntry implements MountedImageResourceEntry {
  private stateValue: QuireMountedImageResourceState;
  private decodedValue: QuireDecodedImageResource | undefined;
  private active = true;
  private asset: QuireResolvedMediaAsset | undefined;
  /** Latest demand, and the demand behind the current result. */
  private demand: QuireMediaIntrinsicSize | undefined;
  private decodedDemand: QuireMediaIntrinsicSize | undefined;
  /** Identifies the newest decode; older completions are released on arrival. */
  private generation = 0;
  private decoding = false;
  /** Cleared once the decoder ignores a demand, so no level change re-decodes. */
  private resizable = true;
  references = 0;

  /**
   * Creates and starts one resource entry.
   *
   * @param key - Opaque portable resource key.
   * @param options - Resolver, decoder, and state observer.
   * @param demand - Optional raster demand for the first decode.
   */
  constructor(
    key: string,
    private readonly options: QuireMountedImageResourceManagerOptions,
    demand: QuireMediaIntrinsicSize | undefined
  ) {
    this.demand = demand;
    const reference = parseQuireMediaResourceKey(key);
    const status = reference === undefined
      ? "failed"
      : options.resolver === undefined
        ? "unresolved"
        : "loading";
    this.stateValue = { key, status };
    if (reference !== undefined && options.resolver !== undefined) {
      this.start(reference);
    }
  }

  /** @inheritdoc */
  get state(): QuireMountedImageResourceState {
    return this.stateValue;
  }

  /** @inheritdoc */
  get decoded(): QuireDecodedImageResource | undefined {
    return this.decodedValue;
  }

  /** @inheritdoc */
  request(demand: QuireMediaIntrinsicSize): void {
    this.demand = demand;
    if (!this.decoding && this.needsDecode()) this.decode();
  }

  /** @inheritdoc */
  release(): void {
    if (!this.active) return;
    this.active = false;
    this.decodedValue?.release();
    this.decodedValue = undefined;
  }

  /**
   * Resolves portable bytes once, then runs the first decode.
   *
   * @param reference - Parsed canonical media reference.
   */
  private start(
    reference: NonNullable<ReturnType<typeof parseQuireMediaResourceKey>>
  ): void {
    this.decoding = true;
    void Promise.resolve(this.options.resolver!.resolve(reference))
      .then((asset) => {
        if (!this.active) return;
        this.decoding = false;
        if (asset === undefined) {
          this.publish("unresolved");
          return;
        }
        if (!areQuireMediaReferencesEqual(reference, asset.reference)) {
          throw new RangeError(
            "Mounted image resolver returned a different media reference."
          );
        }
        this.asset = asset;
        this.decode();
      })
      .catch((error: unknown) => this.fail(error));
  }

  /**
   * Decodes the retained asset for the latest demand. The current result keeps
   * painting until the new one arrives; superseded results are released.
   */
  private decode(): void {
    const generation = ++this.generation;
    const demand = this.demand;
    this.decoding = true;
    void this.options.decoder.decode(this.asset!, demand === undefined ? undefined : { pixelSize: demand })
      .then((decoded) => {
        if (!this.active || generation !== this.generation) {
          decoded.release();
          return;
        }
        this.decoding = false;
        if (demand !== undefined && decoded.pixelSize === undefined) this.resizable = false;
        this.decodedValue?.release();
        this.decodedValue = decoded;
        this.decodedDemand = demand;
        this.publish("resolved");
        if (this.needsDecode()) this.decode();
      })
      .catch((error: unknown) => {
        if (!this.active || generation !== this.generation) return;
        this.decoding = false;
        this.resizable = false;
        if (this.decodedValue === undefined) this.fail(error);
      });
  }

  /**
   * Reports whether the latest demand maps to a different decode level.
   *
   * @returns True when a resizable result was decoded for another level.
   */
  private needsDecode(): boolean {
    const decoded = this.decodedValue;
    if (!this.resizable || decoded === undefined || this.demand === undefined) return false;
    if (this.decodedDemand === undefined) return true;
    const next = resolveQuireImageDecodeSize(decoded.intrinsicSize, this.demand);
    const current = resolveQuireImageDecodeSize(decoded.intrinsicSize, this.decodedDemand);
    return next.width !== current.width || next.height !== current.height;
  }

  /**
   * Publishes a successful terminal transition.
   *
   * @param status - Resolution result.
   */
  private publish(status: "unresolved" | "resolved"): void {
    this.stateValue = { key: this.stateValue.key, status };
    this.options.onStateChange?.(this.stateValue);
  }

  /**
   * Publishes a failed resolution or first decode.
   *
   * @param error - Failure kept for diagnostics.
   */
  private fail(error: unknown): void {
    if (!this.active) return;
    this.decoding = false;
    this.stateValue = { key: this.stateValue.key, status: "failed", error };
    this.options.onStateChange?.(this.stateValue);
  }
}

/**
 * Creates one mounted image resource entry.
 *
 * @param key - Opaque portable resource key.
 * @param options - Resolver, decoder, and state observer.
 * @param demand - Optional raster demand for the first decode.
 * @returns Started resource entry.
 */
export function createMountedImageResourceEntry(
  key: string,
  options: QuireMountedImageResourceManagerOptions,
  demand?: QuireMediaIntrinsicSize
): MountedImageResourceEntry {
  return new DefaultMountedImageResourceEntry(key, options, demand);
}
