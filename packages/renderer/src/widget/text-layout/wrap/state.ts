import { resolveQuireTextLineSlots } from "../row-slots";
import type { QuireTextLayoutOptions, QuireTextAnchor, QuireTextLineSlot, QuireTextLineEnding } from "../types";
import type { RunGrapheme } from "../units";
import type { LineRun, LineSlotRun, TextWrapState } from "./types";
import { appendCharacterGrid, createCharacterGridMeter } from "../character-grid/meter";

/**
 * Owns occupied line slots independently of text measurement and tab semantics.
 * @param options - Fixed wrap width, physical row slots and paragraph direction.
 * @returns Mutable source-order row packing authority.
 */
export function createTextWrapState(
  options: Pick<QuireTextLayoutOptions, "maxWidth" | "lineSlots" | "baseDirection"> & { readonly characterGrid?: boolean }
): TextWrapState {
  const { maxWidth, lineSlots, baseDirection } = options;
  const lines: LineRun[] = [];
  let current: RunGrapheme[] = [];
  let occupiedSlots: Array<{ slot: QuireTextLineSlot; graphemes: RunGrapheme[] }> = [];
  let lineIndex = 0;
  let slots = resolveQuireTextLineSlots(lineIndex, maxWidth, lineSlots, baseDirection);
  let slotIndex = 0;
  let width = 0;
  let grid = options.characterGrid ? createCharacterGridMeter() : undefined;
  const state: TextWrapState = {
    lines,
    /** @returns Current physical line slot after directional progression. */
    get slot() { return slots[slotIndex]!; },
    /** @returns Advance already occupied in the current slot. */
    get width() { return width; },
    fallback: { run: 0, offset: 0 },
    /** @param ending - Source termination reason. */
    flush(ending: QuireTextLineEnding = "wrap") {
      lines.push({ ...makeRun(current, occupiedSlots, state.fallback), ending });
      current = [];
      occupiedSlots = [];
      lineIndex++;
      slots = resolveQuireTextLineSlots(lineIndex, maxWidth, lineSlots, baseDirection);
      slotIndex = 0;
      width = 0;
      if (grid) grid = createCharacterGridMeter();
    },
    /**
     * Declared blocked rows still consume a row. The fallback guarantees
     * progress; indivisible overflow is allowed only at a fresh fallback slot.
     * @param required - Advance that must fit in one slot.
     * @param allowOverflow - Whether an overlong indivisible unit may overflow.
     * @param leadingSpacing - Candidate gap dropped at a physical slot's beginning.
     * @param graphemes - Optional measured candidate for stateful cell rounding.
     */
    seek(required, allowOverflow, leadingSpacing = 0, graphemes) {
      while (true) {
        const slot = slots[slotIndex];
        if (slot === undefined) { state.flush(); continue; }
        const candidate = grid && graphemes ? { ...grid } : undefined;
        const advance = candidate ? appendCharacterGrid(candidate, graphemes!)
          : required - (width === 0 ? leadingSpacing : 0);
        if (advance <= slot.width - width + (candidate ? candidate.tolerance + 1e-9 : 0) || advance === 0) return;
        const fallbackRow = lineSlots === undefined || lineIndex >= lineSlots.length;
        if (allowOverflow && width === 0 && fallbackRow) return;
        slotIndex++;
        width = 0;
        if (grid) grid = createCharacterGridMeter();
      }
    },
    /** @param graphemes - Source-order graphemes. @param advance - Measured occupied width. */
    append(graphemes, advance) {
      const slot = slots[slotIndex];
      if (slot === undefined) throw new RangeError("Text wrapping attempted to append without an active slot.");
      let occupied = occupiedSlots.at(-1);
      if (occupied?.slot !== slot) {
        occupied = { slot, graphemes: [] };
        occupiedSlots.push(occupied);
      }
      for (const grapheme of graphemes) {
        current.push(grapheme);
        occupied.graphemes.push(grapheme);
      }
      width += grid ? appendCharacterGrid(grid, graphemes)
        : advance - (width === 0 ? graphemes[0]?.spacingBefore ?? 0 : 0);
    }
  };
  return state;
}

/**
 * Derives row anchors from source graphemes, retaining an empty-row fallback.
 * @param graphemes - Occupied graphemes on the row.
 * @param slotRuns - Exact occupied row slots.
 * @param fallback - Anchor for an empty source row.
 * @returns Source row with anchors independent of its termination reason.
 */
function makeRun(
  graphemes: readonly RunGrapheme[], slotRuns: readonly LineSlotRun[], fallback: QuireTextAnchor
): Omit<LineRun, "ending"> {
  if (graphemes.length === 0) return { graphemes, slotRuns, start: fallback, end: fallback };
  const first = graphemes[0]!, last = graphemes.at(-1)!;
  return {
    graphemes, slotRuns,
    start: { run: first.run, offset: first.offset },
    end: { run: last.run, offset: last.offset + last.text.length }
  };
}
