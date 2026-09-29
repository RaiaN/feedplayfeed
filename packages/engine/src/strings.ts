export type StringTable = Readonly<Record<string, string>>;

export interface Strings {
  /** Look up a key and fill `{name}` placeholders. Unknown keys return the key itself, so gaps show up in QA. */
  t(key: string, vars?: Readonly<Record<string, string | number>>): string;
  has(key: string): boolean;
}

export function createStrings(table: StringTable): Strings {
  return {
    t(key, vars) {
      const raw = table[key];
      if (raw === undefined) return key;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
    },
    has: (key) => key in table,
  };
}
