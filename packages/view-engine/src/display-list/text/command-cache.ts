import {
  translateQuireAffineTransform,
  type QuireDisplayCommand,
  type QuireDocumentRange
} from "@quirekit/renderer";
import type {
  QuireLayoutNode,
  QuireTableLayoutSnapshot
} from "../../layout";
import type { QuireTablePaintModel } from "@quirekit/layout/table";
import {
  readQuireTextFragmentSource,
  type QuireTextFragment
} from "@quirekit/layout/text";
import { createQuireTablePaintModelCacheKey } from "../table/signature";
import {
  createTextFragmentCommandShiftSignature,
  createTextFragmentCommandShiftSignatureByKeyParts
} from "./signature";

/** Counters exposed by the display command cache. */
export interface QuireDisplayCommandCacheSnapshot {
  /** Cache hits where commands were reused. */
  readonly hits: number;
  /** Hits served by the same fragment object and exact command key. */
  readonly identityHits: number;
  /** Hits served by the same fragment object after range/id/geometry rebasing. */
  readonly identityShiftHits: number;
  /** Hits served by shifted value signatures for different fragment objects. */
  readonly shiftSignatureHits: number;
  /** Hits served by a shifted fragment's retained source fragment. */
  readonly sourceShiftHits: number;
  /** Hits where a complete text node command slice was reused. */
  readonly textNodeHits: number;
  /** Misses where a complete text node command slice was unavailable. */
  readonly textNodeMisses: number;
  /** Complete text node command slices stored for later reuse. */
  readonly textNodeStores: number;
  /** Cache misses where commands had to be rebuilt. */
  readonly misses: number;
  /** Command arrays stored after rebuilds. */
  readonly stores: number;
}

/** Stable inputs that affect text fragment command ids and base styling. */
export interface QuireTextFragmentCommandCacheKey {
  /** Layout node id that owns the fragment command. */
  readonly nodeId: string;
  /** Fragment index within the owning layout node. */
  readonly fragmentIndex: number;
  /** Default fill style used when the fragment has no mark color. */
  readonly defaultFillStyle: string;
}

/** Stored command array for one retained text fragment. */
interface QuireTextFragmentCommandCacheEntry {
  /** Cache key captured when the commands were generated. */
  readonly key: QuireTextFragmentCommandCacheKey;
  /** Position-independent signature captured from the text fragment. */
  readonly shiftSignature: string;
  /** Document range represented by the cached text fragment. */
  readonly fragmentRange: QuireDocumentRange;
  /** Paint rectangle represented by the cached text fragment. */
  readonly fragmentRect: QuireTextFragment["rect"];
  /** Commands generated for the retained fragment. */
  readonly commands: readonly QuireDisplayCommand[];
}

/** Stable inputs that affect complete text node command slices. */
interface QuireTextNodeCommandCacheKey {
  /** Layout node id that owns the command slice. */
  readonly nodeId: string;
  /** Default fill style used when fragments have no mark color. */
  readonly defaultFillStyle: string;
}

/** Stored command slice for one retained text layout node. */
interface QuireTextNodeCommandCacheEntry {
  /** Cache key captured when the command slice was generated. */
  readonly key: QuireTextNodeCommandCacheKey;
  /** Fragment-identity signature for projected node objects reallocated per pass. */
  readonly signature: string;
  /** Commands generated for the complete text node. */
  readonly commands: readonly QuireDisplayCommand[];
}

/**
 * Caches generated display commands for retained layout fragments.
 */
