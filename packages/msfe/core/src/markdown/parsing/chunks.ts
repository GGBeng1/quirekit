import { NodeType, Tree, TreeBuffer, type Input } from "@lezer/common";
import type { ReferenceBlock, ReferenceCertificates, ReferenceInlineTrace, ReferenceParseWork } from "./types";
import { paragraphDependencies, referenceDependenciesUnchanged } from "./dependencies";

const summaries = new WeakMap<Tree | TreeBuffer, readonly ReferenceBlock[]>();
const inlineBlock = /^(?:Paragraph|ATXHeading[1-6]|SetextHeading[12]|TableCell|DefinitionTerm)$/u;
const terminal = /^(?:FencedCode|CodeBlock|HTMLBlock|LinkReference|Frontmatter|MathBlock)$/u;

/** @param chunk - Immutable native chunk. @param offset - Its absolute source base. @param input - Current canonical source. @returns Relative candidate blocks, cached with the chunk that owns their text. */
export function referenceBlocks(chunk: Tree | TreeBuffer, offset: number, input: Input): readonly ReferenceBlock[] {
  const cached = summaries.get(chunk); if (cached) return cached;
  const result: ReferenceBlock[] = [];
  if (chunk instanceof Tree && !inlineBlock.test(chunk.type.name) && !terminal.test(chunk.type.name)) {
    chunk.children.forEach((child, index) => {
      const base = chunk.positions[index]!;
      for (const block of referenceBlocks(child, offset + base, input)) result.push({ from: base + block.from, to: base + block.to });
    });
  } else {
    const tree = chunk instanceof Tree ? chunk : new Tree(NodeType.none, [chunk], [0], chunk.length);
    tree.iterate({ enter(node) {
      if (terminal.test(node.name)) return false;
      if (!inlineBlock.test(node.name)) return;
      if (input.read(offset + node.from, offset + node.to).includes("[")) result.push({ from: node.from, to: node.to });
      return false;
    } });
  }
  summaries.set(chunk, result); return result;
}

/** @param chunk - Native chunk. @param offset - Its absolute base. @param input - Canonical source.
 * @param labels - Confirmed label-set identity. @param work - Actual traversal. @param certificates - Parser-owned proofs.
 * @returns Only blocks whose current grammar has not been certified under these definitions. */
export function affectedReferenceBlocks(chunk: Tree | TreeBuffer, offset: number, input: Input, labels: ReadonlySet<string>, work: ReferenceParseWork, certificates: ReferenceCertificates): ReferenceBlock[] {
  const certificate = certificates.get(chunk);
  if (certificate?.labels === labels) { work.reusedChunks++; return []; }
  work.visitedChunks++;
  if (referenceDependenciesUnchanged(certificate, labels, work)) {
    certificates.set(chunk, { labels, dependencies: certificate!.dependencies });
    work.reusedChunks++; return [];
  }
  if (chunk instanceof Tree && !inlineBlock.test(chunk.type.name) && !terminal.test(chunk.type.name)) {
    return chunk.children.flatMap((child, index) => affectedReferenceBlocks(child, offset + chunk.positions[index]!, input, labels, work, certificates));
  }
  const blocks = referenceBlocks(chunk, offset, input); work.checkedBlocks += blocks.length;
  return blocks.map(block => ({ from: offset + block.from, to: offset + block.to }));
}

/** @param chunk - Completed native grammar result. @param offset - Current source origin.
 * @param labels - Definitions used by its final pass. @param certificates - Parser-owned weak proofs.
 * @param trace - Ordered inline membership reads. @param work - Actual certification and trace work. */
export function certifyReferences(chunk: Tree | TreeBuffer, offset: number, labels: ReadonlySet<string>, certificates: ReferenceCertificates,
  trace: readonly ReferenceInlineTrace[], work: ReferenceParseWork): void {
  work.certifiedChunks++;
  if (certificates.get(chunk)?.labels === labels) return;
  const dependencies = chunk instanceof Tree && chunk.type.name === "Paragraph"
    ? paragraphDependencies(offset, offset + chunk.length, trace, work) : undefined;
  certificates.set(chunk, { labels, dependencies });
  // Certification uses the same ownership boundary as invalidation. Inline
  // children cannot be reused independently here and need no duplicate proof.
  if (chunk instanceof Tree && !inlineBlock.test(chunk.type.name) && !terminal.test(chunk.type.name)) {
    chunk.children.forEach((child, index) => certifyReferences(child, offset + chunk.positions[index]!, labels, certificates, trace, work));
  }
}
