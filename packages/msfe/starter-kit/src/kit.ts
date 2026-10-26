import type { StarterKitOptions } from "./types";
import { heading } from "@quirekit/msfe-heading";
import { bold } from "@quirekit/msfe-bold";
import { link } from "@quirekit/msfe-link";
import { codeBlock } from "@quirekit/msfe-code-block";
import { image } from "@quirekit/msfe-image";
import { Emphasis, InlineCode, Strikethrough, HorizontalRule, Blockquote, ListMarkers, TaskItem, Table, TextLiterals, DataUrlFold } from "@quirekit/msfe-prose";
import { Extension, type AnyExtension } from "@quirekit/msfe-core";

/** @param options - Optional feature replacements/exclusions. @returns The first validated text/container/widget features; no product state lives here. */
export function starterKit(options: StarterKitOptions = {}): readonly AnyExtension[] {
  return [options.heading ?? heading(), options.bold ?? bold(), options.link ?? link(),
    options.codeBlock ?? codeBlock(), options.image ?? image(), options.emphasis ?? Emphasis, options.inlineCode ?? InlineCode,
    options.strikethrough ?? Strikethrough, options.horizontalRule ?? HorizontalRule, options.blockquote ?? Blockquote,
    options.listMarkers ?? ListMarkers, options.taskItem ?? TaskItem, options.table ?? Table, options.textLiterals ?? TextLiterals, options.dataUrlFold ?? DataUrlFold].filter((feature): feature is AnyExtension => feature !== false);
}

/** Composable preset; configuration uses the same descriptors as direct installation. */
export const StarterKit = Extension.create<StarterKitOptions>({ name: "starter-kit", addOptions() { return {}; },
  addExtensions() { return starterKit(this.options); } });
