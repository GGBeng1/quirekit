import type { QuireDocumentRange } from "@quirekit/renderer";
import { HtmlDescriptorRuntime } from "./lifecycle";
import type {
  HtmlWidgetDesc,
  HtmlWidgetDescriptorRuntimeOptions
} from "./types";

/** Runtime implementation of one retained keyed widget descriptor. */
export class HtmlWidgetDescriptorRuntime
  extends HtmlDescriptorRuntime
  implements HtmlWidgetDesc {
  /** @inheritdoc */
  readonly kind = "widget" as const;
  /** @inheritdoc */
  readonly key: string;
  /** @inheritdoc */
  decoration: HtmlWidgetDesc["decoration"];
  /** @inheritdoc */
  side: number;
  private readonly destroyDecoration: HtmlWidgetDesc["decoration"];

  /**
   * Creates a retained keyed widget descriptor.
   *
   * @param options - Widget key, decoration, side, and lifecycle inputs.
   */
  constructor(options: HtmlWidgetDescriptorRuntimeOptions) {
    super(options);
    this.key = options.key;
    this.decoration = options.decoration;
    this.destroyDecoration = options.decoration;
    this.side = options.side;
  }

  /** @inheritdoc */
  updateWidget(
    decoration: HtmlWidgetDesc["decoration"],
    range: QuireDocumentRange,
    side: number
  ): void {
    this.decoration = decoration;
    this.range = range;
    this.side = side;
  }

  /** @inheritdoc */
  override destroy(): void {
    if (this.destroyed) {
      return;
    }
    const dom = this.mount?.dom;

    super.destroy();
    if (dom) {
      this.destroyDecoration.type.destroy(dom);
    }
  }
}
