import { Annotation, StateEffect, StateField, type ChangeDesc, type Transaction } from "@quirekit/cm-state";
import { invertedEffects } from "@quirekit/cm-commands";
import { sourceDocument } from "../../source/authoring/adapter";
import type { Effect, Metadata, StateDefinition, StateSlot, StateUpdate } from "./types";

/** @param map - Optional mapping for positional payloads. @returns Typed transaction effect token. */
export function defineEffect<T>(map?: (value: T, changes: ChangeDesc) => T | undefined): Effect<T> {
  const type = StateEffect.define<T>(map ? { map } : {});
  return { of: value => type.of(value), values: transaction => transaction.effects.flatMap(effect => effect.is(type) ? [effect.value] : []) };
}

/** @returns Typed metadata token without a second transaction store. */
export function defineMetadata<T>(): Metadata<T> {
  const type = Annotation.define<T>();
  return { of: value => type.of(value), read: transaction => transaction.annotation(type) };
}

/** @param transaction - Backend transaction. @returns Lazy author reducer context. */
function context(transaction: Transaction): StateUpdate {
  return { before: transaction.startState,
    // Reading newDoc avoids recursively requesting the StateField currently being reduced.
    document: { length: transaction.newDoc.length, slice: (from, to) => transaction.newDoc.sliceString(from, to),
      lineAt: position => transaction.newDoc.lineAt(position) },
    changes: transaction.changes, docChanged: transaction.docChanged,
    selectionChanged: !transaction.startState.selection.eq(transaction.newSelection), selection: transaction.newSelection,
    effects: effect => effect.values(transaction), metadata: metadata => metadata.read(transaction),
  };
}

/** @param definition - Pure document-local reducer and explicit inverse policy. @returns Reusable installable state slot. */
export function defineState<T>(definition: StateDefinition<T>): StateSlot<T> {
  if (!definition.key) throw new Error("missing-state-key");
  const field = StateField.define<T>({
    create: state => definition.create(sourceDocument(state)),
    update: (value, transaction) => definition.update(value, context(transaction)),
  });
  return { key: definition.key, ...(definition.invert ? { history: "effects" as const } : {}), read: state => state.field(field), extension: [field,
    ...(definition.invert ? [invertedEffects.of(transaction => [...definition.invert!(transaction.startState.field(field), context(transaction))])] : []),
  ] };
}
