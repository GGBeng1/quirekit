import {
  failDocxContributionRegistration,
  type DocxContributionRegistrationErrorCode
} from "../registration-error.js";
import type {
  DocxContributionEntry,
  DocxMarkAttributeCodec
} from "../types.js";

type AnyDocxContributionEntry = DocxContributionEntry<any, any, any>;

/** Mutable lookup state used while registering composable mark attributes. */
export interface DocxMarkAttributeClaimState<
  Entry extends AnyDocxContributionEntry
> {
  /** Partial importers grouped by LitAST and model mark pair. */
  readonly importers: Map<string, Entry[]>;
  /** Partial exporters grouped by model and LitAST mark pair. */
  readonly exporters: Map<string, Entry[]>;
  /** Exact source-attribute import claims. */
  readonly importSourceClaims: Map<string, Entry>;
  /** Exact target-attribute export claims. */
  readonly exportTargetClaims: Map<string, Entry>;
}

/**
 * Registers one composable mark-attribute codec and its exact source claims.
 *
 * @param entry - Owning contribution entry.
 * @param codec - Narrowed mark-attribute codec.
 * @param state - Mutable direction-specific lookups.
 */
export function registerMarkAttributeCodec<
  Entry extends AnyDocxContributionEntry
>(
  entry: Entry,
  codec: DocxMarkAttributeCodec<any>,
  state: DocxMarkAttributeClaimState<Entry>
): void {
  if (codec.import !== undefined) {
    validateAttributeNames(entry, codec.import.litMarkTypes, "LitAST mark");
    validateAttributeNames(entry, codec.import.modelMarkTypes, "model mark");
    validateAttributeNames(
      entry,
      codec.import.sourceAttributes,
      "source"
    );
    validateAttributeNames(
      entry,
      codec.import.modelAttributes,
      "model"
    );
    for (const litType of codec.import.litMarkTypes) {
      for (const modelType of codec.import.modelMarkTypes) {
        const pair = markPairKey(litType, modelType);
        appendEntry(state.importers, pair, entry);
        registerAttributeClaims(
          entry,
          codec.import.sourceAttributes,
          pair,
          state.importSourceClaims,
          "duplicate-mark-attribute-import-source-claim"
        );
      }
    }
  }
  if (codec.export !== undefined) {
    validateAttributeNames(entry, codec.export.modelMarkTypes, "model mark");
    validateAttributeNames(entry, codec.export.litMarkTypes, "LitAST mark");
    validateAttributeNames(
      entry,
      codec.export.modelAttributes,
      "model"
    );
    validateAttributeNames(
      entry,
      codec.export.targetAttributes,
      "target"
    );
    for (const modelType of codec.export.modelMarkTypes) {
      for (const litType of codec.export.litMarkTypes) {
        const pair = markPairKey(litType, modelType);
        appendEntry(state.exporters, pair, entry);
        registerAttributeClaims(
          entry,
          codec.export.targetAttributes,
          pair,
          state.exportTargetClaims,
          "duplicate-mark-attribute-export-target-claim"
        );
      }
    }
  }
}

/**
 * Builds the stable composite key shared by both attribute directions.
 *
 * @param litMarkType - Exact LitAST mark type.
 * @param modelMarkType - Exact model mark type.
 * @returns Collision-safe pair key.
 */
export function markPairKey(
  litMarkType: string,
  modelMarkType: string
): string {
  return `${litMarkType}\u0000${modelMarkType}`;
}

/**
 * Appends an entry to one source-order pair group.
 *
 * @param target - Pair lookup being populated.
 * @param key - Composite mark-pair key.
 * @param entry - Attribute codec to append.
 */
function appendEntry<Entry>(
  target: Map<string, Entry[]>,
  key: string,
  entry: Entry
): void {
  target.set(key, [...(target.get(key) ?? []), entry]);
}

/**
 * Rejects empty or structural attribute names.
 *
 * @param entry - Owning contribution.
 * @param names - Declared attribute names.
 * @param role - Human-readable attribute role.
 */
function validateAttributeNames(
  entry: AnyDocxContributionEntry,
  names: readonly string[],
  role: string
): void {
  if (names.length === 0
    || names.some((name) => name.trim().length === 0 || name === "$type")) {
    failDocxContributionRegistration(
      "empty-claim",
      `DOCX mark-attribute codec "${entry.contribution.id}" requires non-empty, non-structural ${role} attribute claims.`
    );
  }
}

/**
 * Registers collision-sensitive source or target attribute claims.
 *
 * @param entry - Owning contribution.
 * @param names - Exact source or target attribute names.
 * @param pair - Composite LitAST/model mark pair.
 * @param claims - Mutable exact lookup.
 * @param code - Direction-specific duplicate error.
 */
function registerAttributeClaims<Entry extends AnyDocxContributionEntry>(
  entry: Entry,
  names: readonly string[],
  pair: string,
  claims: Map<string, Entry>,
  code: DocxContributionRegistrationErrorCode
): void {
  for (const name of names) {
    const key = `${pair}\u0000${name}`;
    const duplicate = claims.get(key);
    if (duplicate !== undefined) {
      failDocxContributionRegistration(
        code,
        `Duplicate DOCX mark-attribute claim "${name}" from "${duplicate.contribution.id}" and "${entry.contribution.id}".`
      );
    }
    claims.set(key, entry);
  }
}
