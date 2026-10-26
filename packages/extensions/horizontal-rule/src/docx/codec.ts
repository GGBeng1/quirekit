import type { QuireJSONContent } from "@quirekit/core";
import {
  createLitAstNodePreservation,
  docx,
  readLitAstNodePreservation,
  type LitAstNode
} from "@quirekit/lit-docx-contract";
import { distributeIndent, resolveTotalIndent } from "./geometry";
import { horizontalRuleDocxGeometryServiceKey } from "./types";
import {
  horizontalRuleStyleId,
  mapVariantToOoxmlBorder,
  normalizeCodecHorizontalRuleStyle,
  readHorizontalRuleStyleFromLitAst,
  readNonEmptyString,
  readRecord
} from "./values";

type QuireMark = NonNullable<QuireJSONContent["marks"]>[number];

/** Bidirectional DOCX codec owned by the horizontal-rule node extension. */
export const horizontalRuleDocxCodec = docx.codec.node<
  QuireJSONContent,
  QuireMark
>({
  id: "extension.horizontal-rule",
  modelType: "horizontalRule",
  import: {
    from: "horizontalRule",
    convert: ({ node, resolveService }) => [{
      ...importHorizontalRuleDocxNode(
        node,
        resolveService(horizontalRuleDocxGeometryServiceKey)
          ?.sectionBodyWidthDxa
      )
    }]
  },
  export: {
    convert: ({ node, resolveService }) => [{
      ...exportHorizontalRuleDocxNode(
        node,
        resolveService(horizontalRuleDocxGeometryServiceKey)
          ?.sectionBodyWidthDxa
      )
    }]
  },
  capabilities: {
    fields: [
      "variant",
      "color",
      "thicknessPt",
      "widthPercent",
      "alignment",
      {
        field: "wordNodeRevision",
        export: {
          disposition: "unsupported",
          diagnosticCodes: ["word-node-revision-export-unsupported"],
          note: "Whole-horizontal-rule insertion review remains editor-native until an OOXML projection is admitted."
        }
      },
      {
        field: "litAstNodePreservation",
        import: {
          disposition: "preserved",
          preservation: {
            authority: "Imported LitAST attrs, rawXml, and metadata.",
            invalidation: "An explicit horizontal-rule source-preservation edit."
          }
        },
        export: {
          disposition: "preserved",
          preservation: {
            authority: "Imported LitAST attrs, rawXml, and metadata.",
            invalidation: "An explicit horizontal-rule source-preservation edit."
          }
        }
      }
    ]
  }
});

/**
 * Converts a LitAST horizontal rule into canonical Quire JSON.
 *
 * @param node - Source LitAST horizontal-rule node.
 * @param sectionBodyWidthDxa - Available section body width in twentieths of a point.
 * @returns Canonical horizontal-rule node with source preservation.
 */
export function importHorizontalRuleDocxNode(
  node: LitAstNode,
  sectionBodyWidthDxa?: number
): QuireJSONContent {
  return {
    type: "horizontalRule",
    attrs: {
      ...readHorizontalRuleStyleFromLitAst(node.attrs, sectionBodyWidthDxa),
      litAstNodePreservation: createLitAstNodePreservation(node)
    }
  };
}

/**
 * Converts a canonical horizontal rule into LitAST paragraph-border attributes.
 *
 * @param node - Canonical horizontal-rule node.
 * @param sectionBodyWidthDxa - Available section body width in twentieths of a point.
 * @returns LitAST horizontal-rule node ready for OOXML generation.
 */
export function exportHorizontalRuleDocxNode(
  node: QuireJSONContent,
  sectionBodyWidthDxa?: number
): LitAstNode {
  const source = readLitAstNodePreservation(
    readRecord(node.attrs)?.litAstNodePreservation
  );
  const sourceAttrs = readRecord(source.attrs) ?? {};
  const style = normalizeCodecHorizontalRuleStyle(readRecord(node.attrs));
  const totalIndent = resolveTotalIndent(style.widthPercent, sectionBodyWidthDxa);
  const [left, right] = distributeIndent(totalIndent, style.alignment);
  const sourceBorders = readRecord(sourceAttrs.borders) ?? {};
  const sourceBottom = readRecord(sourceBorders.bottom) ?? {};
  const sourceIndent = readRecord(sourceAttrs.indent) ?? {};
  const meta = readRecord(source.meta);

  return {
    type: "horizontalRule",
    attrs: {
      ...sourceAttrs,
      variant: style.variant,
      color: style.color,
      thicknessPt: style.thicknessPt,
      widthPercent: style.widthPercent,
      alignment: style.alignment,
      styleId: readNonEmptyString(sourceAttrs.styleId) ?? horizontalRuleStyleId,
      textAlign: style.alignment,
      ...(totalIndent === undefined
        ? {}
        : {
            indent: {
              ...sourceIndent,
              left,
              right
            }
          }),
      borders: {
        ...sourceBorders,
        bottom: {
          ...sourceBottom,
          val: mapVariantToOoxmlBorder(style.variant),
          sz: Math.max(2, Math.round(style.thicknessPt * 8)),
          color: style.color.slice(1).toUpperCase(),
          space: 1,
          ...(style.variant === "shaded" ? { shadow: true } : { shadow: false })
        }
      }
    },
    ...(typeof source.rawXml === "string" ? { rawXml: source.rawXml } : {}),
    ...(meta === undefined ? {} : { meta })
  };
}