export class QuireDisplayCommandCache {
  /** Text fragment commands keyed by retained fragment object identity. */
  private readonly textFragments = new WeakMap<
    QuireTextFragment,
    QuireTextFragmentCommandCacheEntry
  >();
  /** Text fragment commands keyed by paint-equivalent shifted fragment signature. */
  private readonly textFragmentShiftSignatures = new Map<
    string,
    QuireTextFragmentCommandCacheEntry
  >();
  /** Complete text node command slices keyed by retained layout node identity. */
  private readonly textNodes = new WeakMap<
    QuireLayoutNode,
    QuireTextNodeCommandCacheEntry
  >();
  /** Complete text node command slices keyed by retained text-fragment identities. */
  private readonly textNodeSignatures = new Map<string, QuireTextNodeCommandCacheEntry>();
  /** Stable ids for retained text fragment objects used in node command signatures. */
  private readonly textFragmentIdentityIds = new WeakMap<QuireTextFragment, number>();
  /** Table paint models keyed by retained page-projected table snapshot identity. */
  private readonly tablePaintModels =
    new WeakMap<QuireTableLayoutSnapshot, QuireTablePaintModel>();
  /** Table paint models keyed by value-equivalent table paint inputs. */
  private readonly tablePaintModelSignatures = new Map<string, QuireTablePaintModel>();
  /** Display command templates keyed by retained table paint model identity. */
  private readonly tablePaintCommands =
    new WeakMap<QuireTablePaintModel, readonly QuireDisplayCommand[]>();
  /** Maximum strong signature entries retained for non-identical fragments. */
  private readonly maxTextFragmentSignatureEntries = 4096;
  /** Maximum strong text-node command entries retained for reallocated nodes. */
  private readonly maxTextNodeSignatureEntries = 4096;
  /** Maximum strong table paint entries retained for reallocated table snapshots. */
  private readonly maxTablePaintModelSignatureEntries = 512;
  /** Number of cache hits. */
  private hits = 0;
  /** Number of same-object exact-key hits. */
  private identityHits = 0;
  /** Number of same-object shifted-key hits. */
  private identityShiftHits = 0;
  /** Number of shifted signature hits for different objects. */
  private shiftSignatureHits = 0;
  /** Number of shifted source-fragment hits. */
  private sourceShiftHits = 0;
  /** Number of complete text node command slice hits. */
  private textNodeHits = 0;
  /** Number of complete text node command slice misses. */
  private textNodeMisses = 0;
  /** Number of complete text node command slices stored. */
  private textNodeStores = 0;
  /** Number of cache misses. */
  private misses = 0;
  /** Number of command arrays stored. */
  private stores = 0;
  /** Next stable id assigned to a retained text fragment object. */
  private nextTextFragmentIdentityId = 1;

  /**
   * Reads cached commands for a retained text fragment.
   *
   * @param fragment - Retained text fragment object.
   * @param key - Inputs that affect generated command ids and base fill.
   * @returns Cached commands, or undefined when the fragment must be rebuilt.
   */
  getTextFragmentCommands(
    fragment: QuireTextFragment,
    key: QuireTextFragmentCommandCacheKey
  ): readonly QuireDisplayCommand[] | undefined {
    return this.getTextFragmentCommandsByKey(
      fragment,
      key.nodeId,
      key.fragmentIndex,
      key.defaultFillStyle
    );
  }

