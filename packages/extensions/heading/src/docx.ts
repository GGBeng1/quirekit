import type { QuireJSONContent } from "@quirekit/core";
import {
  createLitAstNodePreservation,
  defineDocxCodecServiceKey,
  docx,
  readLitAstNodePreservation,
  type LitAstNode
} from "@quirekit/lit-docx-contract";
import type { Level } from "./heading";

type QuireMark = NonNullable<QuireJSONContent["marks"]>[number];

/** Host-owned advanced heading conversion used by the local structural codec. */
export interface HeadingDocxService {
  /**
   * Imports one LitAST heading with document-level authorities.
   *
   * @param node - Source LitAST heading.
   * @param children - Already converted inline children.
   * @param path - Stable structural source path for carrier identity.
   * @returns Canonical paragraph-like node selected by the host schema.
   */
  readonly importHeading: (
    node: LitAstNode,
    children: readonly QuireJSONContent[],
    path: string
  ) => QuireJSONContent;
  /**
   * Exports one canonical heading with document-level authorities.
   *
   * @param node - Canonical heading node.
   * @param children - Already converted inline children.
   * @returns LitAST heading or preserved Word paragraph node.
   */
  readonly exportHeading: (
    node: QuireJSONContent,
    children: readonly LitAstNode[]
  ) => LitAstNode;
}

/** Typed host-service key consumed by the heading structural codec. */
export const headingDocxServiceKey =
  defineDocxCodecServiceKey<HeadingDocxService>(
    "quirekit.heading.codec"
  );

/** Bidirectional DOCX codec owned by the heading node extension. */
export const headingDocxCodec = docx.codec.node<
  QuireJSONContent,
  QuireMark
>({
  id: "extension.heading",
  modelType: "heading",
  import: {
    from: "heading",
    creates: ["paragraph"],
    childContentKind: "inline",
    convert: ({ node, path, convertChildren, resolveService }) => {
      const children = convertChildren(node.children ?? []);
      const service = resolveService(headingDocxServiceKey);
      return [service?.importHeading(node, children, path) ?? {
        type: "heading",
        attrs: {
          level: readHeadingLevel(node.attrs?.level),
          litAstNodePreservation: createLitAstNodePreservation(node)
        },
        content: [...children]
      }];
    }
  },
  export: {
    convert: ({ node, convertChildren, resolveService }) => {
      const children = convertChildren(node.content ?? []);
      const service = resolveService(headingDocxServiceKey);
      return [service?.exportHeading(node, children)
        ?? exportPreservedHeading(node, children)];
    }
  },
  capabilities: {
    fields: [
      "level",
      {
        field: "litAstNodePreservation",
        import: {
          disposition: "preserved",
          preservation: {
            authority: "Imported LitAST attrs, rawXml, and metadata.",
            invalidation: "An explicit heading source-preservation edit."
          }
        },
        export: {
          disposition: "preserved",
          preservation: {
            authority: "Imported LitAST attrs, rawXml, and metadata.",
            invalidation: "An explicit heading source-preservation edit."
          }
        }
      }
    ]
  }
});

/**
 * Exports preserved source fields when no advanced host service is installed.
 *
 * @param node - Canonical heading node.
 * @param children - Already converted inline children.
 * @returns Raw-preserving LitAST heading.
 */
function exportPreservedHeading(
  node: QuireJSONContent,
  children: readonly LitAstNode[]
): LitAstNode {
  const preserved = readLitAstNodePreservation(
    readRecord(node.attrs)?.litAstNodePreservation
  );
  const sourceAttrs = readRecord(preserved.attrs) ?? {};
  const meta = readRecord(preserved.meta);
  return {
    type: "heading",
    attrs: {
      ...sourceAttrs,
      level: readHeadingLevel(readRecord(node.attrs)?.level)
    },
    ...(typeof preserved.rawXml === "string" ? { rawXml: preserved.rawXml } : {}),
    ...(meta === undefined ? {} : { meta }),
    children: [...children]
  };
}

/**
 * Reads a supported heading level.
 *
 * @param value - Candidate heading level.
 * @returns Supported level, defaulting to one.
 */
function readHeadingLevel(value: unknown): Level {
  const level = typeof value === "string" ? Number.parseInt(value, 10) : value;
  return level === 1 || level === 2 || level === 3
    || level === 4 || level === 5 || level === 6
    ? level
    : 1;
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
