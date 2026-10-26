import type {} from "@quirekit/msfe-core";
import type { ComponentViewRenderer } from "@quirekit/msfe-core";

/** Optional native section folding and host-owned presentation. */
export interface HeadingOptions {
  /** Enables section controls and guarded native folding; defaults to true. */
  readonly folding: boolean;
  /** Optional public component-library renderer. */
  readonly controls?: ComponentViewRenderer<HeadingFoldControlProps>;
  /** @param expanded - Current section visibility. @param title - Literal heading text. @returns Localized accessible action. */
  readonly toggleLabel: (expanded: boolean, title: string) => string;
}

/** Source-neutral heading disclosure, compatible with ordinary disclosure controls. */
export interface HeadingFoldControlProps {
  /** True when the section is visible. */
  readonly expanded: boolean;
  /** Accessible action including the heading title. */
  readonly label: string;
  /** Requests a guarded view transaction without changing Markdown. */
  readonly toggle: () => void;
}

/** Semantic fields decoded from either ATX or Setext source. */
export interface HeadingAttributes {
  /** Markdown heading depth, from one through six. */
  readonly level: number;
}

/** Named commands contributed when this feature is installed. */
declare module "@quirekit/msfe-core" {
  interface Commands<ReturnType> {
    /** heading feature commands. */
    heading: {
    /** @param level - Feature command input. @returns The caller’s result or pending chain. */
    setHeading(level: number): ReturnType;
    };
  }
}
