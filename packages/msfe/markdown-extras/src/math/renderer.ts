import { previewRenderer } from "../shared/preview";
import type { ComponentViewRenderer } from "@quirekit/msfe-core";
import type { PreviewActivation, PreviewOptions, PreviewProps } from "../shared/types";

/** @param controls - Optional host component actions. @param activation - Display-formula editing gesture. @returns Lazy, isolated KaTeX output with finite expansion and size limits. */
export function createMathRenderer(controls: PreviewOptions["controls"], activation?: PreviewActivation): ComponentViewRenderer<PreviewProps> {
  return previewRenderer(async (props, signal) => {
    if (props.text.length > 16_000) throw new RangeError("math-preview-too-large");
    const { default: katex } = await import("katex");
    signal.throwIfAborted();
    return katex.renderToString(props.text, { displayMode: props.kind === "displayMath", trust: false,
      throwOnError: true, strict: "error", maxSize: 20, maxExpand: 1000, macros: {} });
  }, controls, activation ? { activation } : {});
}