  /**
   * Reads cached commands without requiring the caller to allocate a key object.
   *
   * Identity hits are the dominant repeat-input path, so the display-list builder
   * passes primitive key parts and this method only materializes the full key when
   * a shifted-signature lookup or cache promotion needs to store it.
   *
   * @param fragment - Retained text fragment object.
   * @param nodeId - Layout node id that owns the fragment command.
   * @param fragmentIndex - Fragment index within the owning layout node.
   * @param defaultFillStyle - Default fill style used when the fragment has no mark color.
   * @param promoteShiftSignatureHit - Whether shifted value hits should be promoted to fragment identity.
   * @returns Cached commands, or undefined when the fragment must be rebuilt.
   */
  getTextFragmentCommandsByKey(
    fragment: QuireTextFragment,
    nodeId: string,
    fragmentIndex: number,
    defaultFillStyle: string,
    promoteShiftSignatureHit = true
  ): readonly QuireDisplayCommand[] | undefined {
    const entry = this.textFragments.get(fragment);

    if (
      entry &&
      textFragmentCommandKeyPartsEqual(
        entry.key,
        nodeId,
        fragmentIndex,
        defaultFillStyle
      )
    ) {
      this.hits += 1;
      this.identityHits += 1;
      return entry.commands;
    }

    if (
      entry &&
      entry.fragmentRect.x === fragment.rect.x &&
      textFragmentCommandShiftKeyPartsEqual(entry.key, nodeId, defaultFillStyle)
    ) {
      const key = createTextFragmentCommandCacheKey(
        nodeId,
        fragmentIndex,
        defaultFillStyle
      );
      const commands = remapTextFragmentCommands(
        entry.commands,
        fragment.range.from - entry.fragmentRange.from,
        fragment.rect.x - entry.fragmentRect.x,
        fragment.rect.y - entry.fragmentRect.y,
        createTextFragmentCommandBaseId(entry.key),
        createTextFragmentCommandBaseId(key)
      );
      const currentEntry: QuireTextFragmentCommandCacheEntry = {
        key,
        shiftSignature: entry.shiftSignature,
        fragmentRange: fragment.range,
        fragmentRect: fragment.rect,
        commands
      };
      this.storeTextFragmentCommandEntry(fragment, currentEntry);
      this.hits += 1;
      this.identityShiftHits += 1;
      return commands;
    }

    const sourceCommands = this.getTextFragmentCommandsFromShiftedSource(
      fragment,
      nodeId,
      fragmentIndex,
      defaultFillStyle,
      promoteShiftSignatureHit
    );
    if (sourceCommands !== undefined) {
      return sourceCommands;
    }

    const shiftSignature = createTextFragmentCommandShiftSignatureByKeyParts(
      fragment,
      nodeId,
      defaultFillStyle
    );
    const shiftSignatureEntry = this.textFragmentShiftSignatures.get(shiftSignature);

    if (
      shiftSignatureEntry &&
      // Rebuild horizontal placement from current fragments: adding a delta to
      // old page coordinates can round differently from source + column origin.
      shiftSignatureEntry.fragmentRect.x === fragment.rect.x &&
      textFragmentCommandShiftKeyPartsEqual(
        shiftSignatureEntry.key,
        nodeId,
        defaultFillStyle
      )
    ) {
      const commands = remapTextFragmentCommands(
        shiftSignatureEntry.commands,
        fragment.range.from - shiftSignatureEntry.fragmentRange.from,
        fragment.rect.x - shiftSignatureEntry.fragmentRect.x,
        fragment.rect.y - shiftSignatureEntry.fragmentRect.y,
        createTextFragmentCommandBaseId(shiftSignatureEntry.key),
        createTextFragmentCommandBaseIdFromParts(nodeId, fragmentIndex)
      );
      const key = createTextFragmentCommandCacheKey(
        nodeId,
        fragmentIndex,
        defaultFillStyle
      );
      const currentEntry: QuireTextFragmentCommandCacheEntry = {
        key,
        shiftSignature,
        fragmentRange: fragment.range,
        fragmentRect: fragment.rect,
        commands
      };
      if (promoteShiftSignatureHit) {
        this.storeTextFragmentCommandEntry(fragment, currentEntry);
      } else {
        this.storeTextFragmentCommandIdentityEntry(fragment, currentEntry);
      }
      this.hits += 1;
      this.shiftSignatureHits += 1;
      return commands;
    }

    this.misses += 1;
    return undefined;
  }

  /**
   * Stores generated commands for a retained text fragment.
   *
   * @param fragment - Text fragment object used as the cache identity.
   * @param key - Inputs that affect generated command ids and base fill.
   * @param commands - Commands generated for the fragment.
   */
  setTextFragmentCommands(
    fragment: QuireTextFragment,
    key: QuireTextFragmentCommandCacheKey,
    commands: readonly QuireDisplayCommand[]
  ): void {
    const shiftSignature = createTextFragmentCommandShiftSignature(fragment, key);
    const entry: QuireTextFragmentCommandCacheEntry = {
      key,
      shiftSignature,
      fragmentRange: fragment.range,
      fragmentRect: fragment.rect,
      commands
    };

    this.storeTextFragmentCommandEntry(fragment, entry);
    this.stores += 1;
  }

