import process from 'node:process';
import { beforeAll, describe, expect, it } from 'vitest';
import { ExtractorCore } from '../core';

let extractor: ExtractorCore;
const testFile = process.env.TEST_FILE!;

beforeAll(() => {
  extractor = new ExtractorCore(testFile, {});
})

describe('extractor', () => {
  it('check root dir', () => {
    expect(extractor.rootDir).toBe(testFile.slice(0, testFile.length - 6))
  })
  it('check auto imports', () => {
    expect(Object.keys(extractor.autoImports).length).toBeGreaterThan(0)
  })
})
