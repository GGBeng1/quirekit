import type { Decoration, DecorationAttrs } from "@quirekit/pm";
import type { QuireDecorationSpec } from "@quirekit/core";
import { resolveClassStyle } from "./class-style";
import { resolveInlineDecorationStyle } from "./inline-style";
import { mergeResolvedDecorationStyle } from "./theme";
import type {
  QuireDecorationDiagnostic,
  QuireDecorationThemeRegistry,
  QuireResolvedDecorationStyle
} from "../types";

/** Result of resolving one decoration's paint style. */
export interface QuireDecorationStyleResolution {
  /** Resolved renderer-neutral style. */
  readonly style: QuireResolvedDecorationStyle;
  /** Diagnostics discovered while resolving the style. */
  readonly diagnostics: readonly QuireDecorationDiagnostic[];
}

/**
 * Reads attributes from a ProseMirror decoration type.
 *
 * @param decoration - Decoration to inspect.
 * @returns Decoration attributes, or an empty object.
 */
export function readQuireDecorationAttrs(
  decoration: Decoration
): DecorationAttrs {
  const type = decoration.type as unknown as {
    readonly attrs?: DecorationAttrs;
    readonly spec?: QuireDecorationSpec;
  };
  const spec = decoration.spec as QuireDecorationSpec | undefined;

  return type.attrs ?? type.spec?.quireAttrs ?? spec?.quireAttrs ?? {};
}

/**
 * Resolves renderer-neutral style from DOM-shaped decoration attributes.
 *
 * @param options - Decoration id, attrs, and optional class theme.
 * @returns Resolved style and non-fatal diagnostics.
 */
export function resolveQuireDecorationStyle(options: {
  /** Stable decoration id used in diagnostics. */
  readonly decorationId: string;
  /** Decoration attributes to resolve. */
  readonly attrs: DecorationAttrs;
  /** Optional registered class theme. */
  readonly theme?: QuireDecorationThemeRegistry | undefined;
}): QuireDecorationStyleResolution {
  const diagnostics: QuireDecorationDiagnostic[] = [];
  const classStyle = resolveClassStyle({
    decorationId: options.decorationId,
    attrs: options.attrs,
    theme: options.theme,
    diagnostics
  });
  const inlineStyle = resolveInlineDecorationStyle(options.attrs);
  const style = mergeResolvedDecorationStyle(classStyle, inlineStyle);

  if (style.fontHints !== undefined) {
    diagnostics.push({
      kind: "metric-affecting-style",
      decorationId: options.decorationId,
      message: "Metric-affecting decoration font styles are detected but not applied in the paint phase."
    });
  }

  return { style, diagnostics };
}
