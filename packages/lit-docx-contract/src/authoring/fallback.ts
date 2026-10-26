import type { LitAstNode } from "../core/contracts.js";
import type {
  DocxAuthoringDiagnostic,
  DocxFallbackApi,
  DocxFallbackOptions
} from "./types.js";
import { createDocxBlocksApi } from "./blocks.js";
import { createDocxStylesApi } from "./styles.js";
import { createDocxTablesApi } from "./tables.js";

/**
 * Creates fallback operations bound to one conversion diagnostic authority.
 *
 * @param report - Diagnostic sink supplied by the conversion executor.
 * @param defaultDiagnostic - Codec-level diagnostic used by concise fallbacks.
 * @returns Immutable fallback operation family.
 */
export function createDocxFallbackApi(
  report?: (diagnostic: {
    readonly code: string;
    readonly message: string;
    readonly severity: "info" | "warning" | "error";
    readonly disposition: "native" | "projected" | "preserved" | "approximated" | "unsupported";
  }) => void,
  defaultDiagnostic?: DocxAuthoringDiagnostic
): DocxFallbackApi {
  const blocks = createDocxBlocksApi();
  const styles = createDocxStylesApi();
  const tables = createDocxTablesApi();
  const emit = (options?: DocxFallbackOptions) => {
    const diagnostic = options?.diagnostic ?? defaultDiagnostic;
    if (diagnostic === undefined) {
      throw new TypeError(
        "DOCX fallback requires a codec-level or operation-level diagnostic."
      );
    }
    if (report === undefined) {
      throw new TypeError(
        "DOCX fallback operations require a conversion-bound diagnostic reporter."
      );
    }
    report({
      code: diagnostic.code,
      message: diagnostic.message,
      severity: diagnostic.severity ?? "warning",
      disposition: diagnostic.disposition ?? "approximated"
    });
  };
  const api: DocxFallbackApi = {
    flattenChildren: (children, options) => {
      emit(options);
      return Object.freeze([...children]);
    },
    asParagraphs: (children, options) => {
      emit(options);
      return Object.freeze(groupAsParagraphs(children, blocks));
    },
    asShadedTable: (options) => {
      emit(options);
      return Object.freeze([tables.singleCellContainer({
        children: groupAsParagraphs(options.children, blocks),
        shading: styles.shading({ fill: options.fill ?? "F2F4F7" }),
        ...(options.border === undefined ? {} : { border: options.border })
      })]);
    },
    asImage: (options) => {
      emit(options);
      return Object.freeze([Object.freeze({
        type: "image",
        attrs: Object.freeze({ ...options.image })
      })]);
    },
    omitWithDiagnostic: (options) => {
      emit({
        ...options,
        diagnostic: options?.diagnostic === undefined
          ? defaultDiagnostic === undefined
            ? undefined
            : { ...defaultDiagnostic, disposition: "unsupported" }
          : { ...options.diagnostic, disposition: "unsupported" }
      });
      return Object.freeze([]);
    }
  };
  return Object.freeze(api);
}

/**
 * Retains existing blocks and groups adjacent inline nodes into paragraphs.
 *
 * @param children - Mixed semantic content.
 * @param blocks - Bound block builders.
 * @returns Legal block sequence.
 */
function groupAsParagraphs(
  children: readonly LitAstNode[],
  blocks: ReturnType<typeof createDocxBlocksApi>
): LitAstNode[] {
  const result: LitAstNode[] = [];
  let inline: LitAstNode[] = [];
  const flush = () => {
    if (inline.length === 0) return;
    result.push(blocks.paragraph({ children: inline }));
    inline = [];
  };
  for (const child of children) {
    if (isBlock(child)) {
      flush();
      result.push(child);
    } else {
      inline.push(child);
    }
  }
  flush();
  return result.length === 0 ? [blocks.paragraph()] : result;
}

/**
 * Determines whether one semantic node is already legal block content.
 *
 * @param node - Candidate semantic node.
 * @returns Whether the node is block-level.
 */
function isBlock(node: LitAstNode): boolean {
  return new Set([
    "paragraph",
    "heading",
    "blockquote",
    "codeBlock",
    "pageBreak",
    "table",
    "sdt",
    "image",
    "horizontalRule"
  ]).has(node.type);
}
