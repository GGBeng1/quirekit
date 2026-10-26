import type { Ref } from "vue";
import type {
  ClassicEditorDocumentServiceMenuContribution,
  ClassicEditorExportArtifact,
  ClassicEditorRenderContext
} from "@classic/types";
import {
  classicEditorDocumentServiceErrorEvent,
  classicEditorDocumentServiceStartEvent,
  classicEditorDocumentServiceSuccessEvent,
  type ClassicEditorDocumentServiceErrorDetail,
  type ClassicEditorDocumentServiceStartDetail,
  type ClassicEditorDocumentServiceSuccessDetail
} from "@classic/service";
import type { ClassicEditorShellModel } from "../../types";

/** Document-service behavior consumed by product chrome. */
export interface ClassicEditorDocumentServiceActions {
  /**
   * Runs a document-service contribution through browser file I/O.
   *
   * @param contribution - Import or export service contribution.
   * @returns Asynchronous completion after import or download dispatch.
   */
  execute(
    contribution: ClassicEditorDocumentServiceMenuContribution
  ): Promise<void>;
}

/** Successful artifact selection and import completion. */
interface ClassicEditorImportSelectionSuccess {
  /** Result discriminator. */
  readonly status: "success";
  /** Selected artifact file name. */
  readonly fileName: string;
}

/** Failed artifact read or import-service execution. */
interface ClassicEditorImportSelectionFailure {
  /** Result discriminator. */
  readonly status: "error";
  /** Selected artifact file name. */
  readonly fileName: string;
  /** Normalized import error. */
  readonly error: Error;
}

/** Outcome after a concrete artifact is selected. */
type ClassicEditorImportSelectionResult =
  | ClassicEditorImportSelectionSuccess
  | ClassicEditorImportSelectionFailure;

/**
 * Creates browser file-selection and download actions for document services.
 *
 * @param model - Reactive private shell model.
 * @returns Document-service action controller.
 */
export function useClassicEditorDocumentServices(
  model: Readonly<Ref<ClassicEditorShellModel>>
): ClassicEditorDocumentServiceActions {
  /**
   * Runs one document import or export contribution.
   *
   * @param contribution - Contribution selected from the product menu.
   */
  async function execute(
    contribution: ClassicEditorDocumentServiceMenuContribution
  ): Promise<void> {
    const context = model.value.context;
    if (context === undefined) return;

    try {
      if (contribution.operation === "import") {
        const result = await selectImportFile(context, contribution);
        if (result === null) return;
        if (result.status === "error") {
          dispatchDocumentServiceError(
            context,
            contribution,
            result.error,
            result.fileName
          );
          return;
        }
        dispatchDocumentServiceSuccess(context, contribution, result.fileName);
        return;
      }
      dispatchDocumentServiceStart(context, contribution);
      const artifact = await context.instance.exportDocument(contribution.service);
      downloadExportArtifact(context, artifact);
      dispatchDocumentServiceSuccess(context, contribution, artifact.fileName);
    } catch (error) {
      dispatchDocumentServiceError(context, contribution, normalizeError(error));
    }
  }

  return { execute };
}

/**
 * Opens a browser file picker and imports the selected artifact.
 *
 * @param context - Mounted product context.
 * @param contribution - Selected import contribution.
 * @returns Import outcome, or null when the picker closes without a file.
 */
