import type { MsfeEditor } from "@quirekit/msfe-core";

/**
 * Read enclosing source owners at selection starts without walking selected content.
 * @param editor - Immutable selection and installed semantics.
 * @param name - One installed semantic type.
 * @returns Uniform attributes only when every range is contained by that source owner.
 */
export function selectedAttributes(editor: MsfeEditor, name: string): Readonly<Record<string, unknown>> | null {
  let result: Readonly<Record<string, unknown>> | null = null;
  for (const range of editor.state.selection.ranges) {
    const query = editor.querySource(name, { from: range.from, to: range.from });
    if (query.status !== "ready") return null;
    const owner = query.matches.filter(match => match.from <= range.from && match.to >= range.to)
      .sort((a, b) => a.to - a.from - (b.to - b.from))[0];
    if (!owner) return null;
    if (result && (Object.keys(result).length !== Object.keys(owner.attrs).length
      || Object.entries(result).some(([key, value]) => !Object.is(value, owner.attrs[key])))) return null;
    result = owner.attrs;
  }
  return result;
}
