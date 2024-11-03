export type ReportType = 'csv' | 'json';

export interface ConfigExtractor {
  // change if you have custom auto imports for components
  AUTO_IMPORT_DECLARATION_NAME: string;
  // same as AUTO_IMPORT_DECLARATION_NAME but full path
  AUTO_IMPORT_DECLARATION_PATH: string;
  // provide if you have alias for imports
  TSCONFIG_PATH: string;

  REPORT_FILE_TYPE: ReportType;
  REPORT_NAME: string;
  REPORT_OUTPUT: string;

  // allow empties in report file
  ALLOW_EMPTY_FILES: boolean;
}

export interface UseRegexParams {
  regex: RegExp;
  text: string;
  global?: boolean;
}

type ObjectOf<ObjectType> = Record<string, ObjectType>;

export type ObjectString = ObjectOf<string>;

export type ObjectStringArray = ObjectOf<string[]>;
