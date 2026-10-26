import { MathJaxNewcmFont } from '@mathjax/mathjax-newcm-font/js/svg.js';
import type { DynamicFile } from '@mathjax/src/js/output/common/FontData.js';
import { loadFontRange } from './font-ranges';

/** Owns explicit local font imports without replacing MathJax's global loader. */
export class LocalMathFont extends MathJaxNewcmFont {
  /**
   * Loads a known font range through a bundler-visible local module dependency.
   * @param dynamic - Engine-owned range and its setup callback.
   * @returns Completion of the range registration for this font instance.
   */
  override async loadDynamicFile(dynamic: DynamicFile): Promise<void> {
    if (dynamic.extension) throw new Error('Unsupported mathematical font extension');
    if (!dynamic.promise) dynamic.promise = loadFontRange(dynamic.file).then(() => undefined);
    await dynamic.promise;
    dynamic.setup(this);
  }
}
