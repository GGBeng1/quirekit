import type { QuireViewRenderCacheCounters } from "@quirekit/view";

/**
 * Formats one hit/miss/store counter group.
 *
 * @param hits - Successful cache reads.
 * @param misses - Failed cache reads.
 * @param stores - Cache writes.
 * @returns Compact hit-rate counter label.
 */
export function formatCacheCounter(hits: number, misses: number, stores: number): string {
  return `${formatHitRate(hits, misses)} h${hits} m${misses} s${stores}`;
}

/**
 * Formats display-command cache counters with hit-kind details.
 *
 * @param counters - Display-command cache counters.
 * @returns Compact display-command cache label.
 */
export function formatDisplayCommandCacheCounter(
  counters: QuireViewRenderCacheCounters["displayCommand"]
): string {
  return [
    formatCacheCounter(counters.hits, counters.misses, counters.stores),
    `id${counters.identityHits}`,
    `idShift${counters.identityShiftHits}`,
    `shift${counters.shiftSignatureHits}`,
    `source${counters.sourceShiftHits}`,
    `node${counters.textNodeHits}`,
    `nm${counters.textNodeMisses}`,
    `ns${counters.textNodeStores}`
  ].join(" ");
}

/**
 * Formats measured-source cache counters with text-prefix reuse details.
 *
 * @param counters - Measured-source cache counters.
 * @returns Compact measured-source cache label.
 */
export function formatMeasuredSourceCacheCounter(
  counters: QuireViewRenderCacheCounters["measuredSource"]
): string {
  return [
    formatCacheCounter(counters.hits, counters.misses, counters.stores),
    `ex${counters.exactHits}`,
    `tx${counters.shiftedTextHits}`,
    `leaf${counters.shiftedLeafHits}`,
    `prefix${formatHitRate(counters.textPrefixHits, counters.textPrefixMisses)}`,
    `ph${counters.textPrefixHits}`,
    `pm${counters.textPrefixMisses}`,
    `pr${counters.textPrefixReusedItems}`,
    `bodyPrefix${formatHitRate(
      counters.bodyPrefixHits,
      counters.bodyPrefixMisses
    )}`,
    `bph${counters.bodyPrefixHits}`,
    `bpm${counters.bodyPrefixMisses}`,
    `bpr${counters.bodyPrefixReusedItems}`,
    `bodySuffix${formatHitRate(
      counters.bodySuffixHits,
      counters.bodySuffixMisses
    )}`,
    `bsh${counters.bodySuffixHits}`,
    `bsm${counters.bodySuffixMisses}`,
    `bsr${counters.bodySuffixReusedItems}`
  ].join(" ");
}

/**
 * Formats textblock tail-reuse diagnostics.
 *
 * @param counters - Block-shape cache counters that include tail-reuse outcomes.
 * @returns Compact textblock tail-reuse label.
 */
export function formatTextblockTailReuseCounter(
  counters: QuireViewRenderCacheCounters["blockShape"]
): string {
  return [
    `suffix${counters.localShapeSuffixHits}`,
    `conv${counters.localShapeConvergedSuffixHits}`,
    `cm${counters.localShapeConvergenceMisses}`,
    `rm${counters.localShapeReuseMisses}`,
    `skip c${counters.localShapeBypassComposition ?? 0}`,
    `m${counters.localShapeBypassMultiRun ?? 0}`,
    `f${counters.localShapeBypassFragmentHit ?? 0}`,
    `input${counters.localShapeBypassTextblockInputHit ?? 0}`,
    `top${counters.localShapeBypassTopLevelInputHit ?? 0}`,
    `est${counters.localShapeBypassEstimated ?? 0}`
  ].join(" ");
}

/**
 * Formats retained pagination checkpoint counters.
 *
 * @param counters - Pagination checkpoint-store counters.
 * @returns Compact prefix/convergence/suffix label.
 */
export function formatPaginationCheckpointStoreCounter(
  counters: QuireViewRenderCacheCounters["paginationCheckpoint"]
): string {
  return [
    `prefix${formatHitRate(counters.prefixHits, counters.prefixMisses)}`,
    `ph${counters.prefixHits}`,
    `pm${counters.prefixMisses}`,
    `prefixPages${counters.prefixPagesReused}`,
    `conv${formatHitRate(counters.convergenceHits, counters.convergenceMisses)}`,
    `suffixPages${counters.suffixPagesReused}`,
    `recomputedPages${counters.pagesRecomputed}`,
    `s${counters.stores}`
  ].join(" ");
}

/**
 * Formats related cache counter groups as a compact label.
 *
 * @param layers - Layer labels and hit/miss/store counters.
 * @returns Compact layered cache label.
 */
export function formatLayeredCacheCounter(
  layers: readonly (readonly [string, number, number, number])[]
): string {
  const hits = layers.reduce((total, [, layerHits]) => total + layerHits, 0);
  const misses = layers.reduce((total, [, , layerMisses]) => total + layerMisses, 0);
  const header = formatHitRate(hits, misses);
  const details = layers
    .map(([label, layerHits, layerMisses, layerStores]) =>
      `${label} h${layerHits} m${layerMisses} s${layerStores}`
    )
    .join("; ");

  return `${header} ${details}`;
}

/**
 * Formats render cache counters for a compact timeline detail row.
 *
 * @param counters - Render cache counters to summarize.
 * @returns Compact cache hit-rate summary.
 */
export function formatRenderCacheCounters(
  counters: QuireViewRenderCacheCounters
): string {
  return [
    `retained r${counters.retainedBlock.reusedRecords}` +
      `/b${counters.retainedBlock.rebuiltRecords}` +
      `/p${counters.retainedBlock.projectedRecords}` +
      ` hi${counters.retainedBlock.heightIndexRebuilds}` +
      `/d${counters.retainedBlock.heightIndexDeltaBatches}` +
      `/u${counters.retainedBlock.heightIndexUpdatedEntries}`,
    `shape ${formatLayeredCacheCounter([
      [
        "frag",
        counters.blockShape.fragmentHits,
        counters.blockShape.fragmentMisses,
        counters.blockShape.fragmentStores
      ],
      [
        "input",
        counters.blockShape.inputHits,
        counters.blockShape.inputMisses,
        counters.blockShape.inputStores
      ],
      [
        "top",
        counters.blockShape.topLevelInputExactHits +
          counters.blockShape.topLevelInputShiftHits,
        counters.blockShape.topLevelInputMisses,
        counters.blockShape.topLevelInputStores
      ],
      [
        "local",
        counters.blockShape.localShapeHits,
        counters.blockShape.localShapeMisses,
        counters.blockShape.localShapeStores
      ],
    ])}`,
    `tail ${formatTextblockTailReuseCounter(counters.blockShape)}`,
    `measured ${formatMeasuredSourceCacheCounter(counters.measuredSource)}`,
    `checkpoints ${formatPaginationCheckpointStoreCounter(counters.paginationCheckpoint)}`,
    `commands ${formatDisplayCommandCacheCounter(counters.displayCommand)}`
  ].join(" / ");
}

/**
 * Formats cache hit rate from hit and miss counts.
 *
 * @param hits - Successful cache reads.
 * @param misses - Failed cache reads.
 * @returns Percent hit rate, or n/a when the cache was not read.
 */
function formatHitRate(hits: number, misses: number): string {
  const total = hits + misses;

  return total === 0 ? "n/a" : `${Math.round((hits / total) * 100)}%`;
}
