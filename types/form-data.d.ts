interface FormData {
  get(name: string): FormDataEntryValue | null;
  getAll(name: string): FormDataEntryValue[];
  has(name: string): boolean;
  set(name: string, value: string | Blob, fileName?: string): void;
  append(name: string, value: string | Blob, fileName?: string): void;
  delete(name: string): void;
  forEach(callbackfn: (value: FormDataEntryValue, key: string, parent: FormData) => void): void;
}

interface FormDataEntryValue {
  toString(): string;
}
