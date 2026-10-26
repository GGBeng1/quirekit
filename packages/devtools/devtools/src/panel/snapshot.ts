import {
  collectDefaultJsonExpandedPaths
} from "./json";
import type { QuireDevtools } from "../types";

/**
 * Seeds default expanded JSON paths from the current document.
 *
 * @param devtools - Devtools instance.
 * @returns Expanded path set.
 */
export function seedJsonExpansion(devtools: Pick<QuireDevtools, "getSnapshot">): Set<string> {
  return new Set(collectDefaultJsonExpandedPaths(readDocumentJson(devtools)));
}

/**
 * Reads the current document JSON.
 *
 * @param devtools - Devtools instance.
 * @returns Document JSON or null.
 */
export function readDocumentJson(devtools: Pick<QuireDevtools, "getSnapshot">): unknown {
  return devtools.getSnapshot({ includeJSON: true }).document ?? null;
}
