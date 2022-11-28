export function safeKeys<T extends object>(obj: T): Extract<keyof T, string>[] {
  const keys = Object.keys(obj).filter(key => key in obj);

  return keys as Extract<keyof T, string>[];
}

export function isValidDate(date: Date): boolean {
  return !isNaN(date.getTime());
}
