import type { BlockMediaPresentation } from "./types";
/** Automatic geometry follows the source preview unless the user chooses a size. */
export const defaultMediaPresentation: BlockMediaPresentation = {
 width: null, height: null, align: "left", rotation: 0, flipX: false, flipY: false, lockAspectRatio: true,
 crop: { top: 0, right: 0, bottom: 0, left: 0 }, caption: "", alt: "", href: ""
};
/** @param value - Imported or directly edited display attributes. @returns Validated presentation without mutating the source. */
export function readMediaPresentation(value: unknown): BlockMediaPresentation {
 const record = value && typeof value === "object" ? value as Partial<BlockMediaPresentation> : {};
 const crop = { ...defaultMediaPresentation.crop, ...record.crop };
 const validCrop = Object.values(crop).every(edge => Number.isFinite(edge) && edge >= 0 && edge < 1) && crop.left + crop.right < .98 && crop.top + crop.bottom < .98;
 return {
  width: Number.isFinite(record.width) && Number(record.width) >= 32 ? Math.min(4000, Number(record.width)) : null,
  height: Number.isFinite(record.height) && Number(record.height) >= 24 ? Math.min(4000, Number(record.height)) : null,
  align: record.align === "right" || record.align === "center" ? record.align : "left",
  rotation: Number.isFinite(record.rotation) ? ((Math.round(Number(record.rotation) / 90) * 90 % 360) + 360) % 360 : 0,
  flipX: record.flipX === true, flipY: record.flipY === true, lockAspectRatio: record.lockAspectRatio !== false,
  crop: validCrop ? crop : defaultMediaPresentation.crop,
  caption: typeof record.caption === "string" ? record.caption : "", alt: typeof record.alt === "string" ? record.alt : "",
  href: typeof record.href === "string" && /^(https?:\/\/|mailto:)/iu.test(record.href) ? record.href : ""
 };
}
/** @param value - Safe source URL or data image. @returns Whether the source can be persisted and displayed. */
export function validMediaSource(value: unknown): value is string {
 return typeof value === "string" && /^(https?:\/\/|data:image\/(?:png|jpeg|gif|webp|avif|svg\+xml);base64,|\/[^/])/iu.test(value);
}
/** @param presentation - Validated geometry. @param previewMaxWidth - Source view's automatic width constraint, if provided. @returns Source-order HTML shell appearance. */
export function mediaShellStyle(presentation: BlockMediaPresentation, previewMaxWidth?: string): string {
 const maxWidth = presentation.width ? ";max-width:100%" : previewMaxWidth ? `;max-width:min(100%, ${previewMaxWidth})` : "";
 return `position:relative;margin:16px ${presentation.align === "left" ? "auto 16px 0" : presentation.align === "right" ? "0 16px auto" : "auto"};width:${presentation.width ? `${presentation.width}px` : "100%"}${maxWidth}`;
}
