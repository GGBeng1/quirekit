import { h, type VNodeChild } from "vue";
import { QuireCheckbox, QuireProseContainer, QuireProseSource } from "@quirekit/ui/vue";
import type { MarkdownAdapter } from "@quirekit/incremark-core";
import type { MarkdownComponents } from "../types";
import { vueReading } from "../contributions/registry";
import { ReadingBoundary } from "../contributions/boundary";
import { blockOutput } from "../cache/block";
import { renderElement } from "./element";
import Preview from "./preview.vue";

/** Vue output construction over the shared semantic walker; no source parsing lives here. */
export const vueAdapter: MarkdownAdapter<VNodeChild> = {
  reading: vueReading,
  text: value => value,
  fragment: children => [...children],
  element: (components, node, tag, attributes, children) => renderElement(components as MarkdownComponents | undefined, node, tag, attributes, children),
  fallback: (source, block) => h(block ? "pre" : "span", { style: { whiteSpace: "pre-wrap" } }, source),
  source: (_node, code, language) => h(QuireProseSource, { code, language }),
  container: (_node, attributes, children) => h(QuireProseContainer, {
    "data-container": attributes.kind, title: attributes.title, tone: attributes.tone,
    collapsible: attributes.collapsible, open: attributes.open,
  }, { default: () => children }),
  task: (_node, checked, label) => h(QuireCheckbox, { checked, readOnly: true, label, class: "qk-prose-task-marker", "data-qk-not-prose": "" },
    { default: () => h("span", { class: "sr-only" }, label) }),
  preview: (_node, inputs) => h(Preview, { ...inputs }),
  contribution: input => h(ReadingBoundary, { key: `${input.contribution.owner}:${input.context.node.from}`, input }),
  block: (_node, output) => blockOutput(output),
};
