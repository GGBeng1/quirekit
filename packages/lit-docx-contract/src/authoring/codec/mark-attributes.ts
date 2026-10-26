import {
  defineDocxMarkAttributeCodec
} from "../../compiler/contributions/index.js";
import type {
  DocxMarkAttributeDefinition
} from "../types.js";
import { bindDefaultFallback } from "./binding.js";
import {
  createDocxMarkAttributeCapabilities
} from "./capabilities.js";
import { normalizeMarkSources } from "./sources.js";
import {
  assertDocxMarkAttributeDefinition
} from "./validation.js";

/**
 * Defines selected extension-owned attributes on one shared mark.
 *
 * @param definition - Model attributes and directional projections.
 * @returns Validated composable mark-attribute contribution.
 */
export function defineMarkAttributes<ModelMark>(
  definition: DocxMarkAttributeDefinition<ModelMark>
) {
  assertDocxMarkAttributeDefinition(definition);
  return defineDocxMarkAttributeCodec<ModelMark>({
    kind: "mark-attribute-codec",
    id: definition.id,
    fieldCapabilities: createDocxMarkAttributeCapabilities(
      definition.modelType,
      definition.modelAttributes,
      definition.capabilities,
      definition.import !== undefined,
      definition.export !== undefined
    ),
    ...(definition.requires === undefined
      ? {}
      : { requires: definition.requires }),
    ...(definition.import === undefined
      ? {}
      : {
          import: {
            litMarkTypes: normalizeMarkSources(definition.import.from),
            modelMarkTypes: [definition.modelType],
            sourceAttributes: definition.import.sourceAttributes,
            modelAttributes: definition.modelAttributes,
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
            litMarkTypes: normalizeMarkSources(definition.export.to),
            modelAttributes: definition.modelAttributes,
            targetAttributes: definition.export.targetAttributes,
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