  /**
   * Reads cached commands for a complete retained text node.
   *
   * @param node - Retained layout node object.
   * @param nodeId - Layout node id expected by the current display-list build.
   * @param defaultFillStyle - Default fill style used when fragments have no mark color.
   * @returns Cached command slice, or undefined on a miss.
   */
  getTextNodeCommandsByKey(
    node: QuireLayoutNode,
    nodeId: string,
    defaultFillStyle: string,
    fragments: readonly QuireTextFragment[]
  ): readonly QuireDisplayCommand[] | undefined {
    const entry = this.textNodes.get(node);
    const signature = this.createTextNodeCommandSignature(
      nodeId,
      defaultFillStyle,
      fragments
    );

    if (
      entry !== undefined &&
      entry.key.nodeId === nodeId &&
      entry.key.defaultFillStyle === defaultFillStyle &&
      entry.signature === signature
    ) {
      this.hits += entry.commands.length;
      this.textNodeHits += 1;
      return entry.commands;
    }

    const signatureEntry = this.textNodeSignatures.get(signature);
    if (
      signatureEntry !== undefined &&
      signatureEntry.key.nodeId === nodeId &&
      signatureEntry.key.defaultFillStyle === defaultFillStyle
    ) {
      this.textNodes.set(node, signatureEntry);
      this.hits += signatureEntry.commands.length;
      this.textNodeHits += 1;
      return signatureEntry.commands;
    }

    this.textNodeMisses += 1;
    return undefined;
  }

  /**
   * Stores generated commands for a complete retained text node.
   *
   * @param node - Retained layout node object.
   * @param nodeId - Layout node id that owns the command slice.
   * @param defaultFillStyle - Default fill style used when fragments have no mark color.
   * @param commands - Commands generated for the complete node.
   * @returns Nothing.
   */
  setTextNodeCommandsByKey(
    node: QuireLayoutNode,
    nodeId: string,
    defaultFillStyle: string,
    fragments: readonly QuireTextFragment[],
    commands: readonly QuireDisplayCommand[]
  ): void {
    const entry: QuireTextNodeCommandCacheEntry = {
      key: { nodeId, defaultFillStyle },
      signature: this.createTextNodeCommandSignature(
        nodeId,
        defaultFillStyle,
        fragments
      ),
      commands
    };

    this.textNodes.set(node, entry);
    this.textNodeSignatures.delete(entry.signature);
    this.textNodeSignatures.set(entry.signature, entry);
    trimStringKeyedCacheEntries(
      this.textNodeSignatures,
      this.maxTextNodeSignatureEntries
    );
    this.textNodeStores += 1;
  }

  /**
   * Reads a cached table paint model for a retained projected table snapshot.
   *
   * @param table - Page-projected table snapshot used as the cache identity.
   * @returns Cached paint model, or undefined when table paint must be rebuilt.
   */
  getTablePaintModel(
    table: QuireTableLayoutSnapshot
  ): QuireTablePaintModel | undefined {
    const retainedModel = this.tablePaintModels.get(table);

    if (retainedModel !== undefined) {
      return retainedModel;
    }

    const signature = createQuireTablePaintModelCacheKey(table);
    const shiftedModel = this.tablePaintModelSignatures.get(signature);

    if (shiftedModel !== undefined) {
      this.tablePaintModels.set(table, shiftedModel);
    }

    return shiftedModel;
  }

  /**
   * Stores a table paint model for a retained projected table snapshot.
   *
   * @param table - Page-projected table snapshot used as the cache identity.
   * @param model - Paint model built from the table snapshot.
   * @returns Nothing.
   */
  setTablePaintModel(
    table: QuireTableLayoutSnapshot,
    model: QuireTablePaintModel
  ): void {
    const signature = createQuireTablePaintModelCacheKey(table);

    this.tablePaintModels.set(table, model);
    this.tablePaintModelSignatures.delete(signature);
    this.tablePaintModelSignatures.set(signature, model);
    trimStringKeyedCacheEntries(
      this.tablePaintModelSignatures,
      this.maxTablePaintModelSignatureEntries
    );
  }

