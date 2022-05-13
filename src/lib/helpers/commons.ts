export function safeKeys<K extends keyof any>(obj: Record<K, unknown>): Array<K> {
  return Object.keys(obj) as Array<K>;
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
