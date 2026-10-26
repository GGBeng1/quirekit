import {
  OFDAttachment,
  OFDColorSpace,
  OFDDrawParam,
  OFDFont,
  OFDImage,
  type OFDAttachmentOptions,
  type OFDFontFormat,
  type OFDFontOptions,
  type OFDImageFormat,
  type OFDImageOptions,
  type OFDColorSpaceOptions,
  type OFDDrawParamOptions,
  type OFDCompositeGraphicUnitOptions
} from "../resources";
import { compileOFDDocument } from "../writer";
import { OFDPage } from "./page";
import { OFDTemplatePage } from "./template-page";
import { OFDCompositeGraphicUnit } from "./composite-graphic-unit";
import type { OFDDocumentSnapshot } from "./state";
import type { OFDDocumentOpenAction } from "../action";
import {
  OFDValidationError,
  type OFDBookmarkOptions,
  type OFDDocumentOptions,
  type OFDOutlineOptions,
  type OFDPageOptions,
  type OFDPermissions,
  type OFDSaveOptions,
  type OFDTemplatePageOptions,
  type OFDViewerPreferences
} from "./types";
import { validateOFDDocument } from "../validation";
import { digestOFDBytes } from "../resources/digest";
import { assertOFDPackage } from "../verification";

/** Standalone write-first OFD document builder. */
export class OFDDocument {
  private readonly identity = {};
  private readonly pages: OFDPage[] = [];
  private readonly templates: OFDTemplatePage[] = [];
  private readonly fonts: OFDFont[] = [];
  private readonly images: OFDImage[] = [];
  private readonly colorSpaces: OFDColorSpace[] = [];
  private readonly drawParams: OFDDrawParam[] = [];
  private readonly compositeGraphicUnits: OFDCompositeGraphicUnit[] = [];
  private readonly fontsByKey = new Map<string, OFDFont>();
  private readonly imagesByDigest = new Map<string, OFDImage>();
  private readonly attachments: OFDAttachment[] = [];
  private readonly bookmarks: Readonly<OFDBookmarkOptions>[] = [];
  private readonly outlines: Readonly<OFDOutlineOptions>[] = [];
  private documentOpenActions: readonly OFDDocumentOpenAction[] = [];
  private readonly customData: Readonly<{ name: string; value: string }>[] = [];
  private permissions: Readonly<OFDPermissions> | undefined;
  private viewerPreferences: Readonly<OFDViewerPreferences> | undefined;

  /**
   * Creates a standalone OFD document.
   *
   * @param options - Metadata and standard profile.
   * @returns New document builder.
   */
  static create(options: OFDDocumentOptions = {}): OFDDocument {
    return new OFDDocument(options);
  }

  /**
   * Creates one internal document.
   *
   * @param options - Metadata and standard profile.
   */
  private constructor(private readonly options: OFDDocumentOptions) {}

  /**
   * Adds one physical page.
   *
   * @param options - Page dimensions in millimetres.
   * @returns New page.
   */
  addPage(options: OFDPageOptions): OFDPage {
    const page = new OFDPage(
      this.identity,
      this.pages.length,
      Object.freeze({ ...options })
    );
    this.pages.push(page);
    return page;
  }

  /**
   * Adds reusable template content declared in document common data.
   *
   * @param options - Template page dimensions and presentation defaults.
   * @returns New template page.
   */
  addTemplatePage(options: OFDTemplatePageOptions): OFDTemplatePage {
    const template = new OFDTemplatePage(
      this.identity,
      this.templates.length,
      Object.freeze({ ...options })
    );
    this.templates.push(template);
    return template;
  }

  /**
   * Embeds one complete font or registers a logical font.
   *
   * @param data - Complete font bytes, or undefined for a logical font.
   * @param options - Font identity and style.
   * @returns Font handle owned by this document.
   */
  embedFont(
    data: Uint8Array | ArrayBuffer | undefined,
    options: OFDFontOptions
  ): OFDFont {
    const bytes = data ? copyBytes(data) : undefined;
    const format = bytes ? detectFontFormat(bytes) : options.format;
    if (bytes && !format) {
      throw new TypeError("OFD font bytes must be TrueType or OpenType.");
    }
    const resourceKey = bytes
      ? `${digestOFDBytes(bytes)}:${stableFontOptions(options)}`
      : `logical:${stableFontOptions(options)}`;
    const existing = this.fontsByKey.get(resourceKey);
    if (existing) return existing;
    const font = new OFDFont(
      this.identity,
      this.fonts.length,
      Object.freeze({ ...options }),
      bytes,
      format
    );
    this.fonts.push(font);
    this.fontsByKey.set(resourceKey, font);
    return font;
  }

