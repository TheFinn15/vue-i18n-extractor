export function useRegex(regex: RegExp, text: string) {
  regex.lastIndex = 0;
  return regex.exec(text) ?? [];
}

export async function delay(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms));
}
