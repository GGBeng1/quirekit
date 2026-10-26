import { defineComponent, h } from "vue";
import { QuireProseSource } from "@quirekit/ui/vue";
import type { MarkdownComponents } from "@quirekit/incremark/vue";

/** Fenced code shown expanded: the reading view presents the whole document rather than a collapsed summary. */
const ExpandedSource = defineComponent({
  name: "MdReadingSource",
  inheritAttrs: false,
  /** @param _props - No declared props; code, language and metadata arrive as attributes. @param context - Attributes and slots. @returns Render function. */
  setup(_props, { attrs, slots }) {
    return () => h(QuireProseSource, { ...attrs, defaultCollapsed: false }, slots);
  },
});

/** Component overrides for MD Editor's built-in reading view. */
export const mdReadingComponents: MarkdownComponents = { pre: ExpandedSource };