async function selectImportFile(
  context: ClassicEditorRenderContext,
  contribution: ClassicEditorDocumentServiceMenuContribution
): Promise<ClassicEditorImportSelectionResult | null> {
  const service = context.instance.registry.services.get(contribution.service);
  if (service?.import === undefined) return null;

  const input = context.ownerDocument.createElement("input");
  input.type = "file";
  input.hidden = true;
  input.accept = [...service.format.extensions, ...service.format.mimeTypes].join(",");
  context.ownerDocument.body.append(input);

  return new Promise<ClassicEditorImportSelectionResult | null>((resolve, reject) => {
    input.addEventListener("cancel", () => {
      input.remove();
      resolve(null);
    }, { once: true });
    input.addEventListener("change", () => {
      const file = input.files?.item(0);
      if (file === null || file === undefined) {
        input.remove();
        resolve(null);
        return;
      }
      dispatchDocumentServiceStart(context, contribution);
      void file.arrayBuffer()
        .then((buffer) => context.instance.importDocument(contribution.service, {
          data: new Uint8Array(buffer),
          fileName: file.name,
          mimeType: file.type || undefined
        }))
        .then(() => resolve({ status: "success", fileName: file.name }))
        .catch((error: unknown) => resolve({
          status: "error",
          fileName: file.name,
          error: normalizeError(error)
        }))
        .finally(() => input.remove());
    }, { once: true });
    try {
      input.click();
    } catch (error) {
      input.remove();
      reject(error);
    }
  });
}

/**
 * Downloads one service artifact through a temporary product-owned link.
 *
 * @param context - Mounted product context.
 * @param artifact - Named export artifact.
 */
function downloadExportArtifact(
  context: ClassicEditorRenderContext,
  artifact: ClassicEditorExportArtifact
): void {
  const urlApi = context.ownerDocument.defaultView?.URL;
  if (urlApi === undefined) {
    throw new Error("Classic Editor export requires a browser URL implementation.");
  }
  const data = typeof artifact.data === "string"
    ? artifact.data
    : artifact.data.slice().buffer;
  const url = urlApi.createObjectURL(new Blob([data], { type: artifact.mimeType }));
  const link = context.ownerDocument.createElement("a");
  link.href = url;
  link.download = artifact.fileName;
  link.hidden = true;
  context.ownerDocument.body.append(link);
  link.click();
  link.remove();
  context.ownerDocument.defaultView?.setTimeout(() => {
    urlApi.revokeObjectURL(url);
  }, 1_000);
}

/**
 * Emits an observable operation-start event.
 *
 * @param context - Mounted product context.
 * @param contribution - Contribution that initiated the operation.
 */
function dispatchDocumentServiceStart(
  context: ClassicEditorRenderContext,
  contribution: ClassicEditorDocumentServiceMenuContribution
): void {
  context.root.dispatchEvent(new CustomEvent<ClassicEditorDocumentServiceStartDetail>(
    classicEditorDocumentServiceStartEvent,
    { detail: { contribution } }
  ));
}

/**
 * Emits an observable operation-success event.
 *
 * @param context - Mounted product context.
 * @param contribution - Contribution that initiated the operation.
 * @param fileName - Imported source or exported target file name.
 */
function dispatchDocumentServiceSuccess(
  context: ClassicEditorRenderContext,
  contribution: ClassicEditorDocumentServiceMenuContribution,
  fileName: string
): void {
  context.root.dispatchEvent(new CustomEvent<ClassicEditorDocumentServiceSuccessDetail>(
    classicEditorDocumentServiceSuccessEvent,
    { detail: { contribution, fileName } }
  ));
}

/**
 * Emits an observable, typed product-root failure event.
 *
 * @param context - Mounted product context.
 * @param contribution - Contribution that initiated the operation.
 * @param error - Normalized operation error.
 * @param fileName - Selected import file name, when available.
 */
function dispatchDocumentServiceError(
  context: ClassicEditorRenderContext,
  contribution: ClassicEditorDocumentServiceMenuContribution,
  error: Error,
  fileName?: string
): void {
  context.root.dispatchEvent(new CustomEvent<ClassicEditorDocumentServiceErrorDetail>(
    classicEditorDocumentServiceErrorEvent,
    {
      detail: {
        contribution,
        ...(fileName === undefined ? {} : { fileName }),
        error
      }
    }
  ));
}

/**
 * Normalizes arbitrary promise rejection values.
 *
 * @param value - Rejected value.
 * @returns Error suitable for a public event detail.
 */
function normalizeError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}
