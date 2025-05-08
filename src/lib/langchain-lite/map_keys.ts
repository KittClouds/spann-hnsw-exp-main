
// A simplified version of the map_keys utility for serialization

export type SerializedFields = Record<string, unknown>;

/**
 * Convert a key from camelCase to snake_case.
 */
export function keyToJson(key: string): string {
  return key.replace(/([A-Z])/g, "_$1").toLowerCase();
}

/**
 * Map object keys according to the provided function.
 */
export function mapKeys(
  obj: SerializedFields,
  func: (key: string) => string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aliases?: Record<string, string>
): SerializedFields {
  // If aliases is provided, use it to map keys
  if (aliases) {
    for (const [key, value] of Object.entries(aliases)) {
      if (key in obj) {
        obj[value] = obj[key];
        delete obj[key];
      }
    }
  }

  // Map keys using the provided function
  const mapped: SerializedFields = {};
  for (const [key, value] of Object.entries(obj)) {
    mapped[func(key)] = value;
  }

  return mapped;
}
