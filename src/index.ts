import type { ReportType } from './types';
import process from 'node:process';
import { parseArgs } from 'node:util';
import consola from 'consola';
import { ExtractorCore } from './core';

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
  },
  allowPositionals: true,
  strict: true,
});

if (!values.input) {
  consola.error('You missed input file!');
  process.exit();
}

const ext = new ExtractorCore(values.input, {
  AUTO_IMPORT_DECLARATION_NAME: values.autoImportName,
  AUTO_IMPORT_DECLARATION_PATH: values.autoImportPath,
  REPORT_FILE_TYPE: values.reportType as ReportType,
  REPORT_NAME: values.reportName,
  TSCONFIG_PATH: values.tsconfigPath,
});
ext.delay(200).then(() => {
  ext.extract();
});
