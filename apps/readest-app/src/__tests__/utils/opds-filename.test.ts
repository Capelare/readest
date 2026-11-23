import { describe, expect, it } from 'vitest';
import {
  getOPDSAcquisitionExtension,
  getOPDSFilenameParts,
  makeOPDSFilename,
  sanitizeOPDSFilename,
} from '@/utils/opdsFilename';
import { getPublication } from 'foliate-js/opds.js';

describe('WitchHunt-compatible OPDS filenames', () => {
  it('matches the reference Author - Title filename and alternate formats', () => {
    const title = 'Life, the Universe and Everything';
    expect(makeOPDSFilename('Douglas Adams', title, 'author-title', 'epub')).toBe(
      'Douglas Adams - Life, the Universe and Everything.epub',
    );
    expect(makeOPDSFilename('Douglas Adams', title, 'title-author', 'epub')).toBe(
      'Life, the Universe and Everything - Douglas Adams.epub',
    );
    expect(makeOPDSFilename('Douglas Adams', title, 'title', 'epub')).toBe(`${title}.epub`);
    expect(makeOPDSFilename('', title, 'author-title', 'epub')).toBe(`${title}.epub`);
    expect(makeOPDSFilename('', '', 'title', 'epub')).toBe('book.epub');
  });

  it('uses the first raw Atom author and decoded text, not display metadata formatting', () => {
    const xml = new DOMParser().parseFromString(
      '<entry xmlns="http://www.w3.org/2005/Atom"><title>  A &amp; B  </title>' +
        '<author><name> First &amp; Author </name></author><author><name>Translator</name></author></entry>',
      'application/xml',
    );
    const parts = getOPDSFilenameParts(getPublication(xml.documentElement));
    expect(parts).toEqual({ author: ' First & Author ', title: '  A & B  ' });
    expect(makeOPDSFilename(parts.author, parts.title, 'author-title', 'epub')).toBe(
      'First & Author  -   A & B.epub',
    );
  });

  it('matches replacement, control removal, edge trimming and empty fallback rules', () => {
    expect(sanitizeOPDSFilename(' ..A/B\\C:D*E?F"G<H>I|J.\x00\x1f\x7f . ')).toBe(
      'A_B_C_D_E_F_G_H_I_J',
    );
    expect(sanitizeOPDSFilename(' ...\t\n')).toBe('book');
    expect(sanitizeOPDSFilename('café\u00a0')).toBe('café\u00a0');
  });

  it('caps only the base at 100 UTF-8 bytes without splitting codepoints', () => {
    expect(makeOPDSFilename('', 'a'.repeat(100), 'title', 'epub')).toBe(`${'a'.repeat(100)}.epub`);
    expect(makeOPDSFilename('', 'a'.repeat(101), 'title', 'kepub.epub')).toBe(
      `${'a'.repeat(100)}.kepub.epub`,
    );
    expect(sanitizeOPDSFilename(`${'a'.repeat(99)}é`)).toBe('a'.repeat(99));
    expect(sanitizeOPDSFilename(`${'a'.repeat(98)}éZ`)).toBe(`${'a'.repeat(98)}é`);
    expect(sanitizeOPDSFilename(`${'a'.repeat(96)}📖Z`)).toBe(`${'a'.repeat(96)}📖`);
  });

  it.each([
    {
      url: 'https://cwa.test/book/1/download',
      fallback: '',
      filename: 'server-name.epub',
      expected: 'epub',
    },
    {
      url: 'https://cwa.test/book/1/download',
      fallback: 'epub',
      filename: 'server-name.kepub.epub',
      expected: 'kepub.epub',
    },
    {
      url: 'https://cwa.test/book/1.epub',
      fallback: '',
      filename: '',
      expected: 'epub',
    },
  ])('resolves filename extensions for $url and $filename', ({
    url,
    fallback,
    filename,
    expected,
  }) => expect(getOPDSAcquisitionExtension(url, fallback, filename)).toBe(expected));

  it.each([
    '/book/1/kepub/',
    '/book/1.kepub.epub',
    '/book/1.kepub',
  ])('retains a reader-compatible KePub extension for %s', (path) =>
    expect(getOPDSAcquisitionExtension(`https://cwa.test${path}`, 'epub')).toBe('kepub.epub'));
});
