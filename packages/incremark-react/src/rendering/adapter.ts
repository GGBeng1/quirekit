import { Children, Fragment, createElement as h, memo } from "react";
import type { ReactNode } from "react";
import type { MarkdownAdapter } from "@quirekit/incremark-core";
import type { MarkdownComponents } from "../types";
import { reactReading } from "../contributions/extension";
import { ReadingBoundary } from "../contributions/boundary";
import { renderElement } from "./element";
import { Preview } from "./preview";
import { Source } from "./source";

/** @param props - Accepted block output. @returns The same content without a DOM wrapper; memo retains local child state. */
const ReadingBlock = memo(function ReadingBlock(props: { readonly content: ReactNode }): ReactNode { return props.content; });

/** React creates nodes and resource boundaries; source semantics remain in core. */
export const reactAdapter: MarkdownAdapter<ReactNode> = {
  reading: reactReading,
  text: value => value,
  fragment: children => h(Fragment, null, ...Children.toArray(children)),
  element: (components, node, tag, attributes, children, locale) => renderElement(components as MarkdownComponents | undefined, node, tag, attributes, children, locale),
  fallback: (source, block) => h(block ? "pre" : "span", { style: { whiteSpace: "pre-wrap" } }, source),
  source: (_node, code, language, locale) => h(Source, { code, language, locale }),
  container: (_node, attributes, children) => h(attributes.collapsible ? "details" : "aside", {
    className: "quire-markdown-container", "data-container": attributes.kind, "data-tone": attributes.tone,
    ...(attributes.collapsible ? { open: attributes.open } : {}),
  }, h(attributes.collapsible ? "summary" : "strong", null, attributes.title), children),
  task: (_node, checked, label) => h("input", { type: "checkbox", checked, readOnly: true, disabled: true, "aria-label": label, className: "quire-markdown-task" }),
  preview: (_node, inputs) => h(Preview, { inputs }),
  contribution: input => h(ReadingBoundary, { key: `${input.contribution.owner}:${input.context.node.from}`, input }),
  block: (node, content) => h(ReadingBlock, { key: `${node.name}:${node.from}`, content }),
};
