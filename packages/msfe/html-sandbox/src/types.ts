import type { ComponentViewRenderer } from "@quirekit/msfe-core";
/** Complete source fields independent of rendering framework. */
export interface MsfeHtmlSandboxAttributes {
  /** Exact code body, with the fence separator excluded. */ readonly html: string;
}
/** Preview input does not carry editor objects or commands to the guest. */
export interface MsfeHtmlSandboxViewProps extends MsfeHtmlSandboxAttributes {
  /** Coalesced host geometry notification; never exposed to guest code. */ readonly requestMeasure?: () => void;
}
/** A framework adapter is explicitly installed; source codecs stay framework neutral. */
export interface MsfeHtmlSandboxOptions {
  /** Retained preview renderer, absent for a source-only installation. */ readonly renderer: ComponentViewRenderer<MsfeHtmlSandboxViewProps> | null;
}
