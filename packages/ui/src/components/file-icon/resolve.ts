import type { QuireKitFileIconProps, QuireKitFileIdentity, QuireKitFileKind } from './types';

const families: ReadonlyArray<readonly [QuireKitFileKind, string, string]> = [
  ['document', 'W', 'doc docx docm dot dotx odt rtf pages'],
  ['spreadsheet', 'X', 'xls xlsx xlsm xlsb ods csv tsv numbers'],
  ['presentation', 'P', 'ppt pptx pptm odp key'],
  ['pdf', 'PDF', 'pdf'],
  ['ofd', 'OFD', 'ofd'],
  ['image', 'IMG', 'png jpg jpeg gif webp svg avif heic heif bmp tif tiff ico'],
  ['video', 'VID', 'mp4 mov m4v webm mkv avi wmv flv mpg mpeg 3gp'],
  ['audio', 'AUD', 'mp3 wav flac aac m4a ogg opus aiff mid midi'],
  ['archive', 'ZIP', 'zip rar 7z tar gz gzip bz2 xz tgz zst'],
  ['code', '</>', 'js jsx ts tsx json jsonc yaml yml xml py rb go rs java c h cpp hpp cs swift kt sh bash zsh sql toml ini vue svelte'],
  ['web', 'WEB', 'html htm css scss sass less'],
  ['markdown', 'MD', 'md mdx markdown'],
  ['text', 'TXT', 'txt log readme'],
  ['design', 'DES', 'fig sketch psd ai eps xd afdesign'],
  ['font', 'Aa', 'ttf otf woff woff2 eot'],
  ['file', 'FILE', '']
];
const byExtension = new Map(families.flatMap(([kind, badge, extensions]) => extensions.split(' ').filter(Boolean).map(extension => [extension, { kind, badge }] as const)));

/** Resolve an explicit family, known extension, then MIME; unknown files remain neutral.
 * @param file - Display metadata, never trusted as a content/security check.
 * @returns Stable color family and legible short badge.
 */
export function resolveQuireKitFileIdentity(file: QuireKitFileIconProps): QuireKitFileIdentity {
  const explicit = file.kind && families.find(([kind]) => kind === file.kind);
  if (explicit) return { kind: explicit[0], badge: explicit[1] };
  const name = file.name?.toLowerCase().trim() ?? '';
  const extension = name.includes('.') ? name.split('.').at(-1)! : '';
  const known = byExtension.get(extension);
  if (known) return { ...known };
  const mime = file.mediaType?.toLowerCase().split(';')[0]?.trim() ?? '';
  const kind: QuireKitFileKind = mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'audio'
    : /pdf$/.test(mime) ? 'pdf' : /word|opendocument.text/.test(mime) ? 'document'
      : /excel|spreadsheet|csv/.test(mime) ? 'spreadsheet' : /powerpoint|presentation/.test(mime) ? 'presentation'
        : /zip|compressed|archive|tar$/.test(mime) ? 'archive' : /html|css/.test(mime) ? 'web'
          : /markdown/.test(mime) ? 'markdown' : /json|javascript|xml/.test(mime) ? 'code'
            : /font/.test(mime) ? 'font' : mime.startsWith('text/') ? 'text' : 'file';
  return { kind, badge: families.find(([family]) => family === kind)![1] };
}
