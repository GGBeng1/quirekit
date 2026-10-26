import { createElement as h, useId, useLayoutEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import type { MarkdownReadingError } from "@quirekit/incremark-core";
import type { QuireMarkdownProps } from "../types";
import type { ReadingFrame } from "./types";
import { useMarkdownSource } from "../source/hook";
import { MarkdownRenderer } from "./render";

/** @param props - Static, streaming or accepted-state source and trusted presentation policy.
 * @returns React semantic reading with deterministic SSR, source fallback and committed block reuse. */
export function QuireMarkdown(props: QuireMarkdownProps): ReactNode {
  const locale = props.locale ?? "zh-CN", status = props.status ?? "complete", prefix = `md-${useId()}`;
  const observer = useRef(props.onError);
  useLayoutEffect(() => { observer.current = props.onError; }, [props.onError]);
  const report = useMemo(() => (failure: MarkdownReadingError) => {
    try { (observer.current ?? console.error)(failure); } catch (cause) { console.error(cause); }
  }, []);
  const source = useMarkdownSource(props, report);
  const owner = useMemo(() => ({ renderer: new MarkdownRenderer(), connections: 0 }), [source.generation]);
  useLayoutEffect(() => {
    owner.connections++;
    return () => {
      owner.connections--;
      // StrictMode reconnects the same owner before this microtask; a real unmount
      // drops its directory. No abandoned render publishes or clears another owner.
      queueMicrotask(() => { if (!owner.connections) owner.renderer.clear(); });
    };
  }, [owner]);
  // Recheck declared external keys and HTML restrictions on every accepted render.
  // React cannot track reads inside consumer callbacks as Vue's computed does.
  const frame: ReadingFrame = (() => {
    const projection = source.state ? owner.renderer.prepare(source.state, locale, prefix, report, props) : undefined;
    const output = projection?.output ?? h("pre", { style: { whiteSpace: "pre-wrap" } }, props.content ?? "");
    return { projection, output };
  })();
  useLayoutEffect(() => { frame.projection?.commit(); }, [frame]);
  return h("div", { key: source.generation, className: ["quire-markdown", props.className].filter(Boolean).join(" "),
    style: props.style, "data-state": status, "aria-busy": source.pending || status === "receiving" }, frame.output);
}
