import type { Selection } from "@quirekit/pm";
import type { QuireNodePredicate, QuireParentNodeMatch } from "../types";
import { findParentNodeClosestToPos } from "./findParentNodeClosestToPos";

/**
 * Creates a helper that finds the closest matching parent node for a selection.
 *
 * @param predicate - Predicate used to match parent nodes.
 * @returns Function that accepts a selection and returns a parent match.
 */
export function findParentNode(
  predicate: QuireNodePredicate
): (selection: Selection) => QuireParentNodeMatch | undefined {
  return (selection) => findParentNodeClosestToPos(selection.$from, predicate);
}
