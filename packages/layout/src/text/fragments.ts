import type { QuirePoint, QuireRect } from "@quirekit/renderer";
import { shapeQuireTextRun } from "./shape";
import type {
  QuireTextCaretStop,
  QuireTextFragment,
  QuireTextFragmentOptions
} from "./types";

/** Pixel tolerance for comparing measured caret stops against clip bounds. */
const textCaretClipEpsilon = 0.001;

/**
 * Builds a measured single-line text fragment.
 *
 * @param options - Fragment inputs and text measurer.
 * @returns Text fragment with measured caret stops.
 */
export function buildQuireTextFragment(
  options: QuireTextFragmentOptions
): QuireTextFragment {
  // The single layout pass already shaped this run, so a caller that supplies
  // caret stops also supplies the shaped run (or none, for the native-text
  // fallback). Only re-shape the fragment text when no caret stops were given.
  const reshaped = options.caretStops === undefined
    ? shapeQuireTextRun(options.text, options.font, options.measurer, options.horizontalScale)
    : undefined;
  const caretStops = options.caretStops ?? buildQuireTextCaretStops(options, reshaped!);
  const shapedRun = options.shapedRun ?? reshaped;
  const lastStop = caretStops.at(-1);
  const measuredWidth = lastStop?.localX ?? 0;
  const fragment = {
    id: options.id,
    text: options.text,
    ...(options.tab === undefined ? {} : { tab: options.tab }),
    range: options.range,
    rect: {
      ...options.rect,
      width: measuredWidth
    },
    font: options.font,
    ...(options.paintOffset === undefined ? {} : { paintOffset: options.paintOffset }),
    ...(options.trailingSpacing === undefined ? {} : { trailingSpacing: options.trailingSpacing }),
    ...(options.language === undefined ? {} : { language: options.language }),
    ...(options.horizontalScale === undefined ? {} : { horizontalScale: options.horizontalScale }),
    ...(options.letterSpacing === undefined
      ? {}
      : { letterSpacing: options.letterSpacing }),
    ...(options.textColor === undefined ? {} : { textColor: options.textColor }),
    ...(options.textBackgroundColor === undefined
      ? {}
      : { textBackgroundColor: options.textBackgroundColor }),
    ...(options.textDecoration === undefined ? {} : { textDecoration: options.textDecoration }),
    ...(options.underline === undefined ? {} : { underline: options.underline }),
    ...(options.emphasisMark === undefined ? {} : { emphasisMark: options.emphasisMark }),
    ...(options.glyphEffects === undefined ? {} : { glyphEffects: options.glyphEffects }),
    ...(options.hiddenText === undefined ? {} : { hiddenText: options.hiddenText }),
    lineHeight: options.lineHeight,
    ...(options.clipToLine === undefined ? {} : { clipToLine: options.clipToLine }),
    baseline: options.baseline,
    ...(options.runAscent === undefined ? {} : { runAscent: options.runAscent }),
    ...(options.runDescent === undefined ? {} : { runDescent: options.runDescent }),
    caretStops,
    ...(options.direction === undefined ? {} : { direction: options.direction }),
    ...(shapedRun && shapedRun.glyphs && shapedRun.glyphs.length > 0 ? { shapedRun } : {})
  };

  return options.marks && options.marks.length > 0
    ? { ...fragment, marks: options.marks }
    : fragment;
}

/**
 * Finds the caret stop nearest to a point's x coordinate inside a fragment.
 *
 * @param fragment - Text fragment whose caret stops should be searched.
 * @param x - Canvas x coordinate to map.
 * @returns Nearest caret stop inside the fragment.
 */
export function findQuireTextCaretStopAtX(
  fragment: QuireTextFragment,
  x: number
): QuireTextCaretStop {
  const stops = fragment.caretStops;

  if (stops.length <= 1) {
    return stops[0] ?? {
      position: { pos: fragment.range.from, bias: 1 },
      localX: 0
    };
  }

  const localX = Math.min(Math.max(x - fragment.rect.x, 0), fragment.rect.width);

  return findQuireTextCaretStopNearLocalX(stops, localX, {
    position: { pos: fragment.range.to, bias: -1 },
    localX: fragment.rect.width
  });
}

/**
 * Finds the nearest caret stop to an x coordinate inside a clipped fragment.
 *
 * @param fragment - Text fragment whose caret stops should be searched.
 * @param x - Canvas x coordinate to map.
 * @param clipRect - Visible rectangle that clips the fragment.
 * @returns Nearest visible caret stop inside the clipped fragment.
 */
export function findQuireTextCaretStopAtXWithinRect(
  fragment: QuireTextFragment,
  x: number,
  clipRect: QuireRect
): QuireTextCaretStop {
  const clip = resolveQuireTextFragmentLocalClip(fragment, clipRect);

  if (clip === null) {
    return findQuireTextCaretStopAtX(fragment, x);
  }

  const localX = Math.min(Math.max(x - fragment.rect.x, clip.left), clip.right);
  const visibleStops = fragment.caretStops.filter((stop) =>
    isTextCaretStopInsideClip(stop.localX, clip)
  );

  return findQuireTextCaretStopNearLocalX(
    visibleStops.length > 0 ? visibleStops : fragment.caretStops,
    localX,
    {
      position: { pos: fragment.range.to, bias: -1 },
      localX: clip.right
    }
  );
}

/**
 * Finds the nearest caret stop to a local x coordinate.
 *
 * @param stops - Ordered caret stops to search.
 * @param localX - Local x coordinate inside the fragment.
 * @param fallback - Fallback caret stop for empty stop lists.
 * @returns Nearest caret stop.
 */
