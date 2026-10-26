import type { DecorationAttrs } from "@quirekit/pm";
import { splitDecorationClassNames } from "./parse";
import { mergeResolvedDecorationStyle } from "./theme";
import type {
  QuireDecorationDiagnostic,
  QuireDecorationThemeRegistry,
  QuireResolvedDecorationStyle
} from "../types";

/** Inputs used to resolve class tokens through a decoration theme. */
export interface ClassStyleResolutionOptions {
  /** Stable decoration id used in diagnostics. */
  readonly decorationId: string;
  /** Decoration attributes to inspect. */
  readonly attrs: DecorationAttrs;
  /** Optional registered class theme. */
  readonly theme?: QuireDecorationThemeRegistry | undefined;
  /** Mutable diagnostic sink. */
  readonly diagnostics: QuireDecorationDiagnostic[];
}

/**
 * Resolves class tokens via the registered theme.
 *
 * @param options - Attrs, theme, and diagnostics sink.
 * @returns Style contributed by resolved classes.
 */
export function resolveClassStyle(
  options: ClassStyleResolutionOptions
): QuireResolvedDecorationStyle {
  let style: QuireResolvedDecorationStyle = {};

  for (const className of splitDecorationClassNames(options.attrs.class)) {
    const themed = options.theme?.get(className);

    if (!themed) {
      options.diagnostics.push({
        kind: "unresolved-class",
        decorationId: options.decorationId,
        className,
        message: `Decoration class "${className}" has no registered canvas theme token.`
      });
      continue;
    }

    style = mergeResolvedDecorationStyle(style, themed);
  }

  return style;
}
