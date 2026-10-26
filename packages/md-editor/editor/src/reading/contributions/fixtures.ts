import { EditorState } from "@quirekit/cm-state";
import { markdown } from "@quirekit/cm-lang-markdown";
import { Node, defineSource, type AnyExtension } from "@quirekit/msfe-core";

/** Independent consumer: the reading adapter must reuse this validated codec. */
export const Status = Node.create({ name: "consumer-status",
  /** @returns Persisted fields and a default used by every presentation. */
  addAttributes() { return { value: { validate: value => value === "todo" || value === "done" }, label: { default: "status" } }; },
  /** @returns Exact source ownership without a reading-specific parser. */
  addSource() { return defineSource<{ value: string }>({ nodes: ["StatusToken"], syntax: { name: "StatusToken", open: "[[", close: "]]" },
    /** @param document - Canonical source. @param node - Confirmed token. @returns Fields validated by addAttributes. */
    read: (document, node) => ({ value: document.slice(node.from + 2, node.to - 2) }),
    /** @param _document - Canonical source. @param node - Exact owner. @param patch - Requested fields. @returns An exact field replacement. */
    patch: (_document, node, patch) => ({ from: node.from + 2, to: node.to - 2, insert: patch.value ?? "" }),
  }); },
});

/** @param feature - Public consumer definition. @param doc - Canonical input. @returns A snapshot without mounting an editor or importing its compiler. */
export function readingState(feature: AnyExtension, doc = "before [[todo]] after"): EditorState {
  const descriptor = "resolve" in feature ? feature.resolve(() => { throw new Error("reading-must-not-access-editor"); }) : feature;
  return EditorState.create({ doc, extensions: [markdown({ extensions: descriptor.syntax ?? [] }), descriptor.extensions ?? []] });
}
