import type { OPDSFilenameFormat, OPDSPublication } from '@/types/opds';
import { getFileExtension } from '@/utils/path';

export const isOPDSFilenameFormat = (value: unknown): value is OPDSFilenameFormat =>
  value === 'author-title' || value === 'title-author' || value === 'title';

// WitchHunt StringUtils::sanitizeFilename caps the base, not the extension.
export const sanitizeOPDSFilename = (base: string): string => {
  let result = '';
  let bytes = 0;
  const encoder = new TextEncoder();
  for (const codepoint of base.replace(/^[ .]+/, '')) {
    const cp = codepoint.codePointAt(0)!;
    if (cp < 32 || cp === 127) continue;
    const text = /[\\/:*?"<>|]/.test(codepoint) ? '_' : codepoint;
    const length = encoder.encode(text).length;
    if (bytes + length > 100) break;
    result += text;
    bytes += length;
  }
  return result.replace(/[ .]+$/, '') || 'book';
};

export const makeOPDSFilename = (
  author: string,
  title: string,
  format: OPDSFilenameFormat,
  extension: string,
): string => {
  const base =
    format === 'title'
      ? title
      : !author
        ? title
        : format === 'title-author'
          ? `${title} - ${author}`
          : `${author} - ${title}`;
  return `${sanitizeOPDSFilename(base)}.${extension}`;
};

export const getOPDSFilenameParts = (publication: OPDSPublication) => ({
  title: publication.metadata.title ?? '',
  author: publication.metadata.author?.[0]?.name ?? '',
});

export const getOPDSAcquisitionExtension = (
  url: string,
  fallback: string,
  filename = '',
): string => {
  const pathname = new URL(url).pathname;
  if (
    /(?:\.kepub(?:\.epub)?|\/kepub)\/*$/i.test(pathname) ||
    /\.kepub(?:\.epub)?$/i.test(filename)
  ) {
    return 'kepub.epub';
  }
  return fallback || getFileExtension(filename) || getFileExtension(pathname);
};
