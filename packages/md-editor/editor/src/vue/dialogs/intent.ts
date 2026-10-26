import { textDiagramLanguage, textDiagramTemplates } from "@quirekit/text-diagram";
import { sourceDocument, readSourceDestination, decodeMarkdownString, type MsfeEditor, type MsfeTarget } from "@quirekit/msfe-core";
import type { MdDialogIntent, MdDialogKind } from "./types";
import { mdMermaidEnabled } from "../../presentation/capabilities";
import { canEditMdLink } from "../../commands/destination";

/** @param editor - Source owner. @param kind - Product editing family. @param target - Optional toolbar capture. @param body - Initial diagram template.
 * @returns An independently owned source anchor; refusal never moves the user's selection. */
export function createDialogIntent(editor: MsfeEditor, kind: MdDialogKind, target?: MsfeTarget, body?: string): MdDialogIntent | null {
  const current = editor.captureTarget();
  if (editor.state.readOnly || current.selection.ranges.length !== 1 || (target ?? current).selection.ranges.length !== 1
    || target && (target.documentId !== current.documentId || target.instanceId !== current.instanceId || target.revision !== current.revision)) return null;
  const range = (target ?? current).selection.main;
  if (kind === "link" && !editor.can(state => canEditMdLink(state) ? {} : null, target ?? current)) return null;
  const feature = kind === "inlineMath" || kind === "displayMath" ? "math" : kind;
  const diagram = kind === "mermaid" || kind === "textDiagram";
  const match = (diagram ? ["mermaid", "textDiagram"].flatMap(name => editor.querySource(name, range).matches) : editor.querySource(feature, range).matches)
    .filter(item => item.from <= range.from && item.to >= range.to)
    .sort((a, b) => a.to - a.from - (b.to - b.from))[0];
  const destination = match && (kind === "link" || kind === "image") ? readSourceDestination(sourceDocument(editor.state), match.node) : null;
  const initial = editor.state.sliceDoc(range.from, range.to);
  const language = diagram ? textDiagramLanguage(String(match?.attrs.language ?? (editor.state.facet(mdMermaidEnabled) ? "mermaid" : "plantuml"))) ?? "mermaid" : undefined;
  return { ...(language ? { language } : {}), kind: match && feature === "math" ? match.attrs.display ? "displayMath" : "inlineMath" : kind,
    anchor: editor.captureAnchor(match ?? range), existing: !!match,
    ...(kind === "link" ? { editableLabel: destination && match
      ? !match.node.children().some(child => child.from >= destination.labelFrom && child.to <= destination.labelTo && !["Escape", "Entity", "URL"].includes(child.kind))
        && !/[\r\n]/u.test(editor.state.sliceDoc(destination.labelFrom, destination.labelTo))
      : range.empty } : {}),
    body: String(match?.attrs.text ?? body ?? (feature === "math" ? initial || "x^2" : diagram ? textDiagramTemplates(editor.element?.closest("[lang]")?.getAttribute("lang") ?? "zh-CN").find(item => item.language === language)!.source : "")),
    url: destination?.url ?? "", title: destination?.title ?? "",
    label: destination ? destination.kind === "autolink" ? editor.state.sliceDoc(destination.labelFrom, destination.labelTo)
      : decodeMarkdownString(editor.state.sliceDoc(destination.labelFrom, destination.labelTo)) : initial };
}
