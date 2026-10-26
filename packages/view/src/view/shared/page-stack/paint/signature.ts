import type {
  QuireDisplayCommand,
  QuireDisplayList,
  QuireRect
} from "@quirekit/renderer";
import {
  createQuireDisplayCommandPaintSignature,
  doQuireRectsIntersect,
  readQuireDisplayCommandPaintBounds
} from "@quirekit/renderer";

/** Resolves a stable paint signature for object-valued render dependencies. */
export type QuirePageStackPaintObjectSignature = (
  value: object | undefined
) => string;

/** Resolves stable ids for object-valued page-stack paint dependencies. */
export class QuirePageStackPaintObjectSignatureResolver {
  /** Stable ids retained for object identity. */
  private readonly objectIds = new WeakMap<object, number>();
  /** Next stable id assigned by this resolver. */
  private nextObjectId = 1;

  /**
   * Resolves a stable signature for an optional object dependency.
   *
   * @param value - Optional object-valued paint dependency.
   * @returns Stable identity signature, or `none` when absent.
   */
  resolve(value: object | undefined): string {
    if (value === undefined) {
      return "none";
    }

    const existing = this.objectIds.get(value);
    if (existing !== undefined) {
      return String(existing);
    }

    const next = this.nextObjectId;
    this.nextObjectId += 1;
    this.objectIds.set(value, next);
    return String(next);
  }
}

/**
 * Serializes a page-stack rectangle into a compact paint signature.
 *
 * @param rect - Rectangle to serialize.
 * @returns Stable rectangle signature.
 */
export function createQuirePageStackRectPaintSignature(rect: QuireRect): string {
  return `${rect.x},${rect.y},${rect.width},${rect.height}`;
}

/**
 * Caches command-level paint signatures by display command object identity.
 */
export class QuirePageStackDisplayCommandPaintSignatureCache {
  /** Cached paint signature payloads for unchanged command objects. */
  private readonly entries = new WeakMap<QuireDisplayCommand, unknown>();
  /** Cached serialized paint signatures for unchanged command objects. */
  private readonly serializedEntries = new WeakMap<QuireDisplayCommand, string>();

  /**
   * Resolves the paint signature payload for one display command.
   *
   * @param command - Display command to summarize.
   * @param objectSignature - Stable signature resolver for object-valued dependencies.
   * @returns JSON-serializable paint dependency payload.
   */
  resolve(
    command: QuireDisplayCommand,
    objectSignature: QuirePageStackPaintObjectSignature
  ): unknown {
    const existing = this.entries.get(command);

    if (existing !== undefined) {
      return existing;
    }

    const signature = createQuirePageStackDisplayCommandPaintSignature(
      command,
      objectSignature,
      this
    );
    this.entries.set(command, signature);
    return signature;
  }

  /**
   * Resolves the serialized paint signature for one display command.
   *
   * @param command - Display command to summarize.
   * @param objectSignature - Stable signature resolver for object-valued dependencies.
   * @returns Serialized JSON paint dependency payload.
   */
  resolveSerialized(
    command: QuireDisplayCommand,
    objectSignature: QuirePageStackPaintObjectSignature
  ): string {
    const existing = this.serializedEntries.get(command);

    if (existing !== undefined) {
      return existing;
    }

    const serialized = JSON.stringify(this.resolve(command, objectSignature));
    this.serializedEntries.set(command, serialized);
    return serialized;
  }
}

/** Serialized paint signature list assembled without intermediate arrays. */
interface QuireSerializedPaintSignatureList {
  /** Serialized JSON array of command signatures. */
  readonly signature: string;
  /** Number of serialized command signatures in the array. */
  readonly count: number;
}

/**
 * Creates a paint-only signature for a page-filtered display list.
 *
 * @param displayList - Display list whose commands are already scoped to a page.
 * @param objectSignature - Stable signature resolver for object-valued dependencies.
 * @param commandSignatureCache - Optional cache for unchanged command payloads.
 * @returns Serialized paint dependency signature.
 */
export function createQuirePageStackDisplayListPaintSignature(
  displayList: QuireDisplayList,
  objectSignature: QuirePageStackPaintObjectSignature,
  commandSignatureCache?: QuirePageStackDisplayCommandPaintSignatureCache | undefined
): string {
  return serializeQuirePageStackDisplayCommandPaintSignatureList(
    displayList.commands,
    (command) => serializeQuirePageStackDisplayCommandPaintSignature(
      command,
      objectSignature,
      commandSignatureCache
    )
  ).signature;
}