  /**
   * Reads cached display command templates for a table paint model.
   *
   * @param model - Paint model whose deterministic commands should be reused.
   * @returns Cached commands, or undefined when the model must be compiled.
   */
  getTablePaintCommands(
    model: QuireTablePaintModel
  ): readonly QuireDisplayCommand[] | undefined {
    return this.tablePaintCommands.get(model);
  }

  /**
   * Stores deterministic table paint command templates for a paint model.
   *
   * Table clip commands stored here must remain empty templates. Visible cell
   * content is attached by the display-list builder with a fresh clip command.
   *
   * @param model - Paint model used as the retained command-template identity.
   * @param commands - Deterministic empty-clip/background/border commands.
   * @returns Nothing.
   */
  setTablePaintCommands(
    model: QuireTablePaintModel,
    commands: readonly QuireDisplayCommand[]
  ): void {
    this.tablePaintCommands.set(model, commands);
  }

  /**
   * Reads cache counters for tests and diagnostics.
   *
   * @returns Snapshot of display command cache counters.
   */
  snapshot(): QuireDisplayCommandCacheSnapshot {
    return {
      hits: this.hits,
      identityHits: this.identityHits,
      identityShiftHits: this.identityShiftHits,
      shiftSignatureHits: this.shiftSignatureHits,
      sourceShiftHits: this.sourceShiftHits,
      textNodeHits: this.textNodeHits,
      textNodeMisses: this.textNodeMisses,
      textNodeStores: this.textNodeStores,
      misses: this.misses,
      stores: this.stores
    };
  }

  /**
   * Reads commands from a shifted fragment's retained source entry.
   *
   * @param fragment - Current shifted fragment.
   * @param nodeId - Layout node id that owns the fragment command.
   * @param fragmentIndex - Fragment index within the owning layout node.
   * @param defaultFillStyle - Default fill style used when the fragment has no mark color.
   * @param promoteShiftSignatureHit - Whether the remapped entry should be promoted.
   * @returns Remapped cached commands, or undefined when no retained source entry exists.
   */
  private getTextFragmentCommandsFromShiftedSource(
    fragment: QuireTextFragment,
    nodeId: string,
    fragmentIndex: number,
    defaultFillStyle: string,
    promoteShiftSignatureHit: boolean
  ): readonly QuireDisplayCommand[] | undefined {
    const source = readQuireTextFragmentSource(fragment);
    if (source === undefined) {
      return undefined;
    }

    const entry = this.textFragments.get(source);
    if (
      entry === undefined ||
      entry.fragmentRect.x !== fragment.rect.x ||
      !textFragmentCommandShiftKeyPartsEqual(entry.key, nodeId, defaultFillStyle)
    ) {
      return undefined;
    }

    const commands = remapTextFragmentCommands(
      entry.commands,
      fragment.range.from - entry.fragmentRange.from,
      fragment.rect.x - entry.fragmentRect.x,
      fragment.rect.y - entry.fragmentRect.y,
      createTextFragmentCommandBaseId(entry.key),
      createTextFragmentCommandBaseIdFromParts(nodeId, fragmentIndex)
    );
    const key = createTextFragmentCommandCacheKey(
      nodeId,
      fragmentIndex,
      defaultFillStyle
    );
    const currentEntry: QuireTextFragmentCommandCacheEntry = {
      key,
      shiftSignature: entry.shiftSignature,
      fragmentRange: fragment.range,
      fragmentRect: fragment.rect,
      commands
    };
    if (promoteShiftSignatureHit) {
      this.storeTextFragmentCommandEntry(fragment, currentEntry);
    } else {
      this.storeTextFragmentCommandIdentityEntry(fragment, currentEntry);
    }

    this.hits += 1;
    this.sourceShiftHits += 1;

    return commands;
  }

