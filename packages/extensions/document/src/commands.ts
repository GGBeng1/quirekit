import {
  normalizeQuireDocumentFontTheme,
  quireDefaultDocumentFontTheme,
  type CommandProps,
  type CommandSpec,
  type QuireDocumentFontSet,
  type QuireDocumentFontTheme
} from "@quirekit/core";

/** Public document command methods. */
export type DocumentCommandMethods<ReturnType> = {
  /** Replaces every document-default script slot with one logical font family. */
  setDocumentFontFamily: (family: string) => ReturnType;
  /** Replaces the Latin document-default slot for body and heading roles. */
  setDocumentLatinFontFamily: (family: string) => ReturnType;
  /** Replaces the East Asian document-default slot for body and heading roles. */
  setDocumentEastAsiaFontFamily: (family: string) => ReturnType;
  /** Merges per-role script families into the document font theme; omitted slots stay as they are. */
  setDocumentFontTheme: (patch: DocumentFontThemePatch) => ReturnType;
};

/** Script families to set for one font role. */
export interface DocumentFontRolePatch {
  /** Family for Latin and high-ANSI text. */
  readonly latin?: string | undefined;
  /** Family for East Asian text. */
  readonly eastAsia?: string | undefined;
}

/** Per-role changes to the document font theme. */
export interface DocumentFontThemePatch {
  /** Body and normal-paragraph fonts. */
  readonly body?: DocumentFontRolePatch | undefined;
  /** Heading fonts; a theme without headings starts from the body fonts. */
  readonly heading?: DocumentFontRolePatch | undefined;
}

/** Script slot that can be edited independently by document settings. */
export type DocumentFontScriptTarget = "latin" | "eastAsia";

/**
 * Creates the per-role document font theme command.
 *
 * @returns Command factory that merges role script families into the canonical theme.
 */
export function createSetDocumentFontThemeCommand(): CommandSpec {
  return (value) => (context) => {
    const patch = value as DocumentFontThemePatch | null | undefined;
    if (patch === null || typeof patch !== "object") return false;
    const current = normalizeQuireDocumentFontTheme(context.tr.doc.attrs.fontTheme) ?? quireDefaultDocumentFontTheme;
    let next: QuireDocumentFontTheme = current;
    for (const role of ["body", "heading"] as const) {
      const rolePatch = patch[role];
      if (rolePatch === undefined) continue;
      let set: QuireDocumentFontSet = role === "heading" ? current.heading ?? current.body : current.body;
      for (const target of ["latin", "eastAsia"] as const) {
        if (rolePatch[target] === undefined) continue;
        const family = normalizeFamily(rolePatch[target]);
        if (family === null) return false;
        set = replaceDocumentFontSlot(set, target, family);
      }
      next = { ...next, [role]: set };
    }
    if (equalDocumentFontThemes(current, next)) return false;
    context.dispatch?.(context.tr.setDocAttribute("fontTheme", next));
    return true;
  };
}

/**
 * Creates the document-default font command.
 *
 * @returns Command factory that updates the canonical document font theme.
 */
export function createSetDocumentFontFamilyCommand(): CommandSpec {
  return (value) => (context) => setDocumentFontFamily(context, value);
}

/**
 * Creates one document-default script-font command.
 *
 * @param target - Latin or East Asian canonical theme slot.
 * @returns Command factory that updates only the requested script slot.
 */
export function createSetDocumentScriptFontFamilyCommand(
  target: DocumentFontScriptTarget
): CommandSpec {
  return (value) => (context) => setDocumentScriptFontFamily(
    context,
    target,
    value
  );
}

/**
 * Replaces body and heading script defaults without touching direct formatting.
 *
 * @param context - Active editor command context.
 * @param value - Candidate logical font family.
 * @returns Whether the canonical document theme changed.
 */
function setDocumentFontFamily(
  context: CommandProps,
  value: unknown
): boolean {
  const family = normalizeFamily(value);
  if (family === null) return false;
  const current = normalizeQuireDocumentFontTheme(
    context.state.doc.attrs.fontTheme
  ) ?? quireDefaultDocumentFontTheme;
  const next = createDocumentFontTheme(current, family);
  if (equalDocumentFontThemes(current, next)) return false;
  context.dispatch?.(context.tr.setDocAttribute("fontTheme", next));
  return true;
}

/**
 * Replaces one script slot across body and heading without touching siblings.
 *
 * @param context - Active editor command context.
 * @param target - Canonical script slot to replace.
 * @param value - Candidate logical font family.
 * @returns Whether the canonical document theme changed.
 */
function setDocumentScriptFontFamily(
  context: CommandProps,
  target: DocumentFontScriptTarget,
  value: unknown
): boolean {
  const family = normalizeFamily(value);
  if (family === null) return false;
  const current = normalizeQuireDocumentFontTheme(
    context.state.doc.attrs.fontTheme
  ) ?? quireDefaultDocumentFontTheme;
  const next: QuireDocumentFontTheme = {
    body: replaceDocumentFontSlot(current.body, target, family),
    heading: replaceDocumentFontSlot(
      current.heading ?? current.body,
      target,
      family
    )
  };
  if (equalDocumentFontThemes(current, next)) return false;
  context.dispatch?.(context.tr.setDocAttribute("fontTheme", next));
  return true;
}

/**
 * Replaces one role's requested script slot while retaining every other field.
 *
 * @param current - Current role font set.
 * @param target - Canonical script slot to replace.
 * @param family - Normalized logical family.
 * @returns Role font set with only the requested slot changed.
 */
function replaceDocumentFontSlot(
  current: QuireDocumentFontSet,
  target: DocumentFontScriptTarget,
  family: string
): QuireDocumentFontSet {
  return {
    ...current,
    [target]: family,
    ...(current.fallbacks === undefined
      ? {}
      : { fallbacks: [...current.fallbacks] })
  };
}

/**
 * Creates one all-script document theme while retaining resource fallbacks.
 *
 * @param current - Current normalized document font theme.
 * @param family - Normalized logical family applied to every default slot.
 * @returns Complete body and heading theme.
 */
function createDocumentFontTheme(
  current: QuireDocumentFontTheme,
  family: string
): QuireDocumentFontTheme {
  return {
    body: replaceDocumentFontSet(current.body, family),
    heading: replaceDocumentFontSet(current.heading ?? current.body, family)
  };
}

/**
 * Replaces every script slot in one role and preserves its fallback order.
 *
 * @param current - Current role font set.
 * @param family - Logical family applied to every script slot.
 * @returns Replaced role font set.
 */
function replaceDocumentFontSet(
  current: QuireDocumentFontSet,
  family: string
): QuireDocumentFontSet {
  return {
    latin: family,
    eastAsia: family,
    complexScript: family,
    ...(current.fallbacks === undefined
      ? {}
      : { fallbacks: [...current.fallbacks] })
  };
}

/**
 * Reads one non-empty logical font family.
 *
 * @param value - Candidate command input.
 * @returns Trimmed family or null.
 */
function normalizeFamily(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const family = value.trim();
  return family.length === 0 ? null : family;
}

/**
 * Compares normalized JSON-safe document themes.
 *
 * @param left - Current theme.
 * @param right - Candidate replacement theme.
 * @returns Whether both themes contain identical canonical fields.
 */
function equalDocumentFontThemes(
  left: QuireDocumentFontTheme,
  right: QuireDocumentFontTheme
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