  /**
   * Embeds a PNG or JPEG image.
   *
   * @param data - Complete image bytes.
   * @param options - Optional format hint.
   * @returns Image handle owned by this document.
   */
  embedImage(
    data: Uint8Array | ArrayBuffer,
    options: OFDImageOptions = {}
  ): OFDImage {
    const bytes = copyBytes(data);
    const format = detectImageFormat(bytes);
    if (!format || (options.format && options.format !== format)) {
      throw new TypeError("OFD image bytes must match PNG or JPEG.");
    }
    const digest = digestOFDBytes(bytes);
    const existing = this.imagesByDigest.get(digest);
    if (existing) return existing;
    const image = new OFDImage(
      this.identity,
      this.images.length,
      bytes,
      format,
      Object.freeze({ ...options })
    );
    this.images.push(image);
    this.imagesByDigest.set(digest, image);
    return image;
  }

  /**
   * Embeds one document attachment.
   *
   * @param data - Complete attachment bytes.
   * @param options - Attachment metadata.
   * @returns Attachment handle owned by this document.
   */
  addAttachment(
    data: Uint8Array | ArrayBuffer,
    options: OFDAttachmentOptions
  ): OFDAttachment {
    const attachment = new OFDAttachment(
      this.identity,
      this.attachments.length,
      copyBytes(data),
      Object.freeze({ ...options })
    );
    this.attachments.push(attachment);
    return attachment;
  }

  /**
   * Registers one reusable device color space in the public resource file.
   *
   * @param options - Typed device color space and optional palette.
   * @returns Color-space handle owned by this document.
   */
  registerColorSpace(options: OFDColorSpaceOptions): OFDColorSpace {
    const colorSpace = new OFDColorSpace(
      this.identity,
      this.colorSpaces.length,
      freezeColorSpaceOptions(options)
    );
    this.colorSpaces.push(colorSpace);
    return colorSpace;
  }

  /**
   * Registers one reusable drawing parameter in the public resource file.
   *
   * @param options - Typed drawing parameter and optional inherited base.
   * @returns Drawing-parameter handle owned by this document.
   */
  registerDrawParam(options: OFDDrawParamOptions): OFDDrawParam {
    const drawParam = new OFDDrawParam(
      this.identity,
      this.drawParams.length,
      freezeDrawParamOptions(options)
    );
    this.drawParams.push(drawParam);
    return drawParam;
  }

  /**
   * Registers one reusable composite graphic unit with its own layered content.
   *
   * @param options - Composite dimensions and optional thumbnail image.
   * @returns Composite graphic resource owned by this document.
   */
  registerCompositeGraphicUnit(
    options: OFDCompositeGraphicUnitOptions
  ): OFDCompositeGraphicUnit {
    if (options.thumbnail) {
      assertResourceOwner(this.identity, options.thumbnail.documentIdentity);
    }
    const composite = new OFDCompositeGraphicUnit(
      this.identity,
      this.compositeGraphicUnits.length,
      Object.freeze({ ...options })
    );
    this.compositeGraphicUnits.push(composite);
    return composite;
  }

  /**
   * Adds one named bookmark.
   *
   * @param options - Bookmark name and destination.
   * @returns This document.
   */
  addBookmark(options: OFDBookmarkOptions): this {
    this.bookmarks.push(Object.freeze({ ...options }));
    return this;
  }

  /**
   * Adds one document outline root.
   *
   * @param options - Outline tree.
   * @returns This document.
   */
  addOutline(options: OFDOutlineOptions): this {
    this.outlines.push(Object.freeze({ ...options }));
    return this;
  }

