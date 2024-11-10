import type { ReportType } from './types';
import process from 'node:process';
import { parseArgs } from 'node:util';
import consola from 'consola';
import { ExtractorCore } from './core';
import { delay } from './utils.ts';

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    input: {
      type: 'string',
    },
    autoImportName: {
      default: 'components.d.ts',
      type: 'string',
    },
    autoImportPath: {
      default: '',
      type: 'string',
    },
    tsconfigPath: {
      default: '',
      type: 'string',
    },
    reportType: {
      default: 'json',
      type: 'string',
    },
    reportName: {
      default: 'i18n-report',
      type: 'string',
    },
    allowEmpty: {
      default: true,
      type: 'boolean',
    },
    reportOutput: {
      default: './',
      type: 'string',
    },
    debug: {
      default: false,
      type: 'boolean',
    },
  },
  allowPositionals: true,
  strict: true,
});

const {
  TEST_FILE,
  AUTO_IMPORT_NAME,
  AUTO_IMPORT_PATH,
  REPORT_TYPE,
  REPORT_OUTPUT,
  REPORT_NAME,
  TSCONFIG_PATH,
} = Bun.env;

const input = TEST_FILE || values.input;

if (!input) {
  consola.error('You missed input file!');
  process.exit();
}

const ext = new ExtractorCore(input, {
  AUTO_IMPORT_DECLARATION_NAME: AUTO_IMPORT_NAME ?? values.autoImportName,
  AUTO_IMPORT_DECLARATION_PATH: AUTO_IMPORT_PATH ?? values.autoImportPath,
  REPORT_FILE_TYPE: (REPORT_TYPE ?? values.reportType) as ReportType,
  REPORT_NAME: REPORT_NAME ?? values.reportName,
  TSCONFIG_PATH: TSCONFIG_PATH ?? values.tsconfigPath,
  ALLOW_EMPTY_FILES: values.allowEmpty,
  REPORT_OUTPUT: REPORT_OUTPUT ?? values.reportOutput,
  DEBUG_MODE: values.debug,
});

delay(200).then(async () => {
  await Promise.all([ext.extractor(), delay(200)]);
  ext.reportKeys();
});
