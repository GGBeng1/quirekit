import type { QuireMediaIntrinsicSize } from "@quirekit/media";
import type {
  QuireDisplayCommand,
  QuireDisplayList
} from "@quirekit/renderer";
import { resolveQuireImageSourceRect } from "./crop";
import { registerMountedImageTransformPage, registerMountedImageTransformPass, registerMountedImageTransformVersion } from "./authority";
import { readQuireAffineScale, readQuireImageCommandDemand } from "./decode-size";
import { MountedImageDemandWindow } from "./demand";
import {
  createMountedImageResourceEntry,
  type MountedImageResourceEntry
} from "./entry";
import { createQuireMountedImagePlaceholder } from "./placeholder";
import type {
  QuireMountedImageResourceManager,
  QuireMountedImageResourceManagerOptions,
  QuireMountedImageResourceState
} from "./types";

/** Decoded bytes kept for images that scrolled out of the mounted pages. */
const defaultMaxIdleDecodedBytes = 48 * 1024 * 1024;

/** Default mounted image resource manager. */
class DefaultMountedImageResourceManager
  implements QuireMountedImageResourceManager {
  private readonly entries = new Map<string, MountedImageResourceEntry>();
  /** Resource key and last observing pass of each stable command slot. */
  private readonly slots = new Map<string, { key: string; seen: number }>();
  private destroyed = false;
  private resourceVersion = 0;
  /** Latest complete transform pass and nesting depth. */
  private pass = 0;
  private passDepth = 0;
  /** Pass that last observed each resource key. */
  private readonly lastSeen = new Map<string, number>();
  /** Largest whole-image demand per key in display-list units, current and last complete pass. */
  private demands = new Map<string, QuireMediaIntrinsicSize>();
  private settledDemands = new Map<string, QuireMediaIntrinsicSize>();
  private rasterScale: number | undefined;
  /** Mounted pages whose images may decode, and images other pages deferred. */
  private readonly window = new MountedImageDemandWindow();

  /**
   * Creates one manager over explicit resolver and decoder authorities.
   *
   * @param options - Resolver, decoder, and invalidation callback.
   */
  constructor(
    private readonly options: QuireMountedImageResourceManagerOptions
  ) {
    this.rasterScale = options.rasterScale;
    registerMountedImageTransformVersion(this.transformDisplayList, () => this.resourceVersion);
    registerMountedImageTransformPage(this.transformDisplayList, this.transformPage);
    registerMountedImageTransformPass(this.transformDisplayList, {
      begin: () => {
        if (this.passDepth++ > 0) return;
        this.pass += 1;
        this.demands = new Map();
      },
      end: () => {
        if (--this.passDepth > 0) return;
        this.releaseIdle();
        this.settledDemands = this.demands;
        this.requestDemands();
      }
    });
  }

  /** @inheritdoc */
  readonly transformDisplayList = (
    displayList: QuireDisplayList
  ): QuireDisplayList => ({
    ...displayList,
    commands: displayList.commands.map((command) => this.transformCommand(command, 1))
  });

  /**
   * Transforms one page chunk; a page outside the demand window starts no new decode.
   *
   * @param displayList - Page chunk of the committed snapshot.
   * @param pageIndex - Page the chunk paints.
   * @returns Paint-safe chunk.
   */
  private readonly transformPage = (displayList: QuireDisplayList, pageIndex: number): QuireDisplayList => {
    this.window.clear(pageIndex);
    const deferPage = this.window.covers(pageIndex) ? undefined : pageIndex;
    return { ...displayList, commands: displayList.commands.map((command) => this.transformCommand(command, 1, deferPage)) };
  };

  /** @inheritdoc */
  readState(key: string): QuireMountedImageResourceState | undefined {
    return this.entries.get(key)?.state;
  }

  /** @inheritdoc */
  setRasterScale(scale: number): void {
    if (this.destroyed || scale === this.rasterScale) return;
    this.rasterScale = scale;
    this.requestDemands();
  }

  /** @inheritdoc */
  setDemandPages(pageIndices: readonly number[] | undefined): void {
    if (this.destroyed) return;
    for (const [key, demand] of this.window.update(pageIndices)) {
      if (this.entries.has(key)) continue;
      // Counted as observed, so the pass ending before its repaint keeps it.
      this.lastSeen.set(key, this.pass);
      this.entries.set(key, this.createEntry(key, demand));
    }
  }

  /** @inheritdoc */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.resourceVersion += 1;
    for (const entry of this.entries.values()) {
      entry.release();
    }
    this.entries.clear();
    this.slots.clear();
    this.lastSeen.clear();
  }

  /**
   * Resolves one display command recursively.
   *
   * @param command - Command to inspect.
   * @param scale - Accumulated scale of enclosing clip transforms.
   * @param deferPage - Page outside the demand window, whose new images wait for it.
   * @returns Paint-safe command.
   */
  private transformCommand(command: QuireDisplayCommand, scale: number, deferPage?: number): QuireDisplayCommand {
    if (command.kind === "clip") {
      const nested = scale * readQuireAffineScale(command.transform);
      return {
        ...command,
        commands: command.commands.map((child) => this.transformCommand(child, nested, deferPage))
      };
    }
    if (command.kind !== "image" || command.resourceKey === undefined) {
      return command;
    }

    const demand = readQuireImageCommandDemand(command, scale);
    if (deferPage !== undefined && !this.entries.has(command.resourceKey)) {
      this.window.defer(deferPage, command.resourceKey, demand);
      return createQuireMountedImagePlaceholder(command, "loading");
    }
    const entry = this.observe(command.id, command.resourceKey, demand);
    const decoded = entry.decoded;
    if (entry.state.status !== "resolved" || decoded === undefined) {
      return createQuireMountedImagePlaceholder(command, entry.state.status);
    }

    // Crop rectangles address `source` pixels; SVG only uses their ratio to `sourceSize`.
    const intrinsic = decoded.intrinsicSize;
    const declared = command.sourceSize ?? intrinsic;
    const sourceSize = decoded.pixelSize === undefined ? declared : {
      width: declared.width * decoded.pixelSize.width / intrinsic.width,
      height: declared.height * decoded.pixelSize.height / intrinsic.height
    };
    return {
      ...command,
      source: decoded.source,
      href: decoded.href,
      sourceSize,
      ...(command.sourceCrop === undefined
        ? {}
        : { sourceRect: resolveQuireImageSourceRect(command.sourceCrop, sourceSize) })
    };
  }

  /**
   * Reconciles one stable command slot with its current resource key.
   *
   * @param slot - Stable command id.
   * @param key - Current opaque resource key.
   * @param demand - Whole-image demand of this command in display-list units.
   * @returns Current resource entry.
   */
  private observe(
    slot: string,
    key: string,
    demand: QuireMediaIntrinsicSize | undefined
  ): MountedImageResourceEntry {
    const previousKey = this.slots.get(slot)?.key;
    if (previousKey !== undefined && previousKey !== key) {
      this.releaseReference(previousKey);
    }
    if (previousKey !== key) {
      this.resourceVersion += 1;
    }
    this.slots.set(slot, { key, seen: this.pass });

    this.lastSeen.set(key, this.pass);
    if (demand !== undefined) {
      const known = this.demands.get(key);
      this.demands.set(key, known === undefined ? demand : {
        width: Math.max(known.width, demand.width),
        height: Math.max(known.height, demand.height)
      });
    }
    let entry = this.entries.get(key);
    if (entry === undefined) {
      entry = this.createEntry(key, demand);
      this.entries.set(key, entry);
    }
    if (previousKey !== key) {
      entry.references += 1;
    }
    return entry;
  }

  /**
   * Starts resolving and decoding one resource.
   *
   * @param key - Resource key.
   * @param demand - Whole-image demand in display-list units, if known.
   * @returns Started entry.
   */
  private createEntry(key: string, demand: QuireMediaIntrinsicSize | undefined): MountedImageResourceEntry {
    return createMountedImageResourceEntry(key, {
      ...this.options,
      onStateChange: (state) => {
        this.resourceVersion += 1;
        this.options.onStateChange?.(state);
      }
    }, demand === undefined ? undefined : this.toPixels(demand));
  }

  /** Asks every entry of the last complete pass for its demand at the current raster scale. */
  private requestDemands(): void {
    for (const [key, demand] of this.settledDemands) {
      const pixels = this.toPixels(demand);
      if (pixels !== undefined) this.entries.get(key)?.request(pixels);
    }
  }

  /**
   * Converts a display-list demand to device pixels.
   *
   * @param demand - Whole-image demand in display-list units.
   * @returns Device-pixel demand, or undefined without a raster scale.
   */
  private toPixels(demand: QuireMediaIntrinsicSize): QuireMediaIntrinsicSize | undefined {
    const scale = this.rasterScale;
    return scale === undefined
      ? undefined
      : { width: Math.ceil(demand.width * scale), height: Math.ceil(demand.height * scale) };
  }

  /**
   * Prunes slots and unresolved or failed entries the latest complete pass did not observe,
   * then releases idle decoded images oldest first beyond a byte budget. Painted
   * page pixels stay; a later repaint decodes again.
   */
  private releaseIdle(): void {
    for (const [slot, { key, seen }] of this.slots) {
      if (seen === this.pass) continue;
      this.slots.delete(slot);
      const entry = this.entries.get(key);
      if (entry !== undefined) entry.references -= 1;
    }
    const budget = this.options.maxIdleDecodedBytes ?? defaultMaxIdleDecodedBytes;
    const idle: { key: string; bytes: number; seen: number }[] = [];
    let idleBytes = 0;
    for (const [key, entry] of this.entries) {
      const seen = this.lastSeen.get(key) ?? 0;
      if (seen === this.pass) continue;
      const size = entry.decoded?.pixelSize ?? entry.decoded?.intrinsicSize;
      if (size === undefined) {
        // Incremental passes do not re-transform every mounted page, so a loading
        // image may still back a retained page; only settled failures are dropped.
        if (entry.state.status !== "loading") this.forget(key);
        continue;
      }
      idle.push({ key, bytes: size.width * size.height * 4, seen });
      idleBytes += size.width * size.height * 4;
    }
    idle.sort((left, right) => left.seen - right.seen);
    for (const { key, bytes } of idle) {
      if (idleBytes <= budget) break;
      this.forget(key);
      idleBytes -= bytes;
    }
  }

  /**
   * Releases one entry with its access record and every slot still pointing at it.
   *
   * @param key - Resource key to forget.
   */
  private forget(key: string): void {
    const entry = this.entries.get(key);
    if (entry?.decoded !== undefined) this.resourceVersion += 1;
    entry?.release();
    this.entries.delete(key);
    this.lastSeen.delete(key);
    for (const [slot, value] of this.slots) if (value.key === key) this.slots.delete(slot);
  }

  /**
   * Releases one command-slot reference and unused decoded state.
   *
   * @param key - Previous resource key.
   */
  private releaseReference(key: string): void {
    const entry = this.entries.get(key);
    if (entry === undefined) return;
    entry.references -= 1;
    if (entry.references > 0) return;
    entry.release();
    this.entries.delete(key);
    this.lastSeen.delete(key);
  }
}

/**
 * Creates a mounted image resource manager.
 *
 * @param options - Explicit resolver, decoder, and invalidation callback.
 * @returns Mounted resource owner.
 */
export function createQuireMountedImageResourceManager(
  options: QuireMountedImageResourceManagerOptions
): QuireMountedImageResourceManager {
  return new DefaultMountedImageResourceManager(options);
}
