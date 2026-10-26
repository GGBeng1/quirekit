import type { ComponentViewRenderer, MsfeResult, StateSlot } from "@quirekit/msfe-core";

/** YAML primitives that can be written without constructing application objects. */
export type DocumentPropertyScalar = string | number | boolean | null;
/** Editable plain scalar or flat list. */
export type DocumentPropertyValue = DocumentPropertyScalar | readonly DocumentPropertyScalar[];

/** One top-level YAML entry, with exact canonical source ranges. */
export interface DocumentProperty {
  /** Decoded key; duplicate or non-string keys reject the panel. */ readonly key: string;
  /** Decoded primitive value; undefined means a complex source-only value. */ readonly value?: DocumentPropertyValue;
  /** Whether replacing this value preserves comments and unsupported structure. */ readonly editable: boolean;
  /** Literal value for complex display. */ readonly source: string;
  /** Inclusive key start. */ readonly keyFrom: number;
  /** Exclusive key end. */ readonly keyTo: number;
  /** Inclusive value start. */ readonly valueFrom: number;
  /** Exclusive value end, excluding a trailing scalar comment. */ readonly valueTo: number;
}

/** Bounded immutable YAML snapshot; the body is never copied into property state. */
export interface DocumentPropertiesData {
  /** Exact header including both fences, excluding its trailing newline. */ readonly source: string;
  /** Start of the closing fence where new entries are inserted. */ readonly insertAt: number;
  /** Original newline convention. */ readonly newline: string;
  /** Entries in source order. */ readonly entries: readonly DocumentProperty[];
}

/** Explicit source operation; keys target entries, never a stale row index. */
export type DocumentPropertyChange =
  | { readonly type: "set" | "add"; readonly key: string; readonly value: DocumentPropertyValue }
  | { readonly type: "rename"; readonly key: string; readonly name: string }
  | { readonly type: "remove"; readonly key: string };

/** Public renderer contract; source changes remain owned by the mounted editor. */
export interface DocumentPropertiesProps {
  /** Built-in control language; custom renderers may use host localization instead. */ readonly locale: "zh-CN" | "en";
  /** Accepted source snapshot. */ readonly data: DocumentPropertiesData;
  /** Effective host permission, including locked mode. */ readonly readOnly: boolean;
  /** Current document-local presentation preference, retained across renderer remounts. */ readonly collapsed: boolean;
  /** @param collapsed - Requested panel state. @returns Acceptance without source, selection or history changes. */
  readonly setCollapsed: (collapsed: boolean) => MsfeResult;
  /** @param change - One property operation. @returns Acceptance or a stable refusal for obsolete inputs. */
  readonly change: (change: DocumentPropertyChange) => MsfeResult;
  /** Reveals the original YAML in the same editor without changing source. */ readonly editSource: () => void;
}

/** Optional presentation installed separately from Frontmatter grammar. */
export interface DocumentPropertiesOptions {
  /** Built-in control language. */ readonly locale: "zh-CN" | "en";
  /** Initial visibility, default true when this extension is explicitly installed. */ readonly enabled: boolean;
  /** Initial panel state for each installed document; false preserves the expanded default. */ readonly defaultCollapsed: boolean;
  /** Framework renderer; omitted uses the native read-only table with a source entry point. */ readonly render?: ComponentViewRenderer<DocumentPropertiesProps>;
}

/** Per-installation state dependency. */
export interface DocumentPropertiesStorage {
  /** Transaction-backed presentation preference, independent of source history. */ readonly enabled: StateSlot<boolean>;
  /** Document-local collapsed state, reset to the configured default on document replacement. */ readonly collapsed: StateSlot<boolean>;
}
