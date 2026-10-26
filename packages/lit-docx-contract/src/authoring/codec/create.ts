import {
  defineDocxMarkCodec,
  defineDocxNodeCodec
} from "../../compiler/contributions/index.js";
import type { LitAstNode } from "../../core/contracts.js";
import type {
  DocxCodecApi,
  DocxMarkDefinition,
  DocxNodeDefinition
} from "../types.js";
import { bindDefaultFallback } from "./binding.js";
import {
  createDocxCapabilities,
  createDocxCapability
} from "./capabilities.js";
import { defineMarkAttributes } from "./mark-attributes.js";
import {
  normalizeMarkSources,
  normalizeNodeSources
} from "./sources.js";
import {
  assertDocxCodecDefinition
} from "./validation.js";

/**
 * Creates high-level codec definitions with derived structural capabilities.
 *
 * @returns Immutable codec operation family.
 */
export function createDocxCodecApi(): DocxCodecApi {
  return Object.freeze({
    node: defineNode,
    mark: defineMark,
    markAttributes: defineMarkAttributes
  });
}

/**
 * Defines one high-level node codec.
 *
 * @param definition - Model type, conversion halves, and loss decisions.
 * @returns Validated low-level node contribution.
 */
function defineNode<ModelNode, ModelMark = unknown>(
  definition: DocxNodeDefinition<ModelNode, ModelMark>
) {
  assertDocxCodecDefinition(definition);
  const capabilities = [
    ...createDocxCapabilities(
      "node",
      definition.modelType,
      definition.capabilities,
      definition.import !== undefined,
      definition.export !== undefined
    ),
    ...(definition.import?.creates ?? [])
      .filter((created) =>
        typeof created !== "string"
        && created.capability !== undefined
        && created.modelType !== definition.modelType
      )
      .map((created) => createDocxCapability(
        "node",
        typeof created === "string"
          ? created
          : created.modelType,
        "$type",
        "import",
        typeof created === "string"
          ? undefined
          : created.capability
      ))
  ];
  const importSources = definition.import === undefined
    ? []
    : normalizeNodeSources(definition.import.from);
  return defineDocxNodeCodec<ModelNode, ModelMark>({
    kind: "node-codec",
    id: definition.id,
    fieldCapabilities: capabilities,
    ...(definition.requires === undefined
      ? {}
      : { requires: definition.requires }),
    ...(definition.import === undefined
      ? {}
      : {
          import: {
            ...(definition.import.fallback === undefined ? {} : { fallback: definition.import.fallback }),
            litNodeTypes: [...new Set(importSources.map(
              (source) => source.nodeType
            ))],
            ...(importSources.some((source) => source.matches !== undefined)
              ? {
                  matches: (node: LitAstNode) => importSources.some(
                    (source) =>
                      source.nodeType === node.type
                      && (source.matches?.(node) ?? true)
                  )
                }
              : {}),
            modelNodeTypes: [...new Set([
              definition.modelType,
              ...(definition.import.creates ?? []).map((created) =>
                typeof created === "string"
                  ? created
                  : created.modelType
              )
            ])],
            ...(definition.import.childContentKind === undefined
              ? {}
              : {
                  childContentKind:
                    definition.import.childContentKind
                }),
            convert: (context) => definition.import!.convert(
              bindDefaultFallback(
                context,
                definition.capabilities?.import
              )
            )
          }
        }),
    ...(definition.export === undefined
      ? {}
      : {
          export: {
            modelNodeTypes: [definition.modelType],
            convert: (context) => definition.export!.convert(
              bindDefaultFallback(
                context,
                definition.capabilities?.export
              )
            )
          }
        })
  });
}

/**
 * Defines one high-level mark codec.
 *
 * @param definition - Model type, conversion halves, and loss decisions.
 * @returns Validated low-level mark contribution.
 */
function defineMark<ModelMark>(
  definition: DocxMarkDefinition<ModelMark>
) {
  assertDocxCodecDefinition(definition);
  const capabilities = createDocxCapabilities(
    "mark",
    definition.modelType,
    definition.capabilities,
    definition.import !== undefined,
    definition.export !== undefined
  );
  return defineDocxMarkCodec<ModelMark>({
    kind: "mark-codec",
    id: definition.id,
    fieldCapabilities: capabilities,
    ...(definition.requires === undefined
      ? {}
      : { requires: definition.requires }),
    ...(definition.import === undefined
      ? {}
      : {
          import: {
            litMarkTypes: normalizeMarkSources(definition.import.from),
            modelMarkTypes: [definition.modelType],
            convert: (context) => definition.import!.convert(
              bindDefaultFallback(
                context,
                definition.capabilities?.import
              )
            )
          }
        }),
    ...(definition.export === undefined
      ? {}
      : {
          export: {
            modelMarkTypes: [definition.modelType],
            convert: (context) => definition.export!.convert(
              bindDefaultFallback(
                context,
                definition.capabilities?.export
              )
            )
          }
        })
  });
}
