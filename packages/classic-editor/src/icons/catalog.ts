import {
  createQuireKitIconRegistry,
  defineQuireKitIcon,
  quireKitEditorIconData
} from "@quirekit/ui";
import type {
  QuireKitEditorIconName,
  QuireKitIconData,
  QuireKitIconSource
} from "@quirekit/ui";
import { classicEditorIconSvg } from "./generated";

const publicEditorIconSvg = Object.fromEntries(
  Object.entries(quireKitEditorIconData).map(([name, data]) => [name, data.svg])
) as Record<QuireKitEditorIconName, string>;

/** All trusted SVG assets shipped by Classic Editor, including the public catalog. */
export const classicEditorIcons = Object.freeze({
  ...classicEditorIconSvg,
  ...publicEditorIconSvg
});

/** Stable name of one bundled product icon. */
export type ClassicEditorIconName = keyof typeof classicEditorIcons;

/**
 * Resolves audit metadata for one generated icon source.
 *
 * @param svg - Trusted generated SVG markup.
 * @returns Source family and license identifier retained by the shared registry.
 */
function resolveGeneratedAttribution(svg: string): {
  readonly source: QuireKitIconSource;
  readonly license: string;
} {
  return svg.includes("Tabler Icons")
    ? { source: "tabler", license: "MIT" }
    : { source: "lucide", license: "ISC" };
}

const generatedIconData = Object.fromEntries(
  Object.entries(classicEditorIconSvg).map(([name, svg]) => {
    const attribution = resolveGeneratedAttribution(svg);
    return [name, defineQuireKitIcon({ svg, ...attribution })];
  })
) as Record<keyof typeof classicEditorIconSvg, QuireKitIconData>;
/** Trusted product icon data consumed by the shared QuireIcon renderer. */
export const classicEditorIconData = Object.freeze({
  ...generatedIconData,
  ...quireKitEditorIconData
});

/** Named Classic Editor icons; unknown names retain missing-icon diagnostics. */
export const classicEditorIconRegistry = createQuireKitIconRegistry(
  classicEditorIconData,
  {
    aliases: {
      tableBorders: "tableBorderAll",
      tableCellFillNone: "tableCellFill"
    }
  }
);

/**
 * Resolves a trusted bundled icon without accepting arbitrary markup.
 *
 * @param name - Product icon name contributed by built-in or external UI.
 * @returns Bundled SVG markup, or undefined for an unknown icon.
 */
export function resolveClassicEditorIcon(name: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(classicEditorIcons, name)
    ? classicEditorIcons[name as ClassicEditorIconName]
    : undefined;
}

/**
 * Resolves renderer-ready icon data from the trusted product registry.
 *
 * @param name - Product icon name contributed by built-in or external UI.
 * @returns Registered icon data, or undefined when absent.
 */
export function resolveClassicEditorIconData(
  name: string
): QuireKitIconData | undefined {
  return classicEditorIconRegistry.resolve(name);
}