  /**
   * Stores a command entry under both object identity and shifted value signature.
   *
   * @param fragment - Text fragment object used for fast identity hits.
   * @param entry - Command cache entry already aligned to the fragment.
   * @returns Nothing.
   */
  private storeTextFragmentCommandEntry(
    fragment: QuireTextFragment,
    entry: QuireTextFragmentCommandCacheEntry
  ): void {
    this.textFragments.set(fragment, entry);
    this.textFragmentShiftSignatures.delete(entry.shiftSignature);
    this.textFragmentShiftSignatures.set(entry.shiftSignature, entry);
    trimStringKeyedCacheEntries(
      this.textFragmentShiftSignatures,
      this.maxTextFragmentSignatureEntries
    );
  }

  /**
   * Stores a command entry only by fragment identity.
   *
   * Long fragment lists intentionally avoid promotion into the strong shifted
   * signature map, but a WeakMap identity entry lets the next shifted source
   * fragment reuse commands without recomputing its value signature.
   *
   * @param fragment - Text fragment object used for fast source identity hits.
   * @param entry - Command cache entry already aligned to the fragment.
   * @returns Nothing.
   */
  private storeTextFragmentCommandIdentityEntry(
    fragment: QuireTextFragment,
    entry: QuireTextFragmentCommandCacheEntry
  ): void {
    this.textFragments.set(fragment, entry);
  }

  /**
   * Creates a text-node command signature from retained fragment identities.
   *
   * @param nodeId - Layout node id that owns the command slice.
   * @param defaultFillStyle - Default fill style used when fragments have no mark color.
   * @param fragments - Text fragments emitted by the node in command order.
   * @returns Stable signature for reallocated projected text nodes.
   */
  private createTextNodeCommandSignature(
    nodeId: string,
    defaultFillStyle: string,
    fragments: readonly QuireTextFragment[]
  ): string {
    let signature = `${nodeId}\u0000${defaultFillStyle}\u0000${fragments.length}`;
    for (let index = 0; index < fragments.length; index += 1) {
      signature += `\u0000${this.getTextFragmentIdentityId(fragments[index]!)}`;
    }
    return signature;
  }

  /**
   * Resolves a stable identity id for a retained text fragment object.
   *
   * @param fragment - Text fragment object used by layout and display-list caches.
   * @returns Stable numeric id for the fragment object.
   */
  private getTextFragmentIdentityId(fragment: QuireTextFragment): number {
    const existing = this.textFragmentIdentityIds.get(fragment);
    if (existing !== undefined) {
      return existing;
    }

    const next = this.nextTextFragmentIdentityId;
    this.nextTextFragmentIdentityId += 1;
    this.textFragmentIdentityIds.set(fragment, next);
    return next;
  }
}

/**
 * Creates a text fragment command cache key from primitive key parts.
 *
 * @param nodeId - Layout node id that owns the fragment command.
 * @param fragmentIndex - Fragment index within the owning layout node.
 * @param defaultFillStyle - Default fill style used when the fragment has no mark color.
 * @returns Cache key object used for shifted-signature paths and stores.
 */
function createTextFragmentCommandCacheKey(
  nodeId: string,
  fragmentIndex: number,
  defaultFillStyle: string
): QuireTextFragmentCommandCacheKey {
  return {
    nodeId,
    fragmentIndex,
    defaultFillStyle
  };
}

/**
 * Shifts cached command ranges, translates geometry, and rebases command ids.
 *
 * @param commands - Cached commands generated for an earlier fragment range.
 * @param delta - Document offset to add to command ranges.
 * @param dx - Horizontal geometry offset to add to command coordinates.
 * @param dy - Vertical geometry offset to add to command coordinates.
 * @param previousBaseId - Base command id used by the cached fragment.
 * @param currentBaseId - Base command id required by the current fragment.
 * @returns Commands updated to the current fragment position.
 */
function remapTextFragmentCommands(
  commands: readonly QuireDisplayCommand[],
  delta: number,
  dx: number,
  dy: number,
  previousBaseId: string,
  currentBaseId: string
): readonly QuireDisplayCommand[] {
  if (delta === 0 && dx === 0 && dy === 0 && previousBaseId === currentBaseId) {
    return commands;
  }

  return commands.map((command) =>
    remapTextFragmentCommand(command, delta, dx, dy, previousBaseId, currentBaseId)
  );
}

