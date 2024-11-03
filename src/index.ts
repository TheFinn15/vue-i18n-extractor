import type { ReportType } from './types';
import process from 'node:process';
import { parseArgs } from 'node:util';
import consola from 'consola';
import { ExtractorCore } from './core';
import { delay } from './utils';

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
  },
  allowPositionals: true,
  strict: true,
});

const input = Bun.env.TEST_FILE || values.input;

if (!input) {
  consola.error('You missed input file!');
  process.exit();
}

const ext = new ExtractorCore(input, {
  AUTO_IMPORT_DECLARATION_NAME: values.autoImportName,
  AUTO_IMPORT_DECLARATION_PATH: values.autoImportPath,
  REPORT_FILE_TYPE: values.reportType as ReportType,
  REPORT_NAME: values.reportName,
  TSCONFIG_PATH: values.tsconfigPath,
  ALLOW_EMPTY_FILES: values.allowEmpty,
  REPORT_OUTPUT: values.reportOutput,
});

delay(200).then(async () => {
  await Promise.all([ext.extractor(), delay(200)])
  ext.reportKeys();
});
