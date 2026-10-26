import { getBuiltinClassicEditorText } from "@classic/localization";
import type { ClassicEditorContribution } from "@classic/types";

const copy = getBuiltinClassicEditorText;

/** Built-in document import/export menu contributions. */
export const builtinClassicEditorMenuContributions: readonly ClassicEditorContribution[] =
  Object.freeze([
    {
      kind: "document-service",
      id: "document.import.json",
      menuId: "import",
      menuLabel: copy("importDocument"),
      menuIcon: "upload",
      label: copy("quireKitJson"),
      service: "json",
      operation: "import",
      order: 90
    },
    {
      kind: "document-service",
      id: "document.export.json",
      menuId: "export",
      menuLabel: copy("exportDocument"),
      menuIcon: "download",
      label: copy("quireKitJson"),
      service: "json",
      operation: "export",
      order: 190
    }
  ]);
