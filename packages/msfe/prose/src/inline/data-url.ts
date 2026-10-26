import { Extension, componentView, type ComponentViewRenderer, type ProjectionDecoration } from "@quirekit/msfe-core";
import { EditorView } from "@quirekit/cm-view";
import type { DataUrlFoldOptions, DataUrlMatch } from "../types";

/** Props of one folded data URL. */
interface FoldProps {
  /** Declared media type. */ readonly type: string;
  /** Decoded payload size in bytes. */ readonly bytes: number;
  /** Accessible hint for revealing the source. */ readonly hint: string;
}

/** @param bytes - Payload size. @returns A compact human size. */
function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
}

/**
 * Finds long base64 data URLs in a source slice.
 * @param text - Source slice. @param offset - Absolute offset of the slice. @param minLength - Shortest payload to report.
 * @returns Matches with absolute ranges and decoded sizes.
 */
export function findDataUrls(text: string, offset: number, minLength: number): readonly DataUrlMatch[] {
  const pattern = new RegExp(`data:([\\w.+-]+/[\\w.+-]+);base64,([A-Za-z0-9+/=]{${minLength},})`, "gu");
  return [...text.matchAll(pattern)].map(match => {
    const payload = match[2]!, padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
    const from = offset + match.index;
    return { from, to: from + match[0].length, type: match[1]!, bytes: Math.floor(payload.length * 3 / 4) - padding };
  });
}

/** A quiet pill standing in for the payload; selecting it reveals the exact source. */
const fold: ComponentViewRenderer<FoldProps> = ({ dom, props }) => {
  const chip = dom.ownerDocument.createElement("span");
  chip.className = "msfe-data-url";
  const render = (next: FoldProps) => { chip.textContent = `data:${next.type} · ${formatBytes(next.bytes)}`; chip.title = next.hint; };
  render(props); dom.append(chip);
  return { update: render, destroy() { chip.remove(); } };
};

/**
 * Folds long base64 data URLs into a size pill in every view, without changing a byte of the source.
 * Lowest priority so block previews such as diagrams win any overlap; a block layer so off-screen payloads never inflate scroll height,
 * and incremental so an edit rescans only the changed syntax blocks instead of every payload in the document.
 */
export const DataUrlFold = Extension.create<DataUrlFoldOptions>({ name: "dataUrlFold", priority: 1,
  /** @returns Defaults that keep short inline icons readable. */
  addOptions: () => ({ minLength: 240, hint: "Select to show the source" }),
  /** @returns One whole-document layer of inline replacements. */
  addProjectionLayers() {
    const { minLength, hint } = this.options;
    return [{ key: "data-url-fold", placement: "block", modes: ["live", "locked", "source"], incremental: true,
      /** @param input - Source range to fold. @returns One inline pill per long payload. */
      build(input) {
        return findDataUrls(input.document.slice(input.from, input.to), input.from, minLength).map((match): ProjectionDecoration => ({
          type: "replace", from: match.from, to: match.to, key: `data-url-${match.from}`, block: false,
          view: componentView(fold, { type: match.type, bytes: match.bytes, hint }) }));
      } }];
  },
  /** @returns Neutral pill styling that hosts can override by class. */
  addCodeMirrorExtensions: () => EditorView.baseTheme({
    ".msfe-data-url": { padding: "0 .6em", borderRadius: "999px", backgroundColor: "#8095a026", fontFamily: "ui-monospace, SFMono-Regular, monospace",
      fontSize: ".85em", whiteSpace: "nowrap" },
  }),
});
