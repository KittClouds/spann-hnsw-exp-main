
import { type SerializedFields, keyToJson, mapKeys } from "./map_keys";

export interface BaseSerialized<T extends string> {
  gn: number;
  type: T;
  id: string[];
  name?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  graph?: Record<string, any>;
}

export interface SerializedConstructor extends BaseSerialized<"constructor"> {
  kwargs: SerializedFields;
}

export interface SerializedSecret extends BaseSerialized<"secret"> {}

export interface SerializedNotImplemented
  extends BaseSerialized<"not_implemented"> {}

export type Serialized =
  | SerializedConstructor
  | SerializedSecret
  | SerializedNotImplemented;

function shallowCopy<T extends object>(obj: T): T {
  return Array.isArray(obj) ? ([...obj] as T) : ({ ...obj } as T);
}

function replaceSecrets(
  root: SerializedFields,
  secretsMap: { [key: string]: string }
): SerializedFields {
  const result = shallowCopy(root);
  for (const [path, secretId] of Object.entries(secretsMap)) {
    const [last, ...partsReverse] = path.split(".").reverse();
    // eslint-disable-next-line @typescript-eslint/no-this-alias, @typescript-eslint/no-explicit-any
    let current: any = result;
    for (const part of partsReverse.reverse()) {
      if (current[part] === undefined) {
        break;
      }
      current[part] = shallowCopy(current[part]);
      current = current[part];
    }
    if (current[last] !== undefined) {
      current[last] = {
        gn: 1,
        type: "secret",
        id: [secretId],
      };
    }
  }
  return result;
}

/**
 * Get a unique name for the module, rather than parent class implementations.
 * Should not be subclassed, subclass gn_name above instead.
 */
export function get_gn_unique_name(
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  serializableClass: typeof Serializable
): string {
  // "super" here would refer to the parent class of Serializable,
  // when we want the parent class of the module actually calling this method.
  const parentClass = Object.getPrototypeOf(serializableClass);
  const gnNameIsSubclassed =
    typeof serializableClass.gn_name === "function" &&
    (typeof parentClass.gn_name !== "function" ||
      serializableClass.gn_name() !== parentClass.gn_name());
  if (gnNameIsSubclassed) {
    return serializableClass.gn_name();
  } else {
    return serializableClass.name;
  }
}

export interface SerializableInterface {
  get gn_id(): string[];
}

export abstract class Serializable implements SerializableInterface {
  gn_serializable = true;

  gn_kwargs: SerializedFields;

  /**
   * A path to the module that contains the class, eg. ["graphion", "graph"]
   * Usually should be the same as the entrypoint the class is exported from.
   */
  abstract gn_namespace: string[];

  /**
   * The name of the serializable. Override to provide an alias or
   * to preserve the serialized module name in minified environments.
   *
   * Implemented as a static method to support loading logic.
   */
  static gn_name(): string {
    return this.name;
  }

  /**
   * The final serialized identifier for the module.
   */
  get gn_id(): string[] {
    return [
      ...this.gn_namespace,
      get_gn_unique_name(this.constructor as typeof Serializable),
    ];
  }

  /**
   * A map of secrets, which will be omitted from serialization.
   * Keys are paths to the secret in constructor args, e.g. "foo.bar.baz".
   * Values are the secret ids, which will be used when deserializing.
   */
  get gn_secrets(): { [key: string]: string } | undefined {
    return undefined;
  }

  /**
   * A map of additional attributes to merge with constructor args.
   * Keys are the attribute names, e.g. "foo".
   * Values are the attribute values, which will be serialized.
   * These attributes need to be accepted by the constructor as arguments.
   */
  get gn_attributes(): SerializedFields | undefined {
    return undefined;
  }

  /**
   * A map of aliases for constructor args.
   * Keys are the attribute names, e.g. "foo".
   * Values are the alias that will replace the key in serialization.
   * This is used to eg. make argument names match Python.
   */
  get gn_aliases(): { [key: string]: string } | undefined {
    return undefined;
  }

  /**
   * A manual list of keys that should be serialized.
   * If not overridden, all fields passed into the constructor will be serialized.
   */
  get gn_serializable_keys(): string[] | undefined {
    return undefined;
  }

  constructor(kwargs?: SerializedFields, ..._args: never[]) {
    if (this.gn_serializable_keys !== undefined) {
      this.gn_kwargs = Object.fromEntries(
        Object.entries(kwargs || {}).filter(([key]) =>
          this.gn_serializable_keys?.includes(key)
        )
      );
    } else {
      this.gn_kwargs = kwargs ?? {};
    }
  }

  toJSON(): Serialized {
    if (!this.gn_serializable) {
      return this.toJSONNotImplemented();
    }
    if (
      // eslint-disable-next-line no-instanceof/no-instanceof
      this.gn_kwargs instanceof Serializable ||
      typeof this.gn_kwargs !== "object" ||
      Array.isArray(this.gn_kwargs)
    ) {
      // We do not support serialization of classes with arg not a POJO
      // I'm aware the check above isn't as strict as it could be
      return this.toJSONNotImplemented();
    }

    const aliases: { [key: string]: string } = {};
    const secrets: { [key: string]: string } = {};
    const kwargs = Object.keys(this.gn_kwargs).reduce((acc, key) => {
      acc[key] = key in this ? this[key as keyof this] : this.gn_kwargs[key];
      return acc;
    }, {} as SerializedFields);
    // get secrets, attributes and aliases from all superclasses
    for (
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      let current = Object.getPrototypeOf(this);
      current;
      current = Object.getPrototypeOf(current)
    ) {
      Object.assign(aliases, Reflect.get(current, "gn_aliases", this));
      Object.assign(secrets, Reflect.get(current, "gn_secrets", this));
      Object.assign(kwargs, Reflect.get(current, "gn_attributes", this));
    }

    // include all secrets used, even if not in kwargs,
    // will be replaced with sentinel value in replaceSecrets
    Object.keys(secrets).forEach((keyPath) => {
      // eslint-disable-next-line @typescript-eslint/no-this-alias, @typescript-eslint/no-explicit-any
      let read: any = this;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let write: any = kwargs;

      const [last, ...partsReverse] = keyPath.split(".").reverse();
      for (const key of partsReverse.reverse()) {
        if (!(key in read) || read[key] === undefined) return;
        if (!(key in write) || write[key] === undefined) {
          if (typeof read[key] === "object" && read[key] != null) {
            write[key] = {};
          } else if (Array.isArray(read[key])) {
            write[key] = [];
          }
        }

        read = read[key];
        write = write[key];
      }

      if (last in read && read[last] !== undefined) {
        write[last] = write[last] || read[last];
      }
    });

    return {
      gn: 1,
      type: "constructor",
      id: this.gn_id,
      kwargs: mapKeys(
        Object.keys(secrets).length ? replaceSecrets(kwargs, secrets) : kwargs,
        keyToJson,
        aliases
      ),
    };
  }

  toJSONNotImplemented(): SerializedNotImplemented {
    return {
      gn: 1,
      type: "not_implemented",
      id: this.gn_id,
    };
  }
}