/**
 * Creates a paint signature for commands that intersect one page rect.
 *
 * This is the page-stack fast path used before deciding whether content paint can
 * be skipped. It mirrors `filterQuireDisplayListToRect(...).commands` followed
 * by `createQuirePageStackDisplayListPaintSignature(...)`, but avoids allocating
 * a page-filtered display list when the cache hits and the caller will not paint.
 *
 * @param displayList - Document-space display list to summarize.
 * @param viewportRect - Page rectangle used to scope paint.
 * @param objectSignature - Stable signature resolver for object-valued dependencies.
 * @param commandSignatureCache - Optional cache for unchanged command payloads.
 * @returns Serialized paint dependency signature for the page rect.
 */
export function createQuirePageStackDisplayListPaintSignatureForRect(
  displayList: QuireDisplayList,
  viewportRect: QuireRect,
  objectSignature: QuirePageStackPaintObjectSignature,
  commandSignatureCache?: QuirePageStackDisplayCommandPaintSignatureCache | undefined
): string {
  return serializeQuirePageStackDisplayCommandPaintSignaturesForRect(
    displayList.commands,
    viewportRect,
    objectSignature,
    commandSignatureCache
  ).signature;
}

/**
 * Creates paint signatures for multiple page rects with one command walk.
 *
 * This is the content-cache companion to page-stack display-list bucketing: every
 * returned signature matches `createQuirePageStackDisplayListPaintSignatureForRect`
 * for the corresponding viewport, but unchanged mounted pages no longer force
 * repeated full-list scans before the cache can decide whether painting is needed.
 *
 * @param displayList - Document-space display list to summarize.
 * @param viewportRects - Page rectangles used to scope paint.
 * @param objectSignature - Stable signature resolver for object-valued dependencies.
 * @param commandSignatureCache - Optional cache for unchanged command payloads.
 * @returns Serialized paint dependency signatures matching `viewportRects` order.
 */
export function createQuirePageStackDisplayListPaintSignaturesForRects(
  displayList: QuireDisplayList,
  viewportRects: readonly QuireRect[],
  objectSignature: QuirePageStackPaintObjectSignature,
  commandSignatureCache?: QuirePageStackDisplayCommandPaintSignatureCache | undefined
): readonly string[] {
  const buckets = viewportRects.map((viewportRect) => createPaintSignatureBucket(viewportRect));

  appendQuirePageStackDisplayCommandPaintSignaturesToBuckets(
    displayList.commands,
    buckets,
    objectSignature,
    commandSignatureCache
  );

  return buckets.map(finishPaintSignatureBucket);
}

/**
 * Delegates paint-field ownership while retaining View's object-identity cache.
 * @param command - Display command to summarize.
 * @param objectSignature - Stable identity of runtime image and glyph sources.
 * @param commandSignatureCache - Optional nested-command identity cache.
 * @returns JSON-serializable renderer-owned paint dependencies.
 */
export function createQuirePageStackDisplayCommandPaintSignature(
  command: QuireDisplayCommand,
  objectSignature: QuirePageStackPaintObjectSignature,
  commandSignatureCache?: QuirePageStackDisplayCommandPaintSignatureCache
): unknown {
  return createQuireDisplayCommandPaintSignature(command, objectSignature,
    child => resolveQuirePageStackDisplayCommandPaintSignature(child, objectSignature, commandSignatureCache));
}

/**
 * Serializes paint signatures for commands intersecting a viewport rect.
 *
 * @param commands - Commands to inspect.
 * @param viewportRect - Page rectangle used to scope paint.
 * @param objectSignature - Stable signature resolver for object-valued dependencies.
 * @param commandSignatureCache - Optional cache for unchanged command payloads.
 * @returns Serialized paint signatures and their count.
 */
function serializeQuirePageStackDisplayCommandPaintSignaturesForRect(
  commands: readonly QuireDisplayCommand[],
  viewportRect: QuireRect,
  objectSignature: QuirePageStackPaintObjectSignature,
  commandSignatureCache?: QuirePageStackDisplayCommandPaintSignatureCache | undefined
): QuireSerializedPaintSignatureList {
  return serializeQuirePageStackDisplayCommandPaintSignatureList(
    commands,
    (command) => createQuirePageStackDisplayCommandPaintSignatureForRect(
      command,
      viewportRect,
      objectSignature,
      commandSignatureCache
    )
  );
}

/**
 * Creates a paint signature for one command when it intersects the viewport.
 *
 * @param command - Command to inspect.
 * @param viewportRect - Page rectangle used to scope paint.
 * @param objectSignature - Stable signature resolver for object-valued dependencies.
 * @param commandSignatureCache - Optional cache for unchanged command payloads.
 * @returns Serialized paint signature, or undefined when the command is outside the rect.
 */
