import type { ConfigExtractor, ObjectString } from './types';
import {
  createReadStream,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, parse, resolve } from 'node:path';
import rl from 'node:readline';
import consola from 'consola';
import { createObjectCsvWriter } from 'csv-writer';
import { CoreBase } from './base';

export class ExtractorCore extends CoreBase {
  constructor(path: string, config: Partial<ConfigExtractor>) {
    super();

    this.selectedPath = path;
    this.config = {
      ...this.config,
      ...config,
    };

    this.getProjectRoot();
    this.parseAutoImports();
  }

  private getProjectRoot() {
    let projectRoot = '';
    let tempPath = this.inputIsFile ? dirname(this.selectedPath) : this.selectedPath;
    while (!projectRoot.length) {
      const currentFolder = basename(tempPath);
      if (readdirSync(tempPath).includes('package.json'))
        projectRoot = tempPath;
      else tempPath = tempPath.slice(0, tempPath.lastIndexOf(currentFolder));
    }
    this.rootDir = projectRoot;
  }

  async extractor() {
    if (!this.inputIsFile) {
      await this.extractDirectory();
    }
    else {
      await this.extract();
    }
  }

  private async extractDirectory() {
    const files = readdirSync(this.selectedPath);
    for await (const name of files) {
      const filePath = resolve(this.selectedPath, name);
      await this.extract({}, filePath);
    }
  }

  private async extract(imports: ObjectString = {}, file = this.selectedPath) {
    const filePathInfo = parse(file);
    const fileName = resolve(filePathInfo.root, basename(filePathInfo.dir), filePathInfo.base)
    const fileImports = imports;
    const stream = createReadStream(file);
    const rls = rl.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });
    let countLines = 0;
    let countIncorrectImport = 0;

    this.foundedKeys[fileName] = [];

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
        this.foundedKeys[fileName].push(translationKey);
      }

      countLines += 1;
    }

    // TODO: incorrect check of unused imports
    // this.checkUnusedImports(file, fileImports)

    if (
      countLines === countIncorrectImport
      || !Object.keys(fileImports).length
    ) {
      return;
    }

    Object.entries(fileImports)
      .filter(([_name, cPath]) => Object.keys(this.foundedKeys).every(key => !cPath.includes(key)))
      .forEach(([_name, compPath]) => {
        this.extract(fileImports, this.resolveAlias(compPath));
      });
  }

  private checkUnusedImports(filePath: string, imports: ObjectString) {
    const file = readFileSync(filePath);
    const stringFile = file.toString();
    Object.keys(imports).forEach((name) => {
      const [_, content] = this.useRegex(
        this.REGEX_TEMPLATE_CONTENT,
        stringFile,
      );
      if (!content.includes(name))
        delete imports[name];
    });
  }

  reportKeys() {
    if (!Object.values(this.foundedKeys).flat().length) {
      consola.error(
        `Translation keys not found in or subpaths: ${this.selectedPath}`,
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
      case 'json': {
        const sorted = Object.entries(this.foundedKeys).sort((a, b) => b[1].length - a[1].length).reduce((_obj, [k, v]) => ({
          ..._obj,
          [k]: [...new Set(v)],
        }), {});
        writeFileSync(filePath, JSON.stringify(sorted, undefined, 2));
        break;
      }
    }

    consola.success(`Translation keys is wrote in: ./${filePath}`);
  }

  private async parseAutoImports() {
    if (!this.autoImportPath) {
      this.log('Auto-Imported Components not found.');
      return;
    }

    const fileRaw = readFileSync(this.autoImportPath).toString();

    [...fileRaw.matchAll(this.REGEX_AUTO_IMPORT)].forEach((arr) => {
      const [_, name, path] = arr;
      this.autoImports[name] = path;
    });
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
