import type { QuireJSONContent } from "@quirekit/core";
import {
  createLitAstNodePreservation,
  docx,
  readLitAstNodePreservation
} from "@quirekit/lit-docx-contract";

type QuireMark = NonNullable<QuireJSONContent["marks"]>[number];

/** Bidirectional DOCX codec owned by the code-block node extension. */
export const codeBlockDocxCodec = docx.codec.node<
  QuireJSONContent,
  QuireMark
>({
  id: "extension.code-block",
  modelType: "codeBlock",
  import: {
    from: "codeBlock",
    childContentKind: "inline",
    convert: ({ node, convertChildren, report }) => {
      const children = convertChildren(node.children ?? []);
      if (children.some(hasSchemaIncompatibleCodeBlockFormatting)) {
        report({
          code: "code-block-inline-formatting-collapsed",
          message:
            "Collapsed DOCX run formatting into the canonical unmarked code-block text model.",
          schemaField: "node:codeBlock.content",
          sourceField: "node:codeBlock.children.marks",
          severity: "warning",
          disposition: "approximated"
        });
      }
      return [{
        type: "codeBlock",
        attrs: {
          language: readLanguage(node.attrs?.language),
          litAstNodePreservation: createLitAstNodePreservation(node)
        },
        content: [...normalizeCodeBlockDocxContent(children)]
      }];
    }
  },
  export: {
    convert: ({ node, convertChildren }) => [{
      ...exportCodeBlock(node),
      children: [...convertChildren(node.content ?? [])]
    }]
  },
  capabilities: {
    fields: [
      {
        field: "wordNodeRevision",
        export: {
          disposition: "unsupported",
          diagnosticCodes: ["word-node-revision-export-unsupported"],
          note: "Whole-code-block insertion review remains editor-native until an OOXML projection is admitted."
        }
      },
      {
        field: "language",
        import: {
          disposition: "preserved",
          preservation: {
            authority: "Imported LitAST language and producer style metadata.",
            invalidation: "Editing the modeled code-block language."
          }
        },
        export: {
          disposition: "preserved",
          preservation: {
            authority: "Imported LitAST language and producer style metadata.",
            invalidation: "Editing the modeled code-block language."
          }
        }
      },
      {
        field: "litAstNodePreservation",
        import: {
          disposition: "preserved",
          preservation: {
            authority: "Imported LitAST attrs, rawXml, and metadata.",
            invalidation: "An explicit code-block source-preservation edit."
          }
        },
        export: {
          disposition: "preserved",
          preservation: {
            authority: "Imported LitAST attrs, rawXml, and metadata.",
            invalidation: "An explicit code-block source-preservation edit."
          }
        }
      }
    ]
  }
});

/**
 * Projects imported inline content onto the canonical unmarked code-block model.
 *
 * @param content - Imported inline children from the shared DOCX registry.
 * @returns Plain text children with explicit hard breaks represented by newlines.
 */
export function normalizeCodeBlockDocxContent(
  content: readonly QuireJSONContent[]
): readonly QuireJSONContent[] {
  return content.flatMap((child) => {
    if (child.type === "hardBreak") {
      return [{ type: "text", text: "\n" }];
    }
    if (child.type !== "text" || child.marks === undefined) return [child];
    const normalized = { ...child };
    delete normalized.marks;
    return [normalized];
  });
}

/**
 * Detects inline fields excluded by the canonical code-block schema.
 *
 * @param child - Imported inline child.
 * @returns Whether normalization must collapse marks or a hard break.
 */
function hasSchemaIncompatibleCodeBlockFormatting(
  child: QuireJSONContent
): boolean {
  return child.type === "hardBreak" || (child.marks?.length ?? 0) > 0;
}

/**
 * Restores preserved code-block attributes while invalidating an edited language.
 *
 * @param node - Canonical code-block node.
 * @returns LitAST code-block fields except converted children.
 */
function exportCodeBlock(node: QuireJSONContent) {
  const preserved = readLitAstNodePreservation(
    readRecord(node.attrs)?.litAstNodePreservation
  );
  const sourceAttrs = readRecord(preserved.attrs) ?? {};
  const originalLanguage = readLanguage(sourceAttrs.language);
  const language = readLanguage(readRecord(node.attrs)?.language);
  const attrs = { ...sourceAttrs };

  if (language !== originalLanguage) {
    delete attrs.styleId;
    if (language === null) {
      delete attrs.language;
      attrs.styleId = "Code";
    } else {
      attrs.language = language;
    }
  }

  return {
    type: "codeBlock",
    ...(Object.keys(attrs).length === 0 ? {} : { attrs }),
    ...(typeof preserved.rawXml === "string" ? { rawXml: preserved.rawXml } : {}),
    ...(readRecord(preserved.meta) === undefined
      ? {}
      : { meta: readRecord(preserved.meta) })
  };
}

/**
 * Reads the canonical nullable code-language value.
 *
 * @param value - Candidate language.
 * @returns Non-empty language string or null.
 */
function readLanguage(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Reads one record without accepting arrays.
 *
 * @param value - Candidate record.
 * @returns Record or undefined.
 */
function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}