/**
 * Shifts one display command range, translates geometry, and rebases its id.
 *
 * @param command - Cached command generated for an earlier fragment range.
 * @param delta - Document offset to add to command ranges.
 * @param dx - Horizontal geometry offset to add to command coordinates.
 * @param dy - Vertical geometry offset to add to command coordinates.
 * @param previousBaseId - Base command id used by the cached fragment.
 * @param currentBaseId - Base command id required by the current fragment.
 * @returns Command updated to the current fragment position.
 */
function remapTextFragmentCommand(
  command: QuireDisplayCommand,
  delta: number,
  dx: number,
  dy: number,
  previousBaseId: string,
  currentBaseId: string
): QuireDisplayCommand {
  const shifted = translateTextFragmentCommandGeometry({
    ...command,
    id: rebaseTextFragmentCommandId(command.id, previousBaseId, currentBaseId),
    ...(command.range === undefined
      ? {}
      : { range: shiftDocumentRange(command.range, delta) })
  }, dx, dy);

  if (shifted.kind !== "clip") {
    return shifted;
  }

  return {
    ...shifted,
    commands: shifted.commands.map((child) =>
      remapTextFragmentCommand(child, delta, dx, dy, previousBaseId, currentBaseId)
    )
  };
}

/**
 * Translates paint geometry for a cached text-fragment command.
 *
 * @param command - Command with current range and id already applied.
 * @param dx - Horizontal geometry offset.
 * @param dy - Vertical geometry offset.
 * @returns Command with geometry translated by the offsets.
 */
function translateTextFragmentCommandGeometry(
  command: QuireDisplayCommand,
  dx: number,
  dy: number
): QuireDisplayCommand {
  if (dx === 0 && dy === 0) {
    return command;
  }

  switch (command.kind) {
    case "text":
    case "glyph-run":
      return {
        ...command,
        rect: translatePosition(command.rect, dx, dy),
        origin: translatePosition(command.origin, dx, dy)
      };
    case "fill-rect":
    case "caret":
    case "image":
      return {
        ...command,
        rect: translatePosition(command.rect, dx, dy)
      };
    case "line":
      return {
        ...command,
        from: translatePosition(command.from, dx, dy),
        to: translatePosition(command.to, dx, dy)
      };
    case "path":
      return {
        ...command,
        rect: translatePosition(command.rect, dx, dy),
        segments: command.segments.map((segment) => {
          switch (segment.kind) {
            case "move-to":
            case "line-to":
              return { ...segment, point: translatePosition(segment.point, dx, dy) };
            case "quadratic-curve-to":
              return {
                ...segment,
                control: translatePosition(segment.control, dx, dy),
                point: translatePosition(segment.point, dx, dy)
              };
            case "bezier-curve-to":
              return {
                ...segment,
                control1: translatePosition(segment.control1, dx, dy),
                control2: translatePosition(segment.control2, dx, dy),
                point: translatePosition(segment.point, dx, dy)
              };
            case "close-path":
              return segment;
          }
        })
      };
    case "clip":
      return {
        ...command,
        rect: translatePosition(command.rect, dx, dy),
        ...(command.transform === undefined
          ? {}
          : {
              transform: translateQuireAffineTransform(
                command.transform,
                dx,
                dy
              )
            }),
        ...(command.visualBounds === undefined
          ? {}
          : { visualBounds: translatePosition(command.visualBounds, dx, dy) })
      };
  }
}

/**
 * Translates point or rectangle coordinates while preserving every other field.
 *
 * @param position - Geometry with coordinates to translate.
 * @param dx - Horizontal offset.
 * @param dy - Vertical offset.
 * @returns Geometry with translated coordinates and unchanged extra fields.
 */
function translatePosition<Position extends { readonly x: number; readonly y: number }>(
  position: Position,
  dx: number,
  dy: number
): Position {
  return {
    ...position,
    x: position.x + dx,
    y: position.y + dy
  };
}

