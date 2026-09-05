/**
 * The spreadsheet download.
 *
 * The date in the filename arrives from ?date= and lands in a response
 * header, so the cases that matter are the ones where it is not a date at
 * all: a quote closes the header's filename early and a newline starts a
 * header of the attacker's choosing. The rest is the plain contract a
 * browser needs to save the file instead of showing it.
 */

import { describe, expect, it } from 'vitest';

import { EXCEL_CONTENT_TYPE, excelDownloadHeaders, getExcelFilename } from './excel';

describe('getExcelFilename', () => {
  it('names the workbook after the day it covers', () => {
    expect(getExcelFilename('2026-09-05')).toBe('carwash_2026-09-05.xlsx');
  });

  it('names the workbook after the month it covers', () => {
    expect(getExcelFilename('2026-09')).toBe('carwash_2026-09.xlsx');
  });

  it('ends in the extension a spreadsheet is opened by', () => {
    expect(getExcelFilename('2026-09-05').endsWith('.xlsx')).toBe(true);
  });

  it('still produces a usable name when the date is empty', () => {
    expect(getExcelFilename('')).toBe('carwash_.xlsx');
  });

  it('drops a quote, which would close the header field early', () => {
    expect(getExcelFilename('2026-09-05"')).toBe('carwash_2026-09-05.xlsx');
  });

  it('drops a newline, which would start a header of its own', () => {
    expect(getExcelFilename('2026-09-05\r\nX-Injected: yes')).toBe(
      'carwash_2026-09-05X-Injectedyes.xlsx'
    );
  });

  it('drops a path separator, so the name cannot climb out of a folder', () => {
    expect(getExcelFilename('../../etc/passwd')).toBe('carwash_etcpasswd.xlsx');
  });

  it('drops a semicolon, which separates the parts of the header', () => {
    expect(getExcelFilename('2026-09; filename=other')).toBe('carwash_2026-09filenameother.xlsx');
  });

  it('keeps a well-formed date exactly as it was given', () => {
    for (const date of ['2026-01-01', '2026-12-31', '2025-02', '0099-05']) {
      expect(getExcelFilename(date)).toBe(`carwash_${date}.xlsx`);
    }
  });
});

describe('excelDownloadHeaders', () => {
  it('serves the workbook as a spreadsheet', () => {
    expect(excelDownloadHeaders('2026-09-05')['Content-Type']).toBe(EXCEL_CONTENT_TYPE);
  });

  it('tells the browser to save rather than show it', () => {
    expect(excelDownloadHeaders('2026-09-05')['Content-Disposition']).toBe(
      'attachment; filename="carwash_2026-09-05.xlsx"'
    );
  });

  it('carries the filename the date asked for', () => {
    const disposition = excelDownloadHeaders('2026-09')['Content-Disposition'];
    expect(disposition).toContain(getExcelFilename('2026-09'));
  });

  it('leaves no header value spanning more than one line', () => {
    const headers = excelDownloadHeaders('2026-09-05\r\nX-Injected: yes');
    for (const value of Object.values(headers)) {
      expect(value).not.toContain('\n');
      expect(value).not.toContain('\r');
    }
  });

  it('leaves the filename field closed by exactly its own two quotes', () => {
    const disposition = excelDownloadHeaders('2026-09-05"; filename="other')['Content-Disposition'];
    expect(disposition.split('"')).toHaveLength(3);
  });

  it('names both headers a download needs and nothing else', () => {
    expect(Object.keys(excelDownloadHeaders('2026-09-05')).sort()).toEqual([
      'Content-Disposition',
      'Content-Type',
    ]);
  });
});
