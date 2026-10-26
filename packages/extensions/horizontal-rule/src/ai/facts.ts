import type { QuireAiCapability } from "@quirekit/ai-contract";

/**
 * Declares horizontal rules: labelled in the view and insertable as `{rule:true}`.
 * @param name - Horizontal rule node name.
 * @returns Block fact with its creation.
 */
export function createHorizontalRuleAiCapabilities(name: string): readonly QuireAiCapability[] {
  return [{
    kind: "block",
    node: name,
    label: () => "分隔线",
    create: {
      key: "rule",
      description: "A horizontal dividing line between paragraphs: {rule:true}.",
      schema: { const: true },
      build: (_value, schema) => schema.nodes[name]!.create()
    }
  }];
}
