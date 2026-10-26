import { OFDAnnotation, type OFDAnnotationOptions } from "../annotation";
import type { OFDAction } from "../action";
import { OFDPageContent } from "./page-content";
import { OFDPageResources } from "./page-resources";
import type { OFDPageSnapshot } from "./state";
import type { OFDTemplatePage } from "./template-page";
import type {
  OFDPageOptions,
  OFDTemplateReferenceOptions
} from "./types";

/** One fixed-layout physical page owned by an `OFDDocument`. */
export class OFDPage extends OFDPageContent {
  /** @internal */
  readonly pageIdentity = {};
  /** Zero-based insertion index. */
  readonly index: number;
  private readonly templates: {
    readonly template: OFDTemplatePage;
    readonly options: Readonly<OFDTemplateReferenceOptions>;
  }[] = [];
  private readonly annotations: OFDAnnotation[] = [];
  private readonly actions: OFDAction[] = [];
  private readonly pageResources: OFDPageResources;

  /**
   * Creates one internal physical page.
   *
   * @param documentIdentity - Identity of the owning document.
   * @param index - Zero-based page index.
   * @param options - Physical page dimensions.
   */
  constructor(
    documentIdentity: object,
    index: number,
    private readonly options: Readonly<OFDPageOptions>
  ) {
    super(documentIdentity);
    this.index = index;
    this.pageResourceIdentity = this.pageIdentity;
    this.pageResources = new OFDPageResources(documentIdentity, this.pageIdentity);
  }

  /**
   * Returns the resource registry local to this physical page.
   *
   * @returns Page-local resource registry.
   */
  resources(): OFDPageResources {
    return this.pageResources;
  }

  /**
   * References reusable template content before this page's own layers.
   *
   * @param template - Template page owned by the same document.
   * @param options - Optional page-specific presentation order.
   * @returns This page for fluent authoring.
   */
  addTemplate(
    template: OFDTemplatePage,
    options: OFDTemplateReferenceOptions = {}
  ): this {
    if (template.documentIdentity !== this.documentIdentity) {
      throw new TypeError("OFD templates cannot be shared across documents.");
    }
    this.templates.push({
      template,
      options: Object.freeze({ ...options })
    });
    return this;
  }

  /**
   * Adds one typed annotation and returns its drawable static appearance.
   *
   * @param options - Standard annotation properties and appearance boundary.
   * @returns New page-local annotation.
   */
  addAnnotation(options: OFDAnnotationOptions): OFDAnnotation {
    const annotation = new OFDAnnotation(
      this.documentIdentity,
      freezeAnnotationOptions(options)
    );
    this.annotations.push(annotation);
    return annotation;
  }

  /**
   * Adds an action that executes when this page is opened.
   *
   * @param action - Typed action target owned by this document.
   * @returns This page for fluent authoring.
   */
  addAction(action: OFDAction): this {
    this.actions.push(Object.freeze({ ...action }) as OFDAction);
    return this;
  }

  /**
   * Freezes this page for deterministic compilation.
   *
   * @returns Immutable page snapshot.
   * @internal
   */
  toSnapshot(): OFDPageSnapshot {
    return {
      pageIndex: this.index,
      pageIdentity: this.pageIdentity,
      options: this.options,
      layers: this.snapshotLayers(),
      templates: Object.freeze(this.templates.map((reference) => ({
        templateIdentity: reference.template.templateIdentity,
        documentIdentity: reference.template.documentIdentity,
        options: reference.options
      }))),
      annotations: Object.freeze(this.annotations.map((annotation) =>
        annotation.toSnapshot()
      )),
      actions: Object.freeze([...this.actions]),
      pageImages: this.pageResources.toSnapshot()
    };
  }
}

/**
 * Freezes annotation properties and its nested author-provided collections.
 *
 * @param options - Caller-provided annotation options.
 * @returns Immutable annotation options.
 */
function freezeAnnotationOptions(
  options: OFDAnnotationOptions
): Readonly<OFDAnnotationOptions> {
  return Object.freeze({
    ...options,
    boundary: Object.freeze({ ...options.boundary }),
    ...(options.parameters
      ? { parameters: Object.freeze({ ...options.parameters }) }
      : {})
  });
}