function findQuireTextCaretStopNearLocalX(
  stops: readonly QuireTextCaretStop[],
  localX: number,
  fallback: QuireTextCaretStop
): QuireTextCaretStop {
  if (stops.length <= 1) {
    return stops[0] ?? fallback;
  }

  for (let index = 0; index < stops.length - 1; index += 1) {
    const current = stops[index];
    const next = stops[index + 1];

    if (!current || !next) {
      continue;
    }

    const midpoint = current.localX + (next.localX - current.localX) / 2;

    if (localX <= midpoint) {
      return current;
    }
  }

  return stops[stops.length - 1] ?? fallback;
}

/**
 * Resolves visible local x bounds for a clipped text fragment.
 *
 * @param fragment - Text fragment being clipped.
 * @param clipRect - Canvas-space clipping rectangle.
 * @returns Local clip bounds, or null when the clip has no horizontal overlap.
 */
function resolveQuireTextFragmentLocalClip(
  fragment: QuireTextFragment,
  clipRect: QuireRect
): { readonly left: number; readonly right: number } | null {
  const left = Math.max(0, clipRect.x - fragment.rect.x);
  const right = Math.min(
    fragment.rect.width,
    clipRect.x + clipRect.width - fragment.rect.x
  );

  return right >= left ? { left, right } : null;
}

/**
 * Checks whether a caret stop sits within a local clip range.
 *
 * @param localX - Caret stop x coordinate in fragment-local space.
 * @param clip - Local clip bounds for the fragment.
 * @returns Whether the stop should be treated as visible.
 */
function isTextCaretStopInsideClip(
  localX: number,
  clip: { readonly left: number; readonly right: number }
): boolean {
  return localX >= clip.left - textCaretClipEpsilon
    && localX <= clip.right + textCaretClipEpsilon;
}

/**
 * Finds the caret stop nearest to a document position inside a fragment.
 *
 * @param fragment - Text fragment whose caret stops should be searched.
 * @param position - Document position to map.
 * @returns Nearest caret stop inside the fragment.
 */
export function findQuireTextCaretStopAtPosition(
  fragment: QuireTextFragment,
  position: number
): QuireTextCaretStop {
  const exactStop = fragment.caretStops.find((stop) => stop.position.pos === position);

  if (exactStop) {
    return exactStop;
  }

  const nextStop = fragment.caretStops.find((stop) => stop.position.pos > position);

  return nextStop ?? fragment.caretStops[fragment.caretStops.length - 1] ?? {
    position: { pos: fragment.range.from, bias: 1 },
    localX: 0
  };
}

/**
 * Finds a text fragment whose vertical line box contains a point.
 *
 * @param fragments - Text fragments to inspect.
 * @param point - Canvas point being hit-tested.
 * @returns Matching text fragment, or null when none matches.
 */
export function findQuireTextFragmentAtPoint(
  fragments: readonly QuireTextFragment[] | undefined,
  point: QuirePoint
): QuireTextFragment | null {
  const lineFragments = (fragments ?? [])
    .filter((fragment) => isPointInsideFragmentLineBox(fragment, point))
    .slice()
    .sort((first, second) => first.rect.x - second.rect.x);
  let nearestFragment: QuireTextFragment | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const fragment of lineFragments) {
    const distance = measureHorizontalDistanceToFragment(fragment, point.x);

    if (distance < nearestDistance) {
      nearestFragment = fragment;
      nearestDistance = distance;
    }
  }

  return nearestFragment;
}

/**
 * Builds measured caret stops for a single-line fragment.
 *
 * @param options - Fragment inputs and text measurer.
 * @param shape - Shaped run already computed for the fragment.
 * @returns Ordered caret stops from fragment start to fragment end.
 */
function buildQuireTextCaretStops(
  options: QuireTextFragmentOptions,
  shape: ReturnType<typeof shapeQuireTextRun>
): readonly QuireTextCaretStop[] {
  const stops: QuireTextCaretStop[] = [
    { position: { pos: options.range.from, bias: 1 }, localX: 0 }
  ];

  for (const cluster of shape.clusters) {
    const position = options.range.from + cluster.to;
    stops.push({
      position: {
        pos: Math.min(position, options.range.to),
        bias: position >= options.range.to ? -1 : 0
      },
      localX: cluster.x + cluster.advance
    });
  }

  if (options.direction !== "rtl") {
    return stops;
  }

  // The run reads right-to-left: the logical-first position sits at the right.
  // Mirror local x within the fragment width, then reorder so caret stops stay in
  // visual (ascending local x) order for hit testing and selection.
  const width = stops[stops.length - 1]?.localX ?? 0;
  return stops
    .map((stop) => ({ ...stop, localX: width - stop.localX }))
    .reverse();
}

/**
 * Checks whether a point falls inside a fragment's vertical line box.
 *
 * @param fragment - Text fragment whose line box should be inspected.
 * @param point - Canvas point to test.
 * @returns Whether the point is vertically inside the fragment line box.
 */
function isPointInsideFragmentLineBox(
  fragment: QuireTextFragment,
  point: QuirePoint
): boolean {
  return point.y >= fragment.rect.y && point.y <= fragment.rect.y + fragment.rect.height;
}

/**
 * Measures horizontal distance from an x coordinate to a text fragment.
 *
 * @param fragment - Text fragment whose horizontal interval should be measured.
 * @param x - Canvas x coordinate to compare.
 * @returns Distance to the fragment interval, or zero when x is inside it.
 */
function measureHorizontalDistanceToFragment(
  fragment: QuireTextFragment,
  x: number
): number {
  if (x < fragment.rect.x) {
    return fragment.rect.x - x;
  }

  const right = fragment.rect.x + fragment.rect.width;

  return x > right ? x - right : 0;
}
