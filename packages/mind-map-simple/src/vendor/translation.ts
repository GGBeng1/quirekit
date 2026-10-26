import type { SimpleSvgGroup } from "./types";

const installed = new WeakSet<SimpleSvgGroup>();
/**
 * Avoids a redundant group bounding-box read for translation, whose pivot cancels.
 * @param group - Instance-owned reused group; new groups use their original first draw.
 */
export function installSimpleTranslation(group: SimpleSvgGroup | undefined): void {
  if (!group || installed.has(group)) return;
  installed.add(group);
  /** @param x - Relative horizontal delta. @param y - Relative vertical delta. @returns The same group with the original svg.js matrix composition. */
  group.translate = function translate(x: number, y: number): SimpleSvgGroup {
    // A numeric origin keeps svg.js from measuring an implicit center. The
    // original matrix, including transient drag transforms, remains authoritative.
    return this.transform({ translate: [x, y], origin: [0, 0] }, true);
  };
}
