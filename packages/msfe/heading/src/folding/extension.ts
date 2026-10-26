import { EditorView } from "@quirekit/cm-view";
import { syntaxTree } from "@quirekit/cm-language";
import { componentView, type MsfeEditor, type MsfeExtension } from "@quirekit/msfe-core";
import { toggleHeading } from "./actions";
import { nativeHeadingFoldControl } from "./controls";
import { headingBodyStart, headingNode, hasHeadingBody } from "./query";
import { headingFoldSnapshot, headingFoldSupport } from "./state";
import type { HeadingOptions } from "../types";

/** @param options - Host controls and labels. @param name - Installed heading owner. @param editor - Late canonical editor accessor. @returns Native folding shared by source and rendered modes. */
export function headingFolding(options: HeadingOptions, name: string, editor: () => MsfeEditor): MsfeExtension {
  return { id: `${name}Folding`, states: [headingFoldSnapshot], extensions: [headingFoldSupport, EditorView.baseTheme({
    // A zero-width source decoration anchors disclosure without shifting text.
    // The host reserves the outer rail for dragging; the near 24 px belong here.
    // A line-height box shares the first-row center even in wrapped headings.
    ".msfe-heading-toggle": { display: "inline-block", position: "relative", width: "0", height: "1lh", verticalAlign: "top" },
    ".msfe-heading-toggle > button": { position: "absolute", left: "-24px", top: "50%", transform: "translateY(-50%)", opacity: "0" },
    // Rendered headings have an outer disclosure; source mode keeps CM's marker.
    ".msfe-heading .cm-foldPlaceholder": { display: "none" },
    ".msfe-heading-toggle > button[aria-expanded=false], .cm-line:hover .msfe-heading-toggle > button, .msfe-heading-toggle > button:hover, .msfe-heading-toggle > button:focus-visible": { opacity: "1" },
    "@media (hover: none)": { ".msfe-heading-toggle > button": { opacity: "1" } },
    ".msfe-heading-toggle-native": { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", padding: "0", border: "none",
      borderRadius: "4px", background: "transparent", color: "inherit", cursor: "pointer" },
    ".msfe-heading-toggle-native:hover": { background: "rgba(128,128,128,.12)" },
  })], layers: [{ key: "heading-fold-controls", placement: "inline", states: [headingFoldSnapshot],
    /** @param input - Viewport-bounded headings and native fold dependency. @returns Controls without scanning each heading's entire section. */
    build(input) {
      const snapshot = input.getState(headingFoldSnapshot), state = snapshot.state;
      return input.query(name).matches.flatMap(match => {
        if (match.from < input.from || match.from > input.to) return [];
        const node = headingNode(syntaxTree(state), match.from);
        if (!node || !hasHeadingBody(node)) return [];
        const start = headingBodyStart(state, node);
        let expanded = true;
        snapshot.folds.between(start, start, from => { if (from === start) expanded = false; });
        const title = state.sliceDoc(match.from, start).replace(/^#{1,6}\s*|\s+#+\s*$/gu, "").trim();
        return [{ type: "widget" as const, key: `heading-${match.from}`, from: match.from, side: -1 as const,
          view: componentView(options.controls ?? nativeHeadingFoldControl, {
            expanded, label: options.toggleLabel(expanded, title), toggle: () => toggleHeading(editor(), snapshot, match.from),
          }) }];
      });
    },
  }] };
}
