export function safeKeys<T extends object>(obj: T): Extract<keyof T, string>[] {
  const keys = Object.keys(obj).filter(key => key in obj);

  return keys as Extract<keyof T, string>[];
}

export function mapValues<T extends object>(obj: T, mapper: <K extends keyof T>(value: T[K], key: K) => T[K]): T {
  return safeKeys(obj)
    .reduce((acc, key) => ({
      ...acc,
      [key]: mapper(obj[key], key),
    }), obj);
}

export function isValidDate(date: Date): boolean {
  return !isNaN(date.getTime());
}
