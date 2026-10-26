import type {
  DocxCompiledPackagePlan
} from "@quirekit/lit-docx-contract";
import type { DocxManagerRuntime, DocxManagerRuntimeLoader } from "./types";

let providedLoader: DocxManagerRuntimeLoader | undefined;

/**
 * Registers the DOCX implementation for Managers created without their own loader,
 * typically `provideDocxRuntime(() => import("@quirekit/lit-docx"))` once at host startup.
 *
 * @param loader - Lazy loader of the implementation; the latest registration wins and `undefined` clears it.
 */
export function provideDocxRuntime(loader: DocxManagerRuntimeLoader | undefined): void {
  providedLoader = loader;
}

/**
 * Loads the implementation chosen for one Manager at the moment DOCX is first used,
 * so a host may register after Editors are created.
 *
 * @param own - Loader passed to this Manager, if any.
 * @returns The runtime.
 */
export function loadDocxRuntime(own: DocxManagerRuntimeLoader | undefined): Promise<DocxManagerRuntime> {
  const loader = own ?? providedLoader;
  if (loader === undefined) {
    return Promise.reject(new Error(
      "DOCX import and export need an implementation: call provideDocxRuntime(() => import(\"@quirekit/lit-docx\")) or pass docx.loadRuntime."
    ));
  }
  return loader();
}

/**
 * Tests whether a package plan has anything to materialize.
 *
 * @param plan - Allocated package plan.
 * @returns Whether the plan has no resources, relationships, or parts.
 */
export function isEmptyDocxPackagePlan(
  plan: DocxCompiledPackagePlan
): boolean {
  return plan.resources.length === 0
    && plan.relationships.length === 0
    && plan.parts.length === 0;
}

/**
 * Copies arbitrary Uint8Array subclasses into an exact stable view.
 *
 * @param value - Source bytes.
 * @returns Plain Uint8Array with exact byte bounds.
 */
export function copyDocxBytes(value: Uint8Array): Uint8Array {
  return new Uint8Array(value.buffer.slice(
    value.byteOffset,
    value.byteOffset + value.byteLength
  ));
}