  /**
   * Sets actions executed when a reader opens this document.
   *
   * The standalone profile emits these actions only as `Event="DO"` and
   * accepts only typed in-document destinations or named bookmarks.
   *
   * @param actions - Ordered document-open action targets.
   * @returns This document.
   */
  setOpenActions(actions: readonly OFDDocumentOpenAction[]): this {
    this.documentOpenActions = Object.freeze(actions.map(freezeDocumentOpenAction));
    return this;
  }

  /**
   * Adds one custom metadata pair.
   *
   * @param name - Custom metadata name.
   * @param value - Custom metadata value.
   * @returns This document.
   */
  addCustomData(name: string, value: string): this {
    this.customData.push(Object.freeze({ name, value }));
    return this;
  }

  /**
   * Sets document permissions.
   *
   * @param permissions - Permission policy.
   * @returns This document.
   */
  setPermissions(permissions: OFDPermissions): this {
    this.permissions = Object.freeze({ ...permissions });
    return this;
  }

  /**
   * Sets initial reader preferences.
   *
   * @param preferences - Viewer preferences.
   * @returns This document.
   */
  setViewerPreferences(preferences: OFDViewerPreferences): this {
    this.viewerPreferences = Object.freeze({ ...preferences });
    return this;
  }

  /**
   * Validates the current fixed-layout model.
   *
   * @returns Complete validation issues.
   */
  validate(): ReturnType<typeof validateOFDDocument> {
    return validateOFDDocument(this.toSnapshot());
  }

  /**
   * Serializes the current document as deterministic OFD bytes.
   *
   * @param options - Optional final package verification policy.
   * @returns Complete OFD package bytes.
   */
  async save(options: OFDSaveOptions = {}): Promise<Uint8Array> {
    const snapshot = this.toSnapshot();
    const issues = validateOFDDocument(snapshot);
    if (issues.length > 0) throw new OFDValidationError(issues);
    const bytes = compileOFDDocument(snapshot);
    if (options.verify !== false) assertOFDPackage(bytes);
    return bytes;
  }

  /**
   * Freezes the current builder state.
   *
   * @returns Immutable document snapshot.
   */
  private toSnapshot(): OFDDocumentSnapshot {
    return {
      documentIdentity: this.identity,
      profile: this.options.profile ?? "gb-t-33190-2016",
      metadata: Object.freeze({ ...(this.options.metadata ?? {}) }),
      fonts: Object.freeze([...this.fonts]),
      images: Object.freeze([...this.images]),
      colorSpaces: Object.freeze([...this.colorSpaces]),
      drawParams: Object.freeze([...this.drawParams]),
      compositeGraphicUnits: Object.freeze(this.compositeGraphicUnits.map((unit) =>
        unit.toSnapshot()
      )),
      attachments: Object.freeze([...this.attachments]),
      pages: Object.freeze(this.pages.map((page) => page.toSnapshot())),
      templates: Object.freeze(this.templates.map((template) =>
        template.toSnapshot()
      )),
      bookmarks: Object.freeze([...this.bookmarks]),
      outlines: Object.freeze([...this.outlines]),
      documentOpenActions: this.documentOpenActions,
      ...(this.permissions ? { permissions: this.permissions } : {}),
      ...(this.viewerPreferences
        ? { viewerPreferences: this.viewerPreferences }
        : {}),
      customData: Object.freeze([...this.customData])
    };
  }
}

/**
 * Freezes one document-open action while rejecting context fields that the
 * document owner, rather than callers, controls.
 *
 * @param action - Typed document-open target supplied by the caller.
 * @returns Immutable normalized action target.
 */
function freezeDocumentOpenAction(
  action: OFDDocumentOpenAction
): OFDDocumentOpenAction {
  const candidate = action as unknown as Record<string, unknown>;
  for (const field of ["event", "Event", "region", "Region", "id", "ID", "pageId", "PageID"]) {
    if (Object.hasOwn(candidate, field)) {
      throw new TypeError(`Document-open actions cannot set ${field}.`);
    }
  }
  if (action.type === "goto") {
    const destination = action.destination as unknown as Record<string, unknown>;
    for (const field of ["event", "Event", "region", "Region", "id", "ID", "pageId", "PageID"]) {
      if (Object.hasOwn(destination, field)) {
        throw new TypeError(`Document-open destinations cannot set ${field}.`);
      }
    }
    return Object.freeze({
      type: "goto",
      destination: Object.freeze({ ...action.destination })
    });
  }
  if (action.type === "goto-bookmark") {
    return Object.freeze({ type: "goto-bookmark", bookmark: action.bookmark });
  }
  throw new TypeError("Document-open actions support only goto and goto-bookmark.");
}

