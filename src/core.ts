import type { ConfigExtractor, ObjectString } from './types';
import { createReadStream, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import process from 'node:process';
import rl from 'node:readline';
import consola from 'consola';
import { createObjectCsvWriter } from 'csv-writer';
import { CoreBase } from './base';

export class ExtractorCore extends CoreBase {
  constructor(filePath: string, config: Partial<ConfigExtractor>) {
    super();

    this.selectedFile = filePath;
    this.config = {
      ...this.config,
      ...config,
    }

    this.getProjectRoot();
    this.parseAutoImports();
  }

  private getProjectRoot() {
    let projectRoot = '';
    let tempPath = dirname(this.selectedFile);
    while (!projectRoot.length) {
      const currentFolder = basename(tempPath);
      if (readdirSync(tempPath).includes('package.json'))
        projectRoot = tempPath;
      else tempPath = tempPath.slice(0, tempPath.lastIndexOf(currentFolder));
    }
    this.rootDir = projectRoot;
  }

  async extract(imports: ObjectString = {}, file = this.selectedFile) {
    const currentFileName = basename(file);
    const fileImports = imports;
    const stream = createReadStream(file);
    const rls = rl.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });
    let countLines = 0;
    let countIncorrectImport = 0;

    this.foundedKeys[currentFileName] = [];

    for await (const line of rls) {
      const [_g, componentName] = this.useRegex(
        this.REGEX_TEMPLATE_COMPONENT,
        line,
      );
      const [_, name, path] = this.useRegex(this.REGEX_FILE_IMPORT, line);
      const [__, translationKey] = this.useRegex(this.REGEX_I18N_KEY, line);

      if (componentName in this.autoImports) {
        fileImports[componentName] = this.autoImports[componentName];
      }
      else if (name && path) {
        fileImports[name] = path;
      }
      else {
        countIncorrectImport += 1;
      }
      if (translationKey) {
        this.foundedKeys[currentFileName].push(translationKey);
      }

      countLines += 1;
    }

    if (countLines === countIncorrectImport) {
      this.reportKeys();
      process.exit();
    }

    Object.entries(fileImports).forEach(([name, compPath]) => {
      if (name in this.foundedKeys)
        return;
      this.extract(fileImports, this.resolveAlias(compPath));
    });
  }

  private reportKeys() {
    if (!Object.values(this.foundedKeys).flat().length) {
      consola.error(
        `Translation keys not found in or subpaths: ${this.selectedFile}`,
      );
      return;
    }

    const fileType = this.config.REPORT_FILE_TYPE;
    const reportName = this.config.REPORT_NAME;
    const filePath = `${reportName}.${fileType}`;

    const csvHeaders = [
      {
        id: 'name',
        title: 'Component',
      },
      {
        id: 'key',
        title: 'Variable',
      },
    ];

    switch (fileType) {
      case 'csv':
        createObjectCsvWriter({
          header: csvHeaders,
          path: filePath,
        }).writeRecords(
          Object.entries(this.foundedKeys).flatMap(([key, arr]) => {
            return arr.map(i => ({ name: key, key: i }));
          }),
        );
        break;
      case 'json':
        writeFileSync(filePath, JSON.stringify(this.foundedKeys, undefined, 2));
        break;
    }

    consola.success(`Translation keys is wrote in: ./${filePath}`);
  }

  private async parseAutoImports() {
    if (!this.autoImportPath) {
      this.log('Auto-Imported Components not found.');
      return;
    }
    const stream = createReadStream(this.autoImportPath);
    const rls = rl.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    for await (const line of rls) {
      const [match] = this.REGEX_AUTO_IMPORT_PATH_FILE.exec(line) ?? [];

      if (match && !line.includes('Lazy')) {
        const componentName = line.split(' ')[2].replace(':', '');

        // remove duplicates by file path
        if (
          componentName
          && Object.values(this.autoImports).every(v => v !== match)
        ) {
          this.autoImports[componentName] = match.replaceAll(/["'`]/g, '');
        }
      }
    }
  }

  private resolveAlias(importPath: string) {
    const root = this.config.TSCONFIG_PATH
      ? this.rootDir
      : `${this.rootDir}.nuxt/`;
    const aliases = this.importsAlias;
    const sorted = Object.keys(this.importsAlias).sort(
      (a, b) => b.length - a.length,
    );
    for (const alias of sorted) {
      const aliasWithoutStar = alias.replace('/*', '');

      if (importPath.startsWith(aliasWithoutStar)) {
        const aliasPath = aliases[alias][0].replace('/*', '');

        return resolve(
          root,
          aliasPath,
          `./${importPath.replace(aliasWithoutStar, '')}`,
        );
      }
    }
    return resolve(root, importPath);
  }
}
