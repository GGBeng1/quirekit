import type { AnyExtension, MsfeExtension, ResourceLease, SourceDocument, SourceNode } from "@quirekit/msfe-core";
import type { MarkdownLocale, MarkdownReadingError } from "../types";

/** Immutable reading inputs with bounded recursive projection and no mutation target. */
export interface MarkdownReadingContext<Output, Attrs extends object = Readonly<Record<string, unknown>>> {
  /** Installed semantic owner. */ readonly name: string;
  /** Fields validated by the extension's existing source codec. */ readonly attrs: Readonly<Attrs>;
  /** Confirmed UTF-16 source syntax. */ readonly node: SourceNode;
  /** Canonical read-only source and shared reference resolution. */ readonly document: SourceDocument;
  /** Host control language. */ readonly locale: MarkdownLocale;
  /** @param from - Inclusive content start without splitting a child. @param to - Exclusive content end. @returns Ordered projected inline children. */ renderInline(from?: number, to?: number): Output[];
  /** @param omitted - Direct syntax markers excluded from content. @returns Projected direct blocks. */ renderBlocks(omitted?: readonly string[]): Output[];
}

/** Presentation attached to an existing configured source extension for one output family. */
export interface MarkdownReadingDefinition<Output, Attrs extends object = Readonly<Record<string, unknown>>, Resource = unknown> {
  /** @param document - Current accepted source. @returns Identity covering codec/render/load reads outside the node; absence disables block reuse. */ readonly cacheKey?: (document: SourceDocument) => unknown;
  /** @param context - Captured immutable inputs. @param signal - Aborted on replacement/unmount. @returns Owned resource; late leases are released, and SSR never loads. */ readonly load?: (context: MarkdownReadingContext<Output, Attrs>, signal: AbortSignal) => ResourceLease<Resource> | Promise<ResourceLease<Resource>>;
  /** @param context - Validated source. @param resource - Accepted resource or undefined without a loader. @returns Trusted presentation; undefined preserves source. */ readonly render: (context: MarkdownReadingContext<Output, Attrs>, resource: Resource | undefined) => Output | undefined;
}

/** Isolated framework installation port over a shared semantic registry. */
export interface MarkdownReadingPort<Output> {
  /** Unique output family identity. */ readonly key: symbol;
  /** @param extension - Configured source extension. @param definition - Output-family presentation. @returns The original extension with its reading entry. */ withReading<Attrs extends object = Readonly<Record<string, unknown>>, Resource = unknown>(extension: AnyExtension, definition: MarkdownReadingDefinition<Output, Attrs, Resource>): AnyExtension;
}

/** Erased semantic installation boundary with an explicit output family. */
export interface ReadingContribution<Output> {
  /** Output family identity. */ readonly key: symbol;
  /** Installed extension id. */ readonly owner: string;
  /** Existing semantic codec, never a duplicate parser. */ readonly codec: NonNullable<MsfeExtension["source"]>["codec"];
  /** Output-family presentation. */ readonly definition: MarkdownReadingDefinition<Output>;
}

/** Immutable node presentation owned by a framework resource boundary. */
export interface ReadingInput<Output> {
  /** Installed semantic owner and presentation. */ readonly contribution: ReadingContribution<Output>;
  /** Validated source and recursive helpers. */ readonly context: MarkdownReadingContext<Output>;
  /** @returns Exact escaped fallback source, read only on fallback. */ readonly source: () => string;
  /** @param failure - Isolated local failure. */ readonly report: (failure: MarkdownReadingError) => void;
}
