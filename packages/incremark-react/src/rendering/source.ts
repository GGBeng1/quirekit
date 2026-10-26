import { createElement as h, useState } from "react";
import type { ReactNode } from "react";
import type { SourceProps } from "./types";

/** @param props - Literal confirmed code, never evaluated. @returns Accessible code/source output with a client copy action. */
export function Source(props: SourceProps): ReactNode {
  const [copied, setCopied] = useState<string>();
  const label = props.locale === "en" ? copied === props.code ? "Copied" : "Copy code" : copied === props.code ? "已复制" : "复制代码";
  /** Copies only the accepted code body; unavailable clipboard leaves the source visible. */
  async function copy(): Promise<void> {
    try { await navigator.clipboard.writeText(props.code); setCopied(props.code); } catch { setCopied(undefined); }
  }
  return h("div", { className: "quire-markdown-source" },
    h("div", { className: "quire-markdown-source-header" }, h("span", null, props.language), h("button", { type: "button", onClick: copy, "aria-label": label }, label)),
    h("pre", null, h("code", { className: `language-${props.language.split(/\s/u)[0] ?? "text"}` }, props.code)));
}
