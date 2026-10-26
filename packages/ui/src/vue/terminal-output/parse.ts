import type { QuireKitTerminalOutputChunk } from '../../components/terminal-output';

/** A safe text span, never interpreted as HTML or a terminal command. */
export interface TerminalSpan {
  /** Visible text. */
  readonly text: string;
  /** Originating process stream. */
  readonly stream: 'stdout' | 'stderr';
  /** Supported foreground palette key. */
  readonly color?: string;
  /** Bold SGR style. */
  readonly bold: boolean;
  /** Dim SGR style. */
  readonly dim: boolean;
  /** Underline SGR style. */
  readonly underline: boolean;
}

/** Bounded display projection; the caller retains the original chunks for copying. */
export interface TerminalProjection {
  /** Ordered safe spans. */
  readonly spans: readonly TerminalSpan[];
  /** Whether earlier source text was omitted from the rendered tail. */
  readonly clipped: boolean;
}

const colorNames = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];

/**
 * Render only a bounded tail and interpret a deliberately small ANSI SGR subset.
 * OSC, cursor commands and other controls never reach the DOM as executable markup.
 *
 * @param chunks - Host-owned chronological process output.
 * @param maximum - Maximum number of source code units scanned for this render.
 * @returns Safe text spans plus the display clipping indicator.
 */
export function parseTerminalOutput(chunks: readonly QuireKitTerminalOutputChunk[], maximum: number): TerminalProjection {
  const limit = Number.isFinite(maximum) ? Math.max(1024, Math.trunc(maximum)) : 80_000;
  const tail: QuireKitTerminalOutputChunk[] = [];
  let remaining = limit;
  let clipped = false;
  for (let index = chunks.length - 1; index >= 0; index--) {
    const chunk = chunks[index]!;
    if (remaining <= 0) { clipped = true; break; }
    const text = chunk.text.length > remaining ? chunk.text.slice(-remaining) : chunk.text;
    if (text.length < chunk.text.length) clipped = true;
    tail.push({ id: chunk.id, stream: chunk.stream, text });
    remaining -= text.length;
  }
  tail.reverse();

  const spans: TerminalSpan[] = [];
  let color: string | undefined;
  let bold = false;
  let dim = false;
  let underline = false;
  let mode: 'text' | 'escape' | 'csi' | 'osc' | 'osc-escape' = 'text';
  let sequence = '';
  let buffer = '';
  let bufferStream: 'stdout' | 'stderr' = 'stdout';

  /** Flushes the current run before a stream or style boundary. */
  function flush(): void {
    if (!buffer) return;
    spans.push({ text: buffer, stream: bufferStream, ...(color === undefined ? {} : { color }), bold, dim, underline });
    buffer = '';
  }

  /**
   * Applies only well-formed, supported SGR parameters.
   * @param value - Numeric parameter string without the CSI terminator.
   */
  function applySgr(value: string): void {
    if (!/^[\d;]*$/.test(value)) return;
    const codes = value === '' ? [0] : value.split(';').map(Number);
    for (let index = 0; index < codes.length; index++) {
      const code = codes[index]!;
      if (code === 38 || code === 48) {
        // Extended foreground/background palettes are intentionally unsupported.
        const kind = codes[index + 1];
        index += kind === 5 ? 2 : kind === 2 ? 4 : 0;
        continue;
      }
      if (code === 0) { color = undefined; bold = false; dim = false; underline = false; }
      else if (code === 1) bold = true;
      else if (code === 2) dim = true;
      else if (code === 4) underline = true;
      else if (code === 22) { bold = false; dim = false; }
      else if (code === 24) underline = false;
      else if (code === 39) color = undefined;
      else if (code >= 30 && code <= 37) color = colorNames[code - 30];
      else if (code >= 90 && code <= 97) color = `bright-${colorNames[code - 90]}`;
    }
  }

  for (const chunk of tail) {
    for (const character of chunk.text) {
      if (mode === 'escape') {
        if (character === '[') { mode = 'csi'; sequence = ''; }
        else if (character === ']') mode = 'osc';
        else mode = 'text';
        continue;
      }
      if (mode === 'csi') {
        if (character >= '@' && character <= '~') {
          if (character === 'm') { flush(); applySgr(sequence); }
          mode = 'text';
        } else if (sequence.length < 32) sequence += character;
        else mode = 'text';
        continue;
      }
      if (mode === 'osc') {
        if (character === '\u0007') mode = 'text';
        else if (character === '\u001b') mode = 'osc-escape';
        continue;
      }
      if (mode === 'osc-escape') {
        mode = character === '\\' ? 'text' : 'osc';
        continue;
      }
      if (character === '\u001b') { mode = 'escape'; continue; }
      if (character === '\r') continue;
      if (character < ' ' && character !== '\n' && character !== '\t') continue;
      if (buffer && bufferStream !== chunk.stream) flush();
      bufferStream = chunk.stream;
      buffer += character;
    }
  }
  flush();
  return { spans, clipped };
}