/**
 * Creates the base display command id for a cached text fragment key.
 *
 * @param key - Text fragment command cache key.
 * @returns Base command id used by generated text and decoration commands.
 */
function createTextFragmentCommandBaseId(
  key: QuireTextFragmentCommandCacheKey
): string {
  return createTextFragmentCommandBaseIdFromParts(key.nodeId, key.fragmentIndex);
}

/**
 * Creates the base display command id from primitive key parts.
 *
 * @param nodeId - Layout node id that owns the fragment command.
 * @param fragmentIndex - Fragment index within the owning layout node.
 * @returns Base command id used by generated text and decoration commands.
 */
function createTextFragmentCommandBaseIdFromParts(
  nodeId: string,
  fragmentIndex: number
): string {
  return fragmentIndex === 0 ? `${nodeId}:text` : `${nodeId}:text-${fragmentIndex}`;
}

/**
 * Rebases a cached command id from the previous fragment id to the current one.
 *
 * @param id - Cached display command id.
 * @param previousBaseId - Base command id used by the cached fragment.
 * @param currentBaseId - Base command id required by the current fragment.
 * @returns Display command id for the current fragment.
 */
function rebaseTextFragmentCommandId(
  id: string,
  previousBaseId: string,
  currentBaseId: string
): string {
  if (previousBaseId === currentBaseId) {
    return id;
  }

  if (id === previousBaseId) {
    return currentBaseId;
  }

  const childPrefix = `${previousBaseId}:`;
  if (id.startsWith(childPrefix)) {
    return `${currentBaseId}${id.slice(previousBaseId.length)}`;
  }

  return id;
}

/**
 * Shifts one document range by a document-position delta.
 *
 * @param range - Range to shift.
 * @param delta - Document offset to add.
 * @returns Shifted document range.
 */
function shiftDocumentRange(
  range: QuireDocumentRange,
  delta: number
): QuireDocumentRange {
  return {
    from: range.from + delta,
    to: range.to + delta
  };
}

/**
 * Creates an empty display command cache.
 *
 * @returns Display command cache.
 */
export function createQuireDisplayCommandCache(): QuireDisplayCommandCache {
  return new QuireDisplayCommandCache();
}

/**
 * Compares a stored cache key with primitive key parts.
 *
 * @param a - Stored cache key.
 * @param nodeId - Layout node id expected by the current lookup.
 * @param fragmentIndex - Fragment index expected by the current lookup.
 * @param defaultFillStyle - Default fill style expected by the current lookup.
 * @returns Whether the stored key exactly matches the supplied key parts.
 */
function textFragmentCommandKeyPartsEqual(
  a: QuireTextFragmentCommandCacheKey,
  nodeId: string,
  fragmentIndex: number,
  defaultFillStyle: string
): boolean {
  return a.nodeId === nodeId
    && a.fragmentIndex === fragmentIndex
    && a.defaultFillStyle === defaultFillStyle;
}

/**
 * Compares a stored cache key with primitive range-shift key parts.
 *
 * @param a - Stored cache key.
 * @param nodeId - Layout node id expected by the current lookup.
 * @param defaultFillStyle - Default fill style expected by the current lookup.
 * @returns Whether both keys are compatible after fragment id rebasing.
 */
function textFragmentCommandShiftKeyPartsEqual(
  a: QuireTextFragmentCommandCacheKey,
  nodeId: string,
  defaultFillStyle: string
): boolean {
  return a.nodeId === nodeId
    && a.defaultFillStyle === defaultFillStyle;
}

/**
 * Trims the signature map to its configured maximum, oldest entries first.
 *
 * @param entries - Strong signature map to trim.
 * @param maxEntries - Maximum number of entries to retain.
 * @returns Nothing.
 */
function trimStringKeyedCacheEntries<Entry>(
  entries: Map<string, Entry>,
  maxEntries: number
): void {
  while (entries.size > maxEntries) {
    const firstKey = entries.keys().next().value;

    if (typeof firstKey !== "string") {
      break;
    }

    entries.delete(firstKey);
  }
}
