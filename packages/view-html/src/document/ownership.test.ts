import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const LEGACY_CONTENT_SYNC_PATH = new URL("../content/sync.ts", import.meta.url);
const LEGACY_CONTENT_ROOT_PATH = new URL("../content/root.ts", import.meta.url);
const LEGACY_SERIALIZER_PATH = new URL("../content/serialized-node.ts", import.meta.url);
const LEGACY_BLOCK_PATH = new URL("../content/block.ts", import.meta.url);
const LEGACY_CUSTOM_BLOCK_PATH = new URL("../content/custom-block.ts", import.meta.url);
const LEGACY_TEXT_FRAGMENTS_PATH = new URL("../content/text-fragments.ts", import.meta.url);
const LEGACY_RANGE_BLOCKS_PATH = new URL("../dom/range/blocks.ts", import.meta.url);
const LEGACY_RANGE_FRAGMENTS_PATH = new URL("../dom/range/fragments.ts", import.meta.url);
const LEGACY_RANGE_METADATA_PATH = new URL("../dom/range/metadata.ts", import.meta.url);
const LEGACY_RANGE_TRAVERSAL_PATH = new URL("../dom/range/traversal.ts", import.meta.url);
const LEGACY_DOM_BRIDGE_PATH = new URL("../dom/bridge.ts", import.meta.url);
const LEGACY_DECORATIONS_PATH = new URL("../decorations", import.meta.url);
const RETAINED_DOCUMENT_PATH = new URL("./runtime.ts", import.meta.url);
const RETAINED_POSITION_INDEX_PATH = new URL(
  "../reconcile/ownership/position-index.ts",
  import.meta.url
);

/**
 * Reads one canonical HTML source module for ownership characterization.
 *
 * @param path - Module URL to read.
 * @returns UTF-8 source text.
 */
function readCanonicalSource(path: URL): string {
  return readFileSync(path, "utf8");
}

/** Proves every superseded reconstruction path stays physically deleted. */
function assertLegacyHtmlOwnershipPathsAreDeleted(): void {
  const paths = [
    LEGACY_CONTENT_SYNC_PATH,
    LEGACY_CONTENT_ROOT_PATH,
    LEGACY_BLOCK_PATH,
    LEGACY_CUSTOM_BLOCK_PATH,
    LEGACY_TEXT_FRAGMENTS_PATH,
    LEGACY_SERIALIZER_PATH,
    LEGACY_RANGE_BLOCKS_PATH,
    LEGACY_RANGE_FRAGMENTS_PATH,
    LEGACY_RANGE_METADATA_PATH,
    LEGACY_RANGE_TRAVERSAL_PATH,
    LEGACY_DOM_BRIDGE_PATH,
    LEGACY_DECORATIONS_PATH
  ];

  for (const sourcePath of paths) {
    expect(existsSync(sourcePath)).toBe(false);
  }
}

/** Proves canonical retained identity owns DOM and document-position mapping. */
function assertCanonicalHtmlOwnershipPaths(): void {
  const documentSource = readCanonicalSource(RETAINED_DOCUMENT_PATH);
  const positionIndexSource = readCanonicalSource(RETAINED_POSITION_INDEX_PATH);

  expect(documentSource).toContain("HtmlDescriptorPositionIndex");
  expect(documentSource).toContain("reconcileHtmlDescriptorTree");
  expect(documentSource).not.toContain("replaceChildren");
  expect(positionIndexSource).toContain("resolveDomPoint");
  expect(positionIndexSource).toContain("resolvePosition");
  expect(positionIndexSource).not.toContain("querySelectorAll");
}

/** Registers ownership characterization tests with documented callbacks. */
function defineLegacyHtmlOwnershipTests(): void {
  it(
    "keeps every superseded reconstruction module deleted after retained cutover",
    assertLegacyHtmlOwnershipPathsAreDeleted
  );
  it(
    "keeps DOM mapping on retained descriptor identity without subtree scans",
    assertCanonicalHtmlOwnershipPaths
  );
}

describe("retained HTML ownership closure", defineLegacyHtmlOwnershipTests);
