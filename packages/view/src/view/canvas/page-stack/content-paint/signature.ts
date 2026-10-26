import type { QuireDisplayCommand } from "@quirekit/renderer";
import {
  createQuirePageStackDisplayListPaintSignatureForRect,
  createQuirePageStackRectPaintSignature,
  QuirePageStackDisplayCommandPaintSignatureCache,
  QuirePageStackPaintObjectSignatureResolver
} from "../../../shared";
import type { CanvasPageStackContentPaintRequest } from "./types";
import { CanvasPageContentVersionRegistry, hashCanvasPageContentText } from "./version-registry";

/** Resolves exact page content versions from canonical paint dependencies. */
export class CanvasPageStackContentVersionResolver {
  /** Stable ids for glyph painters and image sources that affect paint output. */
  private readonly objectSignatureResolver = new QuirePageStackPaintObjectSignatureResolver();
  /** Reused command signatures for identity-stable display commands. */
  private readonly commandSignatureCache = new QuirePageStackDisplayCommandPaintSignatureCache();
  /** Hashes of serialized command signatures, kept with their command objects. */
  private readonly commandHashes = new WeakMap<QuireDisplayCommand, number>();
  /** Object-valued paint dependency ids, bound once. */
  private readonly objectSignature = (value: object | undefined): string =>
    this.objectSignatureResolver.resolve(value);
  /** Registered versions shared by every page of this cache. */
  private readonly registry: CanvasPageContentVersionRegistry;

  /**
   * Creates an empty resolver.
   *
   * @param onEvict - Receives versions that can never be resolved again.
   */
  constructor(onEvict: (contentVersion: number) => void) {
    this.registry = new CanvasPageContentVersionRegistry(64, onEvict);
  }

  /**
   * Resolves the version of all persistent inputs that affect one page bitmap.
   *
   * Surface-local clear epochs are intentionally excluded: they determine
   * whether a live canvas remains valid, not whether another canvas can restore
   * the same canonical page artifact. Page-scoped commands are compared one by
   * one, so no page-sized string is built.
   *
   * @param request - Retained page chunk, paint dependencies, and backing geometry.
   * @returns Registered version, equal for exactly equal inputs.
   */
  resolve(request: CanvasPageStackContentPaintRequest): number {
    const { frame } = request;
    const scalars = [
      `chunk:${request.chunkKey}`,
      `page:${frame.pageIndex}`,
      `rect:${createQuirePageStackRectPaintSignature(frame.pageRect)}`,
      `dpr:${request.devicePixelRatio}`,
      `canvas:${frame.content.width}x${frame.content.height}`,
      `painter:${this.objectSignatureResolver.resolve(request.glyphRunPainter)}`
    ].join("|");
    if (!request.displayListIsViewportScoped) {
      const whole = createQuirePageStackDisplayListPaintSignatureForRect(
        request.displayList,
        request.viewportRect,
        this.objectSignature,
        this.commandSignatureCache
      );
      const hash = hashCanvasPageContentText(whole);
      return this.registry.resolve({ scalars, ownerKeys: request.sourceOwnerKeys, commandCount: 1,
        readCommand: () => whole, readCommandHash: () => hash });
    }
    const commands = request.displayList.commands;
    return this.registry.resolve({
      scalars,
      ownerKeys: request.sourceOwnerKeys,
      commandCount: commands.length,
      readCommand: (index) => this.commandSignatureCache.resolveSerialized(commands[index]!, this.objectSignature),
      readCommandHash: (index) => this.readCommandHash(commands[index]!)
    });
  }

  /**
   * Reads the cached hash of one command's serialized paint signature.
   *
   * @param command - Display command.
   * @returns 32-bit hash.
   */
  private readCommandHash(command: QuireDisplayCommand): number {
    const cached = this.commandHashes.get(command);
    if (cached !== undefined) return cached;
    const hash = hashCanvasPageContentText(
      this.commandSignatureCache.resolveSerialized(command, this.objectSignature)
    );
    this.commandHashes.set(command, hash);
    return hash;
  }
}
