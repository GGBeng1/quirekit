import type { QuireBlockLayoutInput } from "../engine/block-types";
import type {
  QuireRetainedBlockDirtyPriority,
  QuireRetainedBlockLayoutRecord,
  QuireRetainedBlockReconcileOptions
} from "./types";

/** Identity tokens for inputs that do not yet expose a structural signature. */
const identityTokens = new WeakMap<object, number>();
let nextIdentityToken = 1;

/**
 * Creates one retained block record at local origin.
 *
 * @param input - Current block input.
 * @param dependencySignature - Validated position-independent dependency signature.
 * @param dirtyPriority - Dirty priority assigned by reconciliation.
 * @param origin - Current flow origin used by the local builder.
 * @param options - Reconciliation inputs including the local builder.
 * @returns New local retained record.
 */
export function createQuireRetainedBlockRecord(
  input: QuireBlockLayoutInput,
  dependencySignature: string,
  dirtyPriority: QuireRetainedBlockDirtyPriority,
  origin: { readonly x: number; readonly y: number },
  options: QuireRetainedBlockReconcileOptions
): QuireRetainedBlockLayoutRecord {
  const localBox = options.buildLocalBlock(input, origin);

  return {
    id: input.id,
    input,
    dependencySignature,
    localBox,
    intrinsicHeight: localBox.rect.height,
    ...(localBox.table === undefined ? {} : { tableSnapshot: localBox.table }),
    dirtyPriority
  };
}

/**
 * Creates a position-independent dependency signature for one block input.
 *
 * @param input - Current block input.
 * @param options - Current geometry and dependency epochs.
 * @returns Stable reconciliation signature.
 */
export function createQuireRetainedBlockDependencySignature(
  input: QuireBlockLayoutInput,
  options: QuireRetainedBlockReconcileOptions
): string {
  const epochs = options.dependencyEpochs;
  const localSignature = input.layoutSignature ?? createIdentityFallback(input);

  return [
    localSignature,
    ...(input.inlineContentWidth === undefined ? [] : [input.inlineContentWidth]),
    options.width,
    options.blockHeight,
    options.blockGap,
    options.fragmentBlockSize ?? "unbounded",
    epochs.font,
    epochs.image,
    epochs.lineBreaker,
    epochs.decoration
  ].join("\u0001");
}

/**
 * Resolves reconciliation priority from canonical invalidation.
 *
 * @param input - Candidate top-level block input.
 * @param index - Current top-level block index.
 * @param options - Reconciliation options carrying the dirty range.
 * @returns Dirty priority for the candidate.
 */
export function resolveQuireRetainedBlockDirtyPriority(
  input: QuireBlockLayoutInput,
  index: number,
  options: QuireRetainedBlockReconcileOptions
): QuireRetainedBlockDirtyPriority {
  const dirty = options.layoutDirtyRange;
  if (dirty === undefined || dirty === null) {
    return "clean";
  }

  if (
    dirty.reason === "width-change" ||
    dirty.reason === "font-epoch" ||
    dirty.reason === "image-epoch" ||
    dirty.reason === "fallback"
  ) {
    return "global";
  }

  if (input.id === dirty.tableTarget?.tableId) {
    return dirty.tableTarget.reason === "cell-content"
      ? "local-content"
      : "local-structure";
  }

  if (index < dirty.firstTopLevelBlockIndex) {
    return "clean";
  }

  if (index === dirty.firstTopLevelBlockIndex) {
    return dirty.reason === "table-structure" || dirty.reason === "table-style"
      ? "local-structure"
      : "local-content";
  }

  const changed = dirty.changedRange;
  if (input.range.from >= changed.to || input.range.to <= changed.from) {
    return "clean";
  }

  return dirty.reason === "table-structure" || dirty.reason === "table-style"
    ? "local-structure"
    : "local-content";
}

/**
 * Resolves an internal identity token without inventing cross-version identity.
 *
 * @param input - Current unsigned block input.
 * @returns Token stable for an exact input or provider source node.
 */
function createIdentityFallback(input: QuireBlockLayoutInput): string {
  if (input.layoutProvider !== undefined) {
    return [
      `provider:${input.layoutProvider.provider.id}`,
      createObjectIdentityToken(input.layoutProvider.sourceIdentity),
      input.layoutProvider.sourcePath.join(".")
    ].join(":");
  }

  return createObjectIdentityToken(input);
}

/**
 * Creates an internal token for one exact source object.
 *
 * @param source - Source object whose identity is authoritative.
 * @returns Stable process-local identity token.
 */
function createObjectIdentityToken(source: object): string {
  let token = identityTokens.get(source);
  if (token === undefined) {
    token = nextIdentityToken;
    nextIdentityToken += 1;
    identityTokens.set(source, token);
  }

  return `identity:${token}`;
}
