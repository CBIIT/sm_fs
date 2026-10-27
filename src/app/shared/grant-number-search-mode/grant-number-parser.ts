export const MAX_GRANT_NUMBER_COUNT = 1000;

export function parseGrantNumbers(value: string): string[] {
  return value.split(/[,\s]+/).filter((grantNumber) => grantNumber.length > 0);
}
