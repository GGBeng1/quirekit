import { defineComponent, h, type PropType, type VNodeChild } from "vue";

// Cached VNodes alone still allow conservative component-slot updates. A stable
// prop boundary skips that parent-driven work without suppressing child reactivity.
const ReadingBlock = defineComponent({
  name: "MarkdownReadingBlock",
  props: { content: { type: null as unknown as PropType<VNodeChild> } },
  /** @param props - Already-projected block content. @returns The block with no additional DOM element. */
  setup: props => () => props.content,
});

/** @param content - One top-level block's accepted Vue output. @returns A component boundary shared by cached and full-projection modes. */
export function blockOutput(content: VNodeChild): VNodeChild { return h(ReadingBlock, { content }); }
