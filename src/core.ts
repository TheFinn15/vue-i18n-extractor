import type { ConfigExtractor, ObjectString } from './types';
import { createReadStream, existsSync, readdirSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import process from 'node:process';
import rl from 'node:readline';
import { createObjectCsvWriter } from 'csv-writer';
import path from 'upath';
import { CoreBase } from './base';
import { ExtractorLogger } from './logger';
import { useRegex } from './utils';

export class ExtractorCore extends CoreBase {
  logger: ExtractorLogger;

  constructor(path: string, config: Partial<ConfigExtractor>) {
    super();

    this.config = {
      ...this.config,
      ...config,
    };

    this.logger = new ExtractorLogger(this.isDebug);

    if (!existsSync(path)) {
      this.logger.log({
        data: 'Input path not exist. Try again...',
        type: 'error',
        persist: true,
      });
      process.exit();
    }

    this.selectedPath = path;

    this.getProjectRoot();
    this.parseAutoImports();
  }

  private getProjectRoot() {
    let projectRoot = '';
    let tempPath = this.inputIsFile
      ? path.dirname(this.selectedPath)
      : this.selectedPath;
    while (!projectRoot.length) {
      const currentFolder = path.basename(tempPath);
      if (readdirSync(tempPath).includes('package.json'))
        projectRoot = tempPath;
      else tempPath = tempPath.slice(0, tempPath.lastIndexOf(currentFolder));
    }
    this.rootDir = projectRoot;
    this.logger.log({ data: 'Project root parsed' });
  }

  async extractor() {
    this.logger.log({ data: 'Be patient I`m working...', persist: true });
    if (!this.inputIsFile) {
      await this.extractDirectory();
    }
    else {
      await this.extract();
    }
  }

  private async extractDirectory() {
    this.logger.log({
      data: 'Trying to extract files from dir',
    });
    const files = this.recursiveCheckDirectory(this.selectedPath);
    for await (const path of files) {
      await this.extract({}, path);
    }
    this.logger.log({
      data: 'Extract directory is finished',
    });
  }

  private async extract(imports: ObjectString = {}, file = this.selectedPath) {
    this.logger.log({
      data: ['Trying to parse:', file],
    });

    const filePathInfo = path.parse(file);
    const fileName = path.join(
      this.isWindows ? '' : filePathInfo.root,
      path.basename(filePathInfo.dir),
      filePathInfo.base,
    );
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
      const [, componentName] = useRegex({
        text: line,
        regex: this.REGEX_TEMPLATE_COMPONENT,
      });
      const [, name, path] = useRegex({
        regex: this.REGEX_FILE_IMPORT,
        text: line,
      });
      const [, translationKey] = useRegex({
        regex: this.REGEX_I18N_KEY,
        text: line,
      });

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
    this.logger.log({
      data: ['File were parsed:', file],
    });

    this.checkUnusedImports(file, fileImports);

    if (
      countLines === countIncorrectImport
      || !Object.keys(fileImports).length
    ) {
      this.logger.log({
        data: 'File haven`t imports',
      });
      return;
    }

    const filteredImports = Object.entries(fileImports).filter(([, cPath]) =>
      Object.keys(this.foundedKeys).every(key => !cPath.includes(key)),
    );

    for await (const item of filteredImports) {
      const [, compPath] = item;
      const nextFilePath = this.resolveAlias(compPath);
      if (nextFilePath)
        await this.extract(fileImports, nextFilePath);
    }
  }

  private checkUnusedImports(filePath: string, imports: ObjectString) {
    this.logger.log({
      data: 'Check unused imports',
    });

    const fileContent = readFileSync(filePath).toString();
    const fileImports = [...fileContent.matchAll(this.REGEX_AUTO_IMPORT_FILE)]
      .map(arr => arr[1])
      .flat();
    fileImports.forEach((name) => {
      const countMatches
        = fileContent.match(new RegExp(name, 'g'))?.length ?? 0;
      if (countMatches <= 1)
        delete imports[path.basename(name, '.vue')];
    });
  }

  async reportKeys(allowEmpty = this.config.ALLOW_EMPTY_FILES) {
    this.logger.log({
      data: 'Creating report',
    });
    if (!Object.values(this.foundedKeys).flat().length) {
      this.logger.log({
        data: ['Translation keys not found in or subpaths:', this.selectedPath],
        type: 'error',
        persist: true,
      });
      return;
    }

    const {
      REPORT_FILE_TYPE: fileType,
      REPORT_NAME: reportName,
      REPORT_OUTPUT: outputPath,
    } = this.config;

    const filePath = path.resolve(outputPath, `${reportName}.${fileType}`);

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
        await createObjectCsvWriter({
          header: csvHeaders,
          path: filePath,
        }).writeRecords(
          Object.entries(this.foundedKeys).flatMap(([key, arr]) => {
            return arr.map(i => ({ name: key, key: i }));
          }),
        );
        break;
      case 'json': {
        const sorted = Object.entries(this.foundedKeys)
          .sort((a, b) => b[1].length - a[1].length)
          .filter(([_key, values]) => (allowEmpty ? true : values.length))
          .reduce(
            (_obj, [k, v]) => ({
              ..._obj,
              [k]: [...new Set(v)],
            }),
            {},
          );
        await writeFile(filePath, JSON.stringify(sorted, undefined, 2));
        break;
      }
    }

    this.logger.log({
      data: ['Translation keys is wrote in:', filePath],
      type: 'success',
      persist: true,
    });

    return filePath;
  }

  private async parseAutoImports() {
    this.logger.log({
      data: 'Find auto-imports in the project',
    });
    if (!this.autoImportPath) {
      this.logger.log({
        data: 'Auto-Imported Components not found.',
      });
      return;
    }

    const fileRaw = readFileSync(this.autoImportPath).toString();

    [...fileRaw.matchAll(this.REGEX_AUTO_IMPORT)].forEach((arr) => {
      const [_, name, path] = arr;
      this.autoImports[name] = path;
    });

    this.logger.log({
      data: 'Auto-imports found',
    });
  }
}