function createQuirePageStackDisplayCommandPaintSignatureForRect(
  command: QuireDisplayCommand,
  viewportRect: QuireRect,
  objectSignature: QuirePageStackPaintObjectSignature,
  commandSignatureCache?: QuirePageStackDisplayCommandPaintSignatureCache | undefined
): string | undefined {
  const commandRect = readQuireDisplayCommandPaintBounds(command);
  if (
    commandRect !== null
    && !doQuireRectsIntersect(commandRect, viewportRect)
  ) {
    return undefined;
  }

  if (command.kind !== "clip") {
    return serializeQuirePageStackDisplayCommandPaintSignature(
      command,
      objectSignature,
      commandSignatureCache
    );
  }

  const childSignatures = serializeQuirePageStackDisplayCommandPaintSignaturesForRect(
    command.commands,
    viewportRect,
    objectSignature,
    commandSignatureCache
  );

  if (childSignatures.count === 0) {
    return undefined;
  }

  return serializeQuirePageStackClipCommandPaintSignature(
    command,
    childSignatures.signature
  );
}

/** Mutable serialized signature writer for one page-stack viewport rectangle. */
interface QuirePageStackPaintSignatureBucket {
  /** Page-local viewport rectangle used for command intersection tests. */
  readonly viewportRect: QuireRect;
  /** Serialized JSON array prefix and command payloads accumulated so far. */
  signature: string;
  /** Number of command signatures already appended. */
  count: number;
}

/**
 * Creates a mutable paint-signature bucket.
 *
 * @param viewportRect - Page rectangle that owns the bucket.
 * @returns Empty mutable paint-signature bucket.
 */
function createPaintSignatureBucket(viewportRect: QuireRect): QuirePageStackPaintSignatureBucket {
  return {
    viewportRect,
    signature: "[",
    count: 0
  };
}

/**
 * Appends serialized command signatures to every matching page bucket.
 *
 * @param commands - Display commands to inspect.
 * @param buckets - Active page-stack signature buckets.
 * @param objectSignature - Stable signature resolver for object-valued dependencies.
 * @param commandSignatureCache - Optional cache for unchanged command payloads.
 */
function appendQuirePageStackDisplayCommandPaintSignaturesToBuckets(
  commands: readonly QuireDisplayCommand[],
  buckets: readonly QuirePageStackPaintSignatureBucket[],
  objectSignature: QuirePageStackPaintObjectSignature,
  commandSignatureCache?: QuirePageStackDisplayCommandPaintSignatureCache | undefined
): void {
  if (buckets.length === 0) {
    return;
  }

  for (const command of commands) {
    const matchedBuckets = filterQuirePageStackPaintSignatureBucketsByCommand(
      command,
      buckets
    );

    if (matchedBuckets.length === 0) {
      continue;
    }

    if (command.kind !== "clip") {
      const commandSignature = serializeQuirePageStackDisplayCommandPaintSignature(
        command,
        objectSignature,
        commandSignatureCache
      );

      for (const bucket of matchedBuckets) {
        appendPaintSignatureToBucket(bucket, commandSignature);
      }
      continue;
    }

    appendQuirePageStackClipPaintSignatureToBuckets(
      command,
      matchedBuckets,
      objectSignature,
      commandSignatureCache
    );
  }
}

/**
 * Appends a serialized clip signature to matching buckets with visible children.
 *
 * @param command - Clip command to inspect.
 * @param buckets - Buckets intersecting the clip bounds.
 * @param objectSignature - Stable signature resolver for object-valued dependencies.
 * @param commandSignatureCache - Optional cache for unchanged command payloads.
 */
function appendQuirePageStackClipPaintSignatureToBuckets(
  command: Extract<QuireDisplayCommand, { readonly kind: "clip" }>,
  buckets: readonly QuirePageStackPaintSignatureBucket[],
  objectSignature: QuirePageStackPaintObjectSignature,
  commandSignatureCache?: QuirePageStackDisplayCommandPaintSignatureCache | undefined
): void {
  const childBuckets = buckets.map((bucket) => createPaintSignatureBucket(bucket.viewportRect));

  appendQuirePageStackDisplayCommandPaintSignaturesToBuckets(
    command.commands,
    childBuckets,
    objectSignature,
    commandSignatureCache
  );

  for (let index = 0; index < childBuckets.length; index += 1) {
    const childBucket = childBuckets[index]!;

    if (childBucket.count === 0) {
      continue;
    }

    appendPaintSignatureToBucket(
      buckets[index]!,
      serializeQuirePageStackClipCommandPaintSignature(
        command,
        finishPaintSignatureBucket(childBucket)
      )
    );
  }
}

