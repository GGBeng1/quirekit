import type { MdDocxDiagnostic } from '@quirekit/md-editor';
import { loss } from '../diagnostics';
import type { MdBasicPreparedSource, MdBasicPrepareOptions } from '../types';
import { containerClosing, containerHeader, containerOpening, type OpenContainer } from './containers';
import { rewriteFence } from './embeds';

/** MSFE inline extras that CommonMark/GFM converters read differently. */
const extras = [/\+\+\S(?:[^+\n]*\S)?\+\+/u, /==\S(?:[^=\n]*\S)?==/u, /(?<![~\\])~[^~\s](?:[^~\n]*[^~\s])?~(?!~)/u, /\^\S(?:[^^\n]*\S)?\^/u];

/** Inline spans whose content is not prose: code, inline math and footnote markers. */
const literalSpans = /(`+[^`]*?`+|\$[^$\n]+\$|\[\^[^\]\n]+\])/u;

/** @param line - Text outside fences. @param rewrite - Edit applied to prose segments. @returns The edited line. */
function outsideCode(line: string, rewrite: (text: string) => string): string {
  return line.split(literalSpans).map((part, index) => index % 2 ? part : rewrite(part)).join('');
}

/** @param line - Text outside fences. @returns The line with code, math and footnote markers removed. */
function withoutCode(line: string): string {
  return line.split(literalSpans).filter((_, index) => index % 2 === 0).join('');
}

/**
 * Rewrites MSFE-only syntax into Markdown the open-source converters render,
 * recording every approximation. Code stays byte-identical; containers become
 * blockquotes; embedded objects become previews or placeholders.
 * @param markdown - Captured editor source.
 * @param options - How the target renders containers.
 * @returns Converter-ready source and its report.
 */
export function prepareBasicMarkdown(markdown: string, options: MdBasicPrepareOptions): MdBasicPreparedSource {
  const diagnostics: MdDocxDiagnostic[] = [], output: string[] = [], open: OpenContainer[] = [];
  const lines = markdown.replace(/\r\n?/gu, '\n').split('\n');
  let index = 0;
  // Front matter is document metadata, not body text; keep it visible as YAML code.
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end > 0) {
      output.push('```yaml', ...lines.slice(1, end), '```');
      diagnostics.push(loss('export', 'frontmatter-source', 'line 1', 'Document properties were kept as a YAML code block.'));
      index = end + 1;
    }
  }
  for (; index < lines.length; index++) {
    const line = lines[index]!, prefix = '> '.repeat(open.length);
    const fence = /^(\s*)(`{3,}|~{3,})\s*([^\s`]*)/u.exec(line);
    if (fence) {
      // Fenced code is copied verbatim; only whole embedded blocks are replaced.
      const marker = fence[2]!, start = index;
      while (++index < lines.length && !new RegExp(`^\\s*${marker[0] === '`' ? '`' : '~'}{${marker.length},}\\s*$`, 'u').test(lines[index]!));
      const block = lines.slice(start, Math.min(index, lines.length - 1) + 1);
      for (const item of rewriteFence(fence[3]!.toLowerCase(), block, fence[1]!, start + 1, diagnostics)) output.push(item ? `${prefix}${item}` : prefix.trimEnd());
      continue;
    }
    const opening = options.containers ? containerOpening(line) : undefined;
    if (opening) {
      open.push({ colons: opening.colons });
      output.push(...containerHeader(opening.name, opening.title, '> '.repeat(open.length), options.alerts));
      diagnostics.push(loss('export', 'container-quote', `line ${index + 1}`, `The ${opening.name} container was exported as a blockquote.`));
      continue;
    }
    const closed = options.containers ? containerClosing(line, open) : 0;
    if (closed) { open.length -= closed; output.push('> '.repeat(open.length).trimEnd()); continue; }
    if (extras.some(pattern => pattern.test(withoutCode(line)))) {
      diagnostics.push(loss('export', 'inline-source', `line ${index + 1}`, 'Underline, highlight, subscript or superscript syntax was kept as source text.'));
    }
    // A single tilde is a subscript in MSFE but strikethrough in GFM; escape it so the source stays literal.
    const text = outsideCode(line, part => part.replace(/(?<![~\\])~([^~\s](?:[^~\n]*[^~\s])?)~(?!~)/gu, '\\~$1\\~'));
    output.push(text ? `${prefix}${text}` : prefix.trimEnd());
  }
  return { markdown: output.join('\n'), diagnostics };
}
