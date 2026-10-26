import type { ExportTemplateProvider, ExportTemplateReference } from '@quirekit/export-template';

/** Reactive subset accepted from Vue's normalized optional props. */
export interface MdExportTemplateSelectionProps {
  /** Host catalog, when installed. */ readonly templates?: ExportTemplateProvider | undefined;
  /** Host-owned document selection. */ readonly exportStyle?: ExportTemplateReference | undefined;
  /** Control language. */ readonly locale?: 'zh-CN' | 'en' | undefined;
}

/** Public, implementation-neutral picker slot; commercial UI is installed by the host. */
export interface MdExportTemplateSlot {
  /** Host's template source. */ readonly provider: ExportTemplateProvider;
  /** Current document-owned reference. */ readonly selected: ExportTemplateReference;
  /** Commit an explicit selection; no Markdown transaction is dispatched. */ readonly choose: (reference: ExportTemplateReference) => void;
  /** Dismiss without changing selection. */ readonly close: () => void;
}
