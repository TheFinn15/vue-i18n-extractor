import type { ReportType } from './types';
import process from 'node:process';
import { parseArgs } from 'node:util';
import consola from 'consola';
import { ExtractorCore } from './core';
import { delay } from './utils.ts';

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    'input': {
      type: 'string',
    },
    'auto-import-name': {
      default: 'components.d.ts',
      type: 'string',
    },
    'auto-import-path': {
      default: '',
      type: 'string',
    },
    'tsconfig-path': {
      default: '',
      type: 'string',
    },
    'report-type': {
      default: 'json',
      type: 'string',
    },
    'report-name': {
      default: 'i18n-report',
      type: 'string',
    },
    'allow-empty': {
      default: false,
      type: 'boolean',
    },
    'report-output': {
      default: './',
      type: 'string',
    },
    'debug': {
      default: false,
      type: 'boolean',
    },
  },
  allowPositionals: true,
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
  AUTO_IMPORT_DECLARATION_NAME: AUTO_IMPORT_NAME ?? values['auto-import-name'],
  AUTO_IMPORT_DECLARATION_PATH: AUTO_IMPORT_PATH ?? values['auto-import-path'],
  REPORT_FILE_TYPE: (REPORT_TYPE ?? values['report-type']) as ReportType,
  REPORT_NAME: REPORT_NAME ?? values['report-name'],
  TSCONFIG_PATH: TSCONFIG_PATH ?? values['tsconfig-path'],
  ALLOW_EMPTY_FILES: values['allow-empty'],
  REPORT_OUTPUT: REPORT_OUTPUT ?? values['report-output'],
  DEBUG_MODE: values.debug,
});

delay(200).then(async () => {
  await Promise.all([ext.extractor(), delay(200)]);
  ext.reportKeys();
});
