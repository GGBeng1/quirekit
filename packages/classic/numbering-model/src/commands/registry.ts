import type { CommandSpec } from "@quirekit/core";
import {
  isWordNumberingRegistry,
  resolveWordNumberingRegistry
} from "../model";
import type {
  MergeWordNumberingRegistryOptions,
  WordNumberingRegistry
} from "../types";

/**
 * Creates the owner command that merges auxiliary Story numbering identities.
 *
 * Existing canonical definitions and instances may be repeated exactly, while
 * conflicting identities are rejected so a transient editor can never rewrite
 * document numbering policy by accident.
 *
 * @returns Command that appends compatible numbering definitions and instances.
 */
export function createMergeWordNumberingRegistryCommand(): CommandSpec {
  return (value) => (context) => {
    const candidate = readMergeRegistry(value);
    if (candidate === null) return false;
    const current = resolveWordNumberingRegistry(
      context.tr.doc.attrs.wordNumberingRegistry
    );
    const merged = mergeCompatibleRegistries(current, candidate);
    if (merged === null) return false;
    if (JSON.stringify(current) !== JSON.stringify(merged)) {
      context.tr.setDocAttribute("wordNumberingRegistry", merged);
    }
    context.dispatch?.(context.tr);
    return true;
  };
}

/** @param value - Candidate command payload. @returns Valid registry or null. */
function readMergeRegistry(value: unknown): WordNumberingRegistry | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const registry = (value as MergeWordNumberingRegistryOptions).registry;
  return isWordNumberingRegistry(registry) ? registry : null;
}

/**
 * Performs an append-only merge after verifying every shared identity.
 *
 * @param current - Canonical registry.
 * @param candidate - Transient Story registry.
 * @returns Merged registry or null.
 */
function mergeCompatibleRegistries(
  current: WordNumberingRegistry,
  candidate: WordNumberingRegistry
): WordNumberingRegistry | null {
  if (!entriesAreCompatible(current.abstractNums, candidate.abstractNums)) {
    return null;
  }
  if (!entriesAreCompatible(current.nums, candidate.nums)) return null;
  return {
    abstractNums: { ...candidate.abstractNums, ...current.abstractNums },
    nums: { ...candidate.nums, ...current.nums },
    nextInstanceId: Math.max(current.nextInstanceId, candidate.nextInstanceId)
  };
}

/**
 * Verifies that shared registry keys retain byte-equivalent modeled values.
 *
 * @param current - Canonical keyed records.
 * @param candidate - Candidate keyed records.
 * @returns Whether every shared key is identical.
 */
function entriesAreCompatible<T>(
  current: Readonly<Record<string, T>>,
  candidate: Readonly<Record<string, T>>
): boolean {
  return Object.entries(candidate).every(([key, value]) => (
    current[key] === undefined
    || JSON.stringify(current[key]) === JSON.stringify(value)
  ));
}
