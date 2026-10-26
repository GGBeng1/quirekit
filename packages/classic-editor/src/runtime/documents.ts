import type {
  QuireEditor,
  QuireEditorContent,
  QuireJSONContent
} from "@quirekit/core";
import type {
  ClassicEditorExportArtifact,
  ClassicEditorImportArtifact,
  ClassicEditorImportContext,
  ClassicEditorRegistrySnapshot,
  ClassicEditorRenderContext
} from "../types";

/**
 * Imports input through one registered product service.
 *
 * @param registry - Current normalized registry.
 * @param serviceId - Service id.
 * @param context - Current mounted render context.
 * @param input - Service-specific input.
 * @returns Asynchronous completion.
 */
export async function importClassicEditorDocument(
  registry: ClassicEditorRegistrySnapshot,
  serviceId: string,
  context: ClassicEditorImportContext | undefined,
  input: ClassicEditorImportArtifact
): Promise<void> {
  const service = registry.services.get(serviceId);
  if (!service?.import || !context) {
    throw new RangeError(`Classic Editor import service is unavailable: ${serviceId}`);
  }
  await service.import(context, input);
}

/**
 * Exports through one registered product service.
 *
 * @param registry - Current normalized registry.
 * @param serviceId - Service id.
 * @param context - Current mounted render context.
 * @param documentName - Current product-level name.
 * @returns Service-specific output.
 */
export async function exportClassicEditorDocument(
  registry: ClassicEditorRegistrySnapshot,
  serviceId: string,
  context: ClassicEditorRenderContext | undefined,
  documentName: string
): Promise<ClassicEditorExportArtifact> {
  const service = registry.services.get(serviceId);
  if (!service?.export || !context) {
    throw new RangeError(`Classic Editor export service is unavailable: ${serviceId}`);
  }
  const artifact = await service.export(context);
  const extension = [...service.format.extensions]
    .sort((left, right) => right.length - left.length)
    .find(candidate => artifact.fileName.toLocaleLowerCase()
      .endsWith(candidate.toLocaleLowerCase())) ?? "";
  const baseName = extension !== ""
    && documentName.toLocaleLowerCase().endsWith(extension.toLocaleLowerCase())
    ? documentName.slice(0, -extension.length)
    : documentName;
  return {
    ...artifact,
    fileName: `${baseName}${extension}`
  };
}

/**
 * Reads canonical JSON from a mounted editor or preserved unmounted content.
 *
 * @param editor - Current mounted Core editor.
 * @param document - Preserved unmounted content.
 * @returns Current canonical document JSON.
 */
export function readClassicEditorJSON(
  editor: QuireEditor | undefined,
  document: QuireEditorContent
): QuireJSONContent {
  if (editor) return editor.getJSON();
  if (isJSONContent(document)) return document;
  throw new Error("Classic Editor string or PM-node content must be mounted before JSON export.");
}

/**
 * Checks whether unmounted content is already canonical JSON.
 *
 * @param content - Stored editor content.
 * @returns Whether the value is JSON content.
 */
function isJSONContent(content: QuireEditorContent): content is QuireJSONContent {
  return typeof content === "object"
    && content !== null
    && "type" in content
    && typeof content.type === "string";
}