/**
 * Freezes the nested palette of one color-space registration.
 *
 * @param options - Caller-provided color-space options.
 * @returns Immutable color-space options.
 */
function freezeColorSpaceOptions(
  options: OFDColorSpaceOptions
): Readonly<OFDColorSpaceOptions> {
  return Object.freeze({
    ...options,
    ...(options.palette
      ? { palette: Object.freeze(options.palette.map((color) => Object.freeze([...color]))) }
      : {})
  });
}

/**
 * Freezes nested values of one drawing-parameter registration.
 *
 * @param options - Caller-provided drawing-parameter options.
 * @returns Immutable drawing-parameter options.
 */
function freezeDrawParamOptions(
  options: OFDDrawParamOptions
): Readonly<OFDDrawParamOptions> {
  return Object.freeze({
    ...options,
    ...(options.dashPattern ? { dashPattern: Object.freeze([...options.dashPattern]) } : {}),
    ...(options.fillColor ? { fillColor: freezeDrawParamColor(options.fillColor) } : {}),
    ...(options.strokeColor ? { strokeColor: freezeDrawParamColor(options.strokeColor) } : {})
  });
}

/**
 * Freezes one draw-parameter color value without altering its resource handle.
 *
 * @param color - Caller-provided drawing-parameter color.
 * @returns Immutable drawing-parameter color.
 */
function freezeDrawParamColor(
  color: NonNullable<OFDDrawParamOptions["fillColor"]>
): Readonly<NonNullable<OFDDrawParamOptions["fillColor"]>> {
  return Object.freeze({
    ...color,
    ...(color.value ? { value: Object.freeze([...color.value]) } : {})
  });
}

/**
 * Rejects a resource handle from another document.
 *
 * @param documentIdentity - Expected owning document identity.
 * @param resourceIdentity - Actual resource owner identity.
 */
function assertResourceOwner(
  documentIdentity: object,
  resourceIdentity: object
): void {
  if (documentIdentity !== resourceIdentity) {
    throw new TypeError("OFD resources cannot be shared across documents.");
  }
}

/**
 * Copies caller-owned bytes.
 *
 * @param data - Caller-owned bytes.
 * @returns Defensive byte copy.
 */
function copyBytes(data: Uint8Array | ArrayBuffer): Uint8Array {
  const bytes = data instanceof Uint8Array
    ? data
    : new Uint8Array(data);
  return new Uint8Array(bytes);
}

/**
 * Detects a supported complete font container.
 *
 * @param data - Candidate font bytes.
 * @returns Font format, or undefined.
 */
function detectFontFormat(data: Uint8Array): OFDFontFormat | undefined {
  if (data[0] === 0x00 && data[1] === 0x01
    && data[2] === 0x00 && data[3] === 0x00) return "TrueType";
  if (data[0] === 0x4f && data[1] === 0x54
    && data[2] === 0x54 && data[3] === 0x4f) return "OpenType";
  return undefined;
}

/**
 * Detects a supported image format.
 *
 * @param data - Candidate image bytes.
 * @returns Image format, or undefined.
 */
function detectImageFormat(data: Uint8Array): OFDImageFormat | undefined {
  if (data[0] === 0x89 && data[1] === 0x50
    && data[2] === 0x4e && data[3] === 0x47) return "PNG";
  if (data[0] === 0xff && data[1] === 0xd8
    && data[2] === 0xff) return "JPEG";
  return undefined;
}

/**
 * Serializes font metadata in a stable property order for deduplication.
 *
 * @param options - Font metadata.
 * @returns Stable option key.
 */
function stableFontOptions(options: OFDFontOptions): string {
  return JSON.stringify([
    options.fontName,
    options.familyName ?? null,
    options.format ?? null,
    options.charset ?? null,
    options.bold ?? null,
    options.italic ?? null,
    options.serif ?? null,
    options.fixedWidth ?? null
  ]);
}
