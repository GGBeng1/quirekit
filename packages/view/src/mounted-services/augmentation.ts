import type { QuireMountedViewServiceFactory } from "./types";

declare module "@quirekit/core" {
  /** View-owned extension hook; Core does not import or instantiate its services. */
  interface QuireExtensionConfig<Options extends object = object, Storage extends object = object> {
    /** Optional services whose lifetime follows each mounted retained view. */
    readonly addMountedViewServices?: QuireMountedViewServiceFactory<Options, Storage>;
  }
}
