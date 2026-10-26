import type {
  DocxAuthoringApi,
  DocxAuthoringApiOptions
} from "./types.js";
import { createDocxBlocksApi } from "./blocks.js";
import { createDocxCodecApi } from "./codec/index.js";
import { createDocxFallbackApi } from "./fallback.js";
import { createDocxInlineApi } from "./inline.js";
import { createDocxMarksApi } from "./marks.js";
import { createDocxResourcesApi } from "./resources.js";
import { createDocxRoundTripApi } from "./round-trip.js";
import { createDocxStylesApi } from "./styles.js";
import { createDocxTablesApi } from "./tables.js";

/**
 * Creates one immutable semantic DOCX authoring facade.
 *
 * @param options - Optional conversion reporter and codec-level fallback.
 * @returns Complete model-neutral authoring API.
 */
export function createDocxAuthoringApi(
  options: DocxAuthoringApiOptions = {}
): DocxAuthoringApi {
  return Object.freeze({
    codec: createDocxCodecApi(),
    blocks: createDocxBlocksApi(),
    tables: createDocxTablesApi(),
    inline: createDocxInlineApi(),
    marks: createDocxMarksApi(),
    styles: createDocxStylesApi(),
    roundTrip: createDocxRoundTripApi(),
    fallback: createDocxFallbackApi(
      options.report,
      options.defaultDiagnostic
    ),
    resources: createDocxResourcesApi()
  });
}

/** Standalone immutable authoring facade for non-contextual operations. */
export const docx: DocxAuthoringApi = createDocxAuthoringApi();
