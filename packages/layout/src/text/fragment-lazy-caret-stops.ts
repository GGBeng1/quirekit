import type {
  QuireTextCaretStop,
  QuireTextFragment,
  QuireTextFragmentLazyCloneOptions
} from "./types";
import { attachQuireTextFragmentSource } from "./fragment-source";

/** Lazy caret-stop source and accumulated document-position shift. */
interface QuireLazyTextFragmentCaretStopSource {
  /** Original fragment whose caret stops should be read only on demand. */
  readonly sourceFragment: QuireTextFragment;
  /** Accumulated document-position delta from source to current fragment. */
  readonly rangeDelta: number;
}

/** Mutable text fragment used while building a clone with lazy caret stops. */
type MutableQuireTextFragment = {
  -readonly [Key in keyof QuireTextFragment]: QuireTextFragment[Key];
};

/** Empty placeholder replaced by a lazy getter before consumers observe it. */
const emptyLazyTextFragmentCaretStops: readonly QuireTextCaretStop[] = [];

/** Lazy caret-stop metadata keyed by cloned text-fragment identity. */
const lazyTextFragmentCaretStopStore =
  new WeakMap<QuireTextFragment, QuireLazyTextFragmentCaretStopSource>();

/**
 * Clones a text fragment without opening lazy caret-stop getters.
 *
 * @param options - Source fragment plus replacement geometry and range fields.
 * @returns Cloned text fragment whose caret stops resolve on first read.
 */
export function cloneQuireTextFragmentWithLazyCaretStops(
  options: QuireTextFragmentLazyCloneOptions
): QuireTextFragment {
  const source = options.source;
  const clone: MutableQuireTextFragment = {
    id: options.id,
    text: source.text,
    range: options.range,
    rect: options.rect,
    font: source.font,
    lineHeight: source.lineHeight,
    baseline: options.baseline,
    caretStops: emptyLazyTextFragmentCaretStops
  };

  copyOptionalQuireTextFragmentFields(clone, source);
  defineQuireLazyTextFragmentCaretStops(
    clone,
    source,
    options.caretStopRangeDelta ?? 0
  );
  attachQuireTextFragmentSource(clone, source);

  return clone;
}

/**
 * Defers caret-stop reads and composes range shifts through clone chains.
 *
 * @param fragment - Cloned fragment that receives the lazy getter.
 * @param sourceFragment - Source fragment before the clone's range shift.
 * @param rangeDelta - Document-position delta applied by this clone.
 * @returns Nothing.
 */
export function defineQuireLazyTextFragmentCaretStops(
  fragment: QuireTextFragment,
  sourceFragment: QuireTextFragment,
  rangeDelta: number
): void {
  const source = resolveQuireLazyTextFragmentCaretStopSource(
    sourceFragment,
    rangeDelta
  );
  let cached: readonly QuireTextCaretStop[] | undefined;

  lazyTextFragmentCaretStopStore.set(fragment, source);
  Object.defineProperty(fragment, "caretStops", {
    configurable: true,
    enumerable: true,
    get() {
      cached ??= shiftQuireTextFragmentCaretStops(
        source.sourceFragment.caretStops,
        source.rangeDelta
      );
      return cached;
    }
  });
}

/**
 * Copies optional paint and shaping fields onto a cloned fragment.
 *
 * @param target - Mutable clone receiving optional fields.
 * @param source - Source fragment whose optional fields should be preserved.
 * @returns Nothing.
 */
function copyOptionalQuireTextFragmentFields(
  target: MutableQuireTextFragment,
  source: QuireTextFragment
): void {
  if (source.tab !== undefined) target.tab = source.tab;
  if (source.breakAfter !== undefined) target.breakAfter = source.breakAfter;
  if (source.clipToLine !== undefined) {
    target.clipToLine = source.clipToLine;
  }
  if (source.textColor !== undefined) {
    target.textColor = source.textColor;
  }
  if (source.horizontalScale !== undefined) target.horizontalScale = source.horizontalScale;
  if (source.paintOffset !== undefined) target.paintOffset = source.paintOffset;
  if (source.letterSpacing !== undefined) {
    target.letterSpacing = source.letterSpacing;
  }
  if (source.trailingSpacing !== undefined) {
    target.trailingSpacing = source.trailingSpacing;
  }
  if (source.textBackgroundColor !== undefined) {
    target.textBackgroundColor = source.textBackgroundColor;
  }
  if (source.textDecoration !== undefined) {
    target.textDecoration = source.textDecoration;
  }
  if (source.underline !== undefined) target.underline = source.underline;
  if (source.emphasisMark !== undefined) {
    target.emphasisMark = source.emphasisMark;
  }
  if (source.glyphEffects !== undefined) {
    target.glyphEffects = source.glyphEffects;
  }
  if (source.hiddenText !== undefined) {
    target.hiddenText = source.hiddenText;
  }
  if (source.marks !== undefined) {
    target.marks = source.marks;
  }
  if (source.direction !== undefined) {
    target.direction = source.direction;
  }
  if (source.language !== undefined) {
    target.language = source.language;
  }
  if (source.shapedRun !== undefined) {
    target.shapedRun = source.shapedRun;
  }
  if (source.runAscent !== undefined) {
    target.runAscent = source.runAscent;
  }
  if (source.runDescent !== undefined) {
    target.runDescent = source.runDescent;
  }
}

/**
 * Resolves the original source fragment for a clone chain without reading stops.
 *
 * @param sourceFragment - Immediate clone source.
 * @param rangeDelta - Additional document-position delta to compose.
 * @returns Original source fragment and accumulated range delta.
 */
function resolveQuireLazyTextFragmentCaretStopSource(
  sourceFragment: QuireTextFragment,
  rangeDelta: number
): QuireLazyTextFragmentCaretStopSource {
  const source = lazyTextFragmentCaretStopStore.get(sourceFragment);
  if (source !== undefined) {
    return {
      sourceFragment: source.sourceFragment,
      rangeDelta: source.rangeDelta + rangeDelta
    };
  }

  return { sourceFragment, rangeDelta };
}

/**
 * Shifts caret-stop document positions without changing local geometry.
 *
 * @param caretStops - Source caret stops.
 * @param rangeDelta - Document-position delta to apply.
 * @returns Shifted caret stops, or the original array when no shift is needed.
 */
function shiftQuireTextFragmentCaretStops(
  caretStops: readonly QuireTextCaretStop[],
  rangeDelta: number
): readonly QuireTextCaretStop[] {
  if (rangeDelta === 0) {
    return caretStops;
  }

  const shifted: QuireTextCaretStop[] = new Array(caretStops.length);
  for (let index = 0; index < caretStops.length; index += 1) {
    const stop = caretStops[index]!;
    const position = stop.position;
    const shiftedPosition = position.bias === undefined
      ? { pos: position.pos + rangeDelta }
      : { pos: position.pos + rangeDelta, bias: position.bias };
    shifted[index] = {
      position: shiftedPosition,
      localX: stop.localX
    };
  }

  return shifted;
}
