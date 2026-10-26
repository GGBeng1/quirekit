import type { LitAstNode } from "../../../core/contracts.js";
import { orderDocxContributionEntries } from "../ordering.js";
import type {
  DocxContributionEntry,
  DocxContributionRegistry
} from "../types.js";
import {
  markPairKey,
  registerMarkAttributeCodec
} from "./attribute-claims.js";
import {
  registerExactClaims,
  registerNodeImportClaims
} from "./claims.js";
import { selectNodeImporter } from "./selection.js";
import { validateBase, validateCodec } from "./validation.js";

/**
 * Creates an immutable, deterministic contribution registry.
 *
 * @param entries - Contributions annotated with their extension or feature owner.
 * @returns Exact claim lookups and dependency-ordered entries.
 */
export function createDocxContributionRegistry<
  ModelNode = unknown,
  ModelMark = unknown,
  ModelDocument = unknown
>(
  entries: readonly DocxContributionEntry<
    ModelNode,
    ModelMark,
    ModelDocument
  >[] = []
): DocxContributionRegistry<ModelNode, ModelMark, ModelDocument> {
  type Entry = DocxContributionEntry<ModelNode, ModelMark, ModelDocument>;
  const byId = new Map<string, Entry>();
  const nodeImporters = new Map<string, Entry[]>();
  const nodeExporters = new Map<string, Entry>();
  const markImporters = new Map<string, Entry>();
  const markExporters = new Map<string, Entry>();
  const markAttributeImporters = new Map<string, Entry[]>();
  const markAttributeExporters = new Map<string, Entry[]>();
  const markAttributeImportSourceClaims = new Map<string, Entry>();
  const markAttributeExportTargetClaims = new Map<string, Entry>();
  const fieldClaims = new Map<string, Entry>();

  for (const entry of entries) {
    validateBase(entry, byId, fieldClaims);
    const contribution = entry.contribution;
    if (contribution.kind === "node-codec") {
      validateCodec(entry, contribution.import, contribution.export);
      registerNodeImportClaims(
        entry,
        contribution.import?.litNodeTypes ?? [],
        nodeImporters
      );
      registerExactClaims(
        entry,
        contribution.export?.modelNodeTypes ?? [],
        nodeExporters,
        "duplicate-node-export-claim"
      );
    } else if (contribution.kind === "mark-codec") {
      validateCodec(entry, contribution.import, contribution.export);
      registerExactClaims(
        entry,
        contribution.import?.litMarkTypes ?? [],
        markImporters,
        "duplicate-mark-import-claim"
      );
      registerExactClaims(
        entry,
        contribution.export?.modelMarkTypes ?? [],
        markExporters,
        "duplicate-mark-export-claim"
      );
    } else if (contribution.kind === "mark-attribute-codec") {
      validateCodec(entry, contribution.import, contribution.export);
      registerMarkAttributeCodec(entry, contribution, {
        importers: markAttributeImporters,
        exporters: markAttributeExporters,
        importSourceClaims: markAttributeImportSourceClaims,
        exportTargetClaims: markAttributeExportTargetClaims
      });
    }
  }

  const orderedEntries = orderDocxContributionEntries(entries, byId);
  const order = new Map(
    orderedEntries.map((entry, index) => [entry.contribution.id, index])
  );
  /**
   * Orders one pair group by validated contribution dependencies.
   *
   * @param group - Source-order attribute-codec group.
   * @returns Frozen dependency-ordered entries.
   */
  const orderedAttributeEntries = (group: readonly Entry[] | undefined) =>
    Object.freeze([...(group ?? [])].sort(
      (left, right) =>
        order.get(left.contribution.id)!
        - order.get(right.contribution.id)!
    ));
  return Object.freeze({
    entries: Object.freeze([...entries]),
    orderedEntries: Object.freeze([...orderedEntries]),
    fieldCapabilities: Object.freeze(
      orderedEntries.flatMap((entry) =>
        entry.contribution.fieldCapabilities
      )
    ),
    getById: (id: string) => byId.get(id),
    getNodeImporter: (nodeType: string, node?: LitAstNode) =>
      selectNodeImporter(nodeImporters.get(nodeType) ?? [], node, nodeType),
    getNodeExporter: (nodeType: string) => nodeExporters.get(nodeType),
    getMarkImporter: (markType: string) => markImporters.get(markType),
    getMarkExporter: (markType: string) => markExporters.get(markType),
    getMarkAttributeImporters: (
      litMarkType: string,
      modelMarkType: string
    ) => orderedAttributeEntries(
      markAttributeImporters.get(markPairKey(litMarkType, modelMarkType))
    ),
    getMarkAttributeExporters: (
      modelMarkType: string,
      litMarkType: string
    ) => orderedAttributeEntries(
      markAttributeExporters.get(markPairKey(litMarkType, modelMarkType))
    )
  });
}
