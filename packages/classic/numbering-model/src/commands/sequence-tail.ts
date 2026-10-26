import type { CommandProps } from "@quirekit/core";
import {
  resolveWordNumberingRegistry,
  resolveWordParagraphNumbering
} from "../model";
import { resolveWordNumberingLevel } from "../resolver";

/** Inputs for rebinding a numbered paragraph tail to an earlier sequence. */
export interface RelinkWordNumberingSequenceTailOptions {
  /** Active command context whose transaction receives the changes. */
  readonly context: CommandProps;
  /** Position of the first paragraph being continued. */
  readonly position: number;
  /** Concrete sequence currently owned by the target tail. */
  readonly sourceNumId: string;
  /** Earlier concrete sequence that should own the tail. */
  readonly continuationNumId: string;
  /** Level of the marker from which continuation was requested. */
  readonly level: number;
  /** Registered paragraph-like node names. */
  readonly paragraphTypes: readonly string[];
}

/**
 * Rebinds the compatible tail of one concrete sequence to an earlier instance.
 *
 * @param options - Command context and exact old/new sequence identities.
 * @returns Nothing.
 */
export function relinkWordNumberingSequenceTail(
  options: RelinkWordNumberingSequenceTailOptions
): void {
  const allowed = new Set(options.paragraphTypes);
  const registry = resolveWordNumberingRegistry(
    options.context.state.doc.attrs.wordNumberingRegistry
  );
  const definition = resolveWordNumberingLevel(
    registry,
    options.sourceNumId,
    options.level
  )?.definition;
  const relatedLevels = definition === undefined
    ? false
    : Object.values(definition.levels).some((level) =>
        [...level.text.matchAll(/%([1-9])/gu)].some((match) =>
          Number(match[1]) - 1 !== level.level
        )
      );
  let started = false;
  let stopped = false;

  // Canonical document order defines the tail. Plain paragraphs do not break
  // a sequence, while a competing list identity or shallower source level does.
  options.context.state.doc.descendants((candidate, candidatePosition) => {
    if (stopped || candidatePosition < options.position) return !stopped;
    if (!candidate.isTextblock || !allowed.has(candidate.type.name)) return true;
    const numbering = resolveWordParagraphNumbering(candidate.attrs.wordNumbering);
    if (!started) started = candidatePosition === options.position;
    if (!started) return false;
    if (numbering === null) return false;
    if (numbering.numId !== options.sourceNumId) {
      stopped = true;
      return false;
    }
    if (!relatedLevels && numbering.level < options.level) {
      stopped = true;
      return false;
    }
    if (relatedLevels || numbering.level === options.level) {
      options.context.tr.setNodeMarkup(candidatePosition, undefined, {
        ...candidate.attrs,
        wordNumbering: {
          ...numbering,
          numId: options.continuationNumId,
          startOverride: null
        }
      });
    }
    return false;
  });
}
