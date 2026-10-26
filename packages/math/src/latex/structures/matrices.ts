import type { MathColumnAlign, MathMatrix, MathMatrixEnvironment, MathSequence } from '../../model/types';
import { mathEnvironmentLimits, mathEnvironments } from '../commands';
import type { MathLatexReader } from '../reader';
import type { MathStructureParser } from '../types';

const lengthOption = /^\[\s*-?(?:\d+\.?\d*|\.\d+)\s*(?:pt|em|ex|mm|cm|in|mu|bp|pc|dd|cc|sp)\s*\]/u;
const columnAligns: Readonly<Record<string, MathColumnAlign>> = Object.freeze({ l: 'left', c: 'center', r: 'right' });

/** Column specification of an `array` environment. */
interface ArrayColumns {
  /** Alignment of each column. */
  readonly columns: readonly MathColumnAlign[];
  /** Rule before each column, plus one after the last column. */
  readonly lines: readonly boolean[];
}

/**
 * Reads `{l|cr}` after `\begin{array}`.
 * @param reader - Source cursor.
 * @returns Column alignment and vertical rules.
 */
function arrayColumns(reader: MathLatexReader): ArrayColumns {
  reader.expect('{');
  const columns: MathColumnAlign[] = [];
  const lines: boolean[] = [false];
  while (reader.source[reader.offset] !== '}') {
    const token = reader.source[reader.offset];
    if (token === '|') lines[columns.length] = true;
    else if (token && Object.hasOwn(columnAligns, token)) {
      columns.push(columnAligns[token]!);
      lines.push(false);
    } else if (!token || !/\s/u.test(token)) reader.fail('unsupported-command', 'Array columns support l, c, r and |.');
    reader.offset++;
  }
  reader.offset++;
  if (!columns.length) reader.fail('missing-argument', 'An array needs at least one column.');
  return { columns, lines };
}

/**
 * Consumes `\hline` rules at a row boundary.
 * @param reader - Source cursor.
 * @param rules - Row boundaries collected so far.
 * @param row - Boundary index before the next row.
 */
function horizontalRules(reader: MathLatexReader, rules: number[], row: number): void {
  while (true) {
    reader.whitespace();
    if (!reader.stops(['\\hline'])) return;
    reader.command();
    if (!rules.includes(row)) rules.push(row);
  }
}

/**
 * Reads cells and rows until a closing token, keeping separators outside each cell.
 * @param parser - Recursive sequence authority.
 * @param closing - Separator that ends the environment body.
 * @param rules - Collected `\hline` boundaries, when the environment admits them.
 * @returns Rows of cells in source order.
 */
function cells(parser: MathStructureParser, closing: string, rules?: number[]): MathSequence[][] {
  const { reader } = parser;
  const rows: MathSequence[][] = [[]];
  if (rules) horizontalRules(reader, rules, 0);
  while (true) {
    const row = rows.at(-1)!;
    row.push({ ...parser.sequence(['&', '\\\\', closing]), boundary: 'cell' });
    if (row.length > mathEnvironmentLimits.columns || rows.length > mathEnvironmentLimits.rows) {
      reader.fail('limit-exceeded', `Environment exceeds ${mathEnvironmentLimits.rows} rows or ${mathEnvironmentLimits.columns} columns.`);
    }
    if (reader.source[reader.offset] === '&') {
      reader.offset++;
      continue;
    }
    if (!reader.stops(['\\\\'])) break;
    reader.offset += 2;
    // `\\[2pt]` adjusts row spacing only; the source keeps the exact length.
    const length = lengthOption.exec(reader.source.slice(reader.offset, reader.offset + 32));
    if (length) reader.offset += length[0].length;
    if (rules) horizontalRules(reader, rules, rows.length);
    reader.whitespace();
    // TeX ignores a final row separator before the environment end.
    if (reader.stops([closing])) break;
    rows.push([]);
  }
  if (!reader.stops([closing])) reader.fail('unexpected-token', 'Missing environment end.');
  return rows;
}

/**
 * Parses a bounded alignment environment, retaining exact cell content boundaries.
 * @param parser - Recursive sequence authority.
 * @param start - Original begin command offset.
 * @returns Complete environment; unknown environments fail as a whole.
 */
export function parseMathMatrix(parser: MathStructureParser, start: number): MathMatrix {
  const { reader } = parser;
  reader.expect('{');
  const name = /^[A-Za-z]+\*?/u.exec(reader.source.slice(reader.offset, reader.offset + 32))?.[0];
  if (!name || !Object.hasOwn(mathEnvironments, name) || name === 'substack') return reader.fail('unsupported-command', 'Unsupported math environment.');
  reader.offset += name.length;
  reader.expect('}');
  const environment = name as MathMatrixEnvironment;
  const array = environment === 'array' ? arrayColumns(reader) : undefined;
  const rules: number[] = [];
  const rows = cells(parser, '\\end', array ? rules : undefined);
  reader.command();
  reader.expect(`{${name}}`);
  const preset = mathEnvironments[environment];
  const widest = Math.max(...rows.map(row => row.length));
  if (preset.maxColumns && widest > preset.maxColumns || array && widest > array.columns.length) {
    reader.fail('unexpected-token', `Too many columns in ${name}.`);
  }
  if (preset.maxRows && rows.length > preset.maxRows) reader.fail('unexpected-token', `Too many rows in ${name}.`);
  return {
    kind: 'matrix', environment, rows,
    ...(array ? { columns: array.columns, columnLines: array.lines } : {}),
    ...(rules.length ? { rowLines: rules } : {}),
    source: { start, end: reader.offset },
  };
}

/**
 * Parses `\substack{a\\b}` as a one-column stack of editable rows.
 * @param parser - Recursive sequence authority.
 * @param start - Original command offset.
 * @returns Stack environment.
 */
export function parseMathSubstack(parser: MathStructureParser, start: number): MathMatrix {
  const { reader } = parser;
  reader.expect('{');
  const rows = cells(parser, '}');
  reader.expect('}');
  if (rows.some(row => row.length > 1)) reader.fail('unexpected-token', 'A substack has one column.');
  return { kind: 'matrix', environment: 'substack', rows, source: { start, end: reader.offset } };
}
