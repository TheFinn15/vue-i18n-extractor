import type { ObjectStringArray } from '../types';
import { beforeAll, describe, expect, it } from 'vitest';
import reportJson from '../../i18n-report.json';
import { ExtractorCore } from '../core';
import { delay } from '../utils';

let extractor: ExtractorCore;
const testFile = Bun.env.TEST_FILE!;

beforeAll(async () => {
  extractor = new ExtractorCore(testFile, {});
  await delay(200);
  await extractor.extractor();
});

describe('extractor', () => {
  it('check root dir', () => {
    expect(extractor.rootDir).toBe(testFile.slice(0, testFile.length - 6));
  });
  it('check auto imports', () => {
    expect(Object.keys(extractor.autoImports).length).toBeGreaterThan(0);
  });
  it('check non-empty report', async () => {
    await delay(500);
    extractor.reportKeys(false);
    const report = reportJson as ObjectStringArray;

    expect(Object.values(report).every(v => v.length)).toBe(true);
  });
  it('check with empty report', async () => {
    await delay(500);
    extractor.reportKeys();
    const report = reportJson as ObjectStringArray;

    expect(Object.values(report).every(v => v.length)).toBe(true);
  });
});