/**
 * Filters candidate signature buckets to those intersecting one command.
 *
 * @param command - Display command to inspect.
 * @param buckets - Candidate page buckets.
 * @returns Buckets whose page rect intersects the command paint bounds.
 */
function filterQuirePageStackPaintSignatureBucketsByCommand(
  command: QuireDisplayCommand,
  buckets: readonly QuirePageStackPaintSignatureBucket[]
): readonly QuirePageStackPaintSignatureBucket[] {
  const commandRect = readQuireDisplayCommandPaintBounds(command);

  if (commandRect === null) {
    return buckets;
  }

  const matchedBuckets: QuirePageStackPaintSignatureBucket[] = [];

  for (const bucket of buckets) {
    if (doQuireRectsIntersect(commandRect, bucket.viewportRect)) {
      matchedBuckets.push(bucket);
    }
  }

  return matchedBuckets;
}

/**
 * Appends one serialized command payload to a mutable signature bucket.
 *
 * @param bucket - Bucket receiving the command payload.
 * @param commandSignature - Serialized command paint signature.
 */
function appendPaintSignatureToBucket(
  bucket: QuirePageStackPaintSignatureBucket,
  commandSignature: string
): void {
  bucket.signature += bucket.count === 0 ? commandSignature : `,${commandSignature}`;
  bucket.count += 1;
}

/**
 * Finishes a mutable signature bucket as a serialized JSON array.
 *
 * @param bucket - Bucket to finish.
 * @returns Serialized paint signature for the bucket.
 */
function finishPaintSignatureBucket(bucket: QuirePageStackPaintSignatureBucket): string {
  return `${bucket.signature}]`;
}

/**
 * Serializes display command paint signatures as a JSON array.
 *
 * @param commands - Display commands to serialize.
 * @param serializeCommand - Serializes one command, or skips it with undefined.
 * @returns Serialized paint signatures and their count.
 */
function serializeQuirePageStackDisplayCommandPaintSignatureList(
  commands: readonly QuireDisplayCommand[],
  serializeCommand: (command: QuireDisplayCommand) => string | undefined
): QuireSerializedPaintSignatureList {
  let signature = "[";
  let count = 0;

  for (let index = 0; index < commands.length; index += 1) {
    const commandSignature = serializeCommand(commands[index]!);

    if (commandSignature === undefined) {
      continue;
    }

    signature += count === 0 ? commandSignature : `,${commandSignature}`;
    count += 1;
  }

  return {
    signature: `${signature}]`,
    count
  };
}

/**
 * Serializes one command paint signature through an optional identity cache.
 *
 * @param command - Display command to summarize.
 * @param objectSignature - Stable signature resolver for object-valued dependencies.
 * @param commandSignatureCache - Optional cache for unchanged command payloads.
 * @returns Serialized JSON paint dependency payload.
 */
function serializeQuirePageStackDisplayCommandPaintSignature(
  command: QuireDisplayCommand,
  objectSignature: QuirePageStackPaintObjectSignature,
  commandSignatureCache?: QuirePageStackDisplayCommandPaintSignatureCache | undefined
): string {
  return commandSignatureCache?.resolveSerialized(command, objectSignature) ??
    JSON.stringify(createQuirePageStackDisplayCommandPaintSignature(
      command,
      objectSignature,
      commandSignatureCache
    ));
}

/**
 * Serializes a page-scoped clip command with already serialized child signatures.
 *
 * @param command - Clip command whose child signatures were page-filtered.
 * @param childSignatures - Serialized child signatures that intersect the page.
 * @returns Serialized clip paint signature.
 */
function serializeQuirePageStackClipCommandPaintSignature(
  command: Extract<QuireDisplayCommand, { readonly kind: "clip" }>,
  childSignatures: string
): string {
  return `{"kind":"clip","rect":${JSON.stringify(command.rect)},"commands":${childSignatures}}`;
}

/**
 * Resolves a command signature through an optional identity cache.
 *
 * @param command - Display command to summarize.
 * @param objectSignature - Stable signature resolver for object-valued dependencies.
 * @param commandSignatureCache - Optional cache for unchanged command payloads.
 * @returns JSON-serializable paint dependency payload.
 */
function resolveQuirePageStackDisplayCommandPaintSignature(
  command: QuireDisplayCommand,
  objectSignature: QuirePageStackPaintObjectSignature,
  commandSignatureCache?: QuirePageStackDisplayCommandPaintSignatureCache | undefined
): unknown {
  return commandSignatureCache?.resolve(command, objectSignature) ??
    createQuirePageStackDisplayCommandPaintSignature(
      command,
      objectSignature,
      commandSignatureCache
    );
}
