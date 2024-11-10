import type { LoggerFnParams } from './types';
import { rmSync } from 'node:fs';
import { exists, readFile, writeFile } from 'node:fs/promises';
import { consola } from 'consola';

export class ExtractorLogger {
  private enable = false;
  private readonly logName = 'extractor.log';

  constructor(state: boolean) {
    this.enable = state;

    if (state)
      rmSync(this.logName, { force: true });
  }

  log(params: LoggerFnParams) {
    const { data, type = 'info', persist = false } = params;
    if (this.enable || persist) {
      const logMsg = this.buildLogMsg({ data, type, persist });
      consola[type](logMsg);
      if (!persist)
        this.writeLog(logMsg);
    }
  }

  private buildLogMsg({ data, type, persist }: Required<LoggerFnParams>) {
    const correctData = Array.isArray(data) ? data.join(' ') : data;
    const logInfo = this.parseInfo();
    const funcText = logInfo ? `FN: ${logInfo}() | ` : '';
    const defaultMsg = `${funcText}DEBUG: ${correctData}`;
    return `[${type.toUpperCase()}] ${persist ? correctData : defaultMsg}`;
  }

  private parseInfo() {
    const trace = new Error('info')?.stack ?? '';
    const fnNames = [...trace.matchAll(/at\s([a-zA-Z]+)/g)]
      .map(arr => arr[1])
      .flat();
    return fnNames.length > 4 ? fnNames[fnNames.length - 2] : undefined;
  }

  private async writeLog(raw: string) {
    const isLogExist = await exists(this.logName);
    const content = isLogExist ? await readFile(this.logName, 'utf-8') : raw;
    await writeFile(this.logName, `${content}\n${raw}`, 'utf-8');
  }
}
