import type { UseRegexParams } from './types';

export function useRegex({ text, regex, global = false }: UseRegexParams) {
  if (!global) regex.lastIndex = 0;
  return regex.exec(text) ?? [];
}

export async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
