import { match } from "ts-pattern";

import { CodecDecodeError } from "./errors/CodecDecodeError";
import { CodecEncodeError } from "./errors/CodecEncodeError";
import { isValidDate } from "./helpers/commons";

export interface ArrayCodecOptions {
  /**
   * The delimeter character used on the `delimited` format.
   *
   * @default ","
   */
  delimiter?: string;
  /**
   * The format in which the query param array is enconded/decoded. If used on
   * path variables, it only supports the `json` and `csv` formats.
   *
   * The available formats are:
   * - **json:** `?arr=[foo,bar,baz]`
   * - **delimited:** `?arr=foo,bar,baz` (the delimiter char can be changed)
   * - **repeat-key:** `?arr=foo&arr=bar&arr=baz`
   * - **key-square-brackets:** `?arr[]=foo&arr[]=bar&arr[]=baz`
   *
   * **Note:** An empty string (`?arr=`) means an empty array on any format.
   *
   * @default "json"
   */
  format?: "json" | "delimited" | "repeat-key" | "key-square-brackets";
}

export interface DecodeQuery {
  /**
   * The key name of the query parameter under decode.
   */
  key: string;
  /**
   * The raw search string of the URL under decode.
   */
  search: string;
}

export interface Codec<T> {
  /**
   * Decodes a string into a value of type `T`. The second argument is only
   * provided when decoding query parameters.
   *
   * @param text the string to decode into a value
   * @param query an object with information about the query parameters
   * @returns the decoded value
   */
  decode(text: string, query?: DecodeQuery): T;
  /**
   * Encodes a value of type `T` into a string. The second argument is only
   * provided when decoding query parameters.
   *
   * For query params, you can return either a single value or the raw seach
   * string for the key being encoded. If the key is found in the result
   * followed by a `=` symbol, the whole search string will be used instead of
   * just the value.
   *
   * @param value the value to encode as a string
   * @param key the key of the query parameter
   * @returns the encoded string or search string
   */
  encode(value: T, key?: string): string;
}

export interface CodecsType {
  /**
   * Codec for `boolean` values
   */
  Boolean: Codec<boolean>;
  /**
   * Codec for `Date` instances
   */
  Date: Codec<Date>;
  /**
   * Codec for `number` values
   */
  Number: Codec<number>;
  /**
   * Codec for `string` values
   */
  String: Codec<string>;
  /**
   * Creates a codec for any type of array. Arrays are generic so this codec
   * requires another codec to be provided for the array inner type.
   *
   * @example
   * ```
   * Codecs.array(Codec.Number); // -> Codec<number[]>
   * Codecs.array(Codec.String); // -> Codec<string[]>
   * ```
   *
   * @param codec the codec for the array's inner type
   * @param options an object of option to configure the codec
   */
  array<T>(codec: Codec<T>, options?: ArrayCodecOptions): Codec<T[]>;
  /**
   * Transforms the provided codec into a nullable codec. That is to say, it
   * can now encode/decode both the provided codec type and `null`.
   *
   * **Note:** `null` is encoded to literally a "null" string. This can be
   * ambiguious when used with the {@link Codecs.String String Codec}, so keep
   * in mind that `null` always takes precedence when encoding/decoding a
   * "null" string.
   *
   * @example
   * ```
   * Codecs.nullable(Codecs.Date); // Codec<Date | null>;
   * ```
   *
   * @param codec the codec to make nullable
   */
   null<T>(codec: Codec<T>): Codec<T | null>;
  /**
   * Transforms the provided codec into a nullish codec. That is to say, it can
   * now encode/decode both the provided codec type, `null`, and `undefined`.
   *
   * **Note:** `null` and `undefined` are encoded to literally "null" and
   * "undefined" strings respectively. This can be ambiguious when used with
   * the {@link Codecs.String String Codec}, so keep in mind that `null` and
   * `undefined` always take precedence when encoding/decoding a "null" or
   * "undefined" string.
   *
   * @example
   * ```
   * Codecs.nullish(Codecs.String); // Codec<string | null | undefined>;
   * ```
   *
   * @param codec the codec to make nullish
   */
  nullish<T>(codec: Codec<T>): Codec<T | null | undefined>;
  /**
   * Creates a codec for a specific set of numbers as literals.
   *
   * @example
   * ```
   * type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
   *
   * // Constraints the values to `Weekdays`
   * Codecs.numberLiteral<Weekday>(1, 2, 3, 4, 5, 6, 7);
   *
   * // Infers the type from the provided values
   * Codes.numberLiteral(2, 4, 6, 8, 10);
   * ```
   * @param literals the number literal for the specific codec
   */
  numberLiteral<T extends number>(...literals: T[]): Codec<T>;
  /**
   * Creates a codec for a specific set of string as literals.
   *
   * @example
   * ```
   * type Fruit = "apple" | "grape" | "melon";
   *
   * // Constraints the values to `Fruit`
   * Codecs.stringLiteral<Fruit>("apple", "grape", "melon");
   *
   * // Infers the type from the provided values
   * Codecs.stringLiteral("Jan", "Feb", "Mar", "Apr");
   * ```
   *
   * @param literals the string literals for the specific codec
   */
  stringLiteral<T extends string>(...literals: T[]): Codec<T>;
  /**
   * Transforms the provided codec into an undefined codec. That is to say, it
   * can now encode/decode both the provided codec type and `undefined`.
   *
   * **Note:** `undefined` is encoded to literally an "undefined" string. This
   * can be ambiguious when used with the {@link Codecs.String String Codec},
   * so keep in mind that `undefined` always takes precedence when
   * encoding/decoding an "undefined" string.
   *
   * @example
   * ```
   * Codecs.undefined(Codecs.Boolean); // Codec<boolean | undefined>;
   * ```
   *
   * @param codec the codec to make undefined
   */
  undefined<T>(codec: Codec<T>): Codec<T | undefined>;
}

/**
 * An object that provides easy access to all codecs
 */
export const Codecs: Readonly<CodecsType> = {
  Boolean: {
    decode: text => {
      switch (text) {
        case "true": return true;
        case "false": return false;
      }

      throw new CodecDecodeError(`Boolean values must be "true" or "false". Got "${text}" instead`);
    },
    encode: value => {
      if (typeof value === "boolean") {
        return String(value);
      }

      throw new CodecEncodeError(`Unable to encode "${value}". A boolean value was expected`);
    },
  },
  Date: {
    decode: text => {
      const date = new Date(text);

      if (isValidDate(date)) {
        return date;
      }

      throw new CodecDecodeError(`Date values must have a ISO or RFC2822 format. Got "${text}" instead`);
    },
    encode: value => {
      if (value instanceof Date && isValidDate(value)) {
        return value.toISOString();
      }

      throw new CodecEncodeError(`Unable to encode "${value}". A Date instance was expected`);
    },
  },
  Number: {
    decode: text => {
      const numValue = Number(text);

      if (text !== "" && !isNaN(numValue)) {
        return numValue;
      }

      throw new CodecDecodeError(`Number values must be numeric only. Got "${text}" instead`);
    },
    encode: value => {
      if (typeof value === "number") {
        return String(value);
      }

      throw new CodecEncodeError(`Unable to encode "${value}". A number value was expected`);
    },
  },
  String: {
    decode: text => text,
    encode: value => {
      if (typeof value === "string") {
        return value;
      }

      throw new CodecEncodeError(`Unable to encode "${value}". A string value was expected`);
    },
  },
  array(codec, options = { }) {
    const { delimiter = ",", format = "json" } = options;
    const unsupported = new CodecDecodeError(`The "${format}" format is only supported on query paramaters`);

    return {
      decode: (text, query) => {
        if (text === "" && query === undefined) {
          return [];
        }

        return match(format)
          .with("delimited", () => text.split(delimiter).map(value => codec.decode(value)))
          .with("json", () => {
            if (text.startsWith("[") && text.endsWith("]")) {
              const normalized = text.slice(1, text.length - 1);
              return normalized.split(",").map(value => codec.decode(value));
            }

            throw new CodecDecodeError("Invalid array format! Expected values to be on square brackets");
          })
          .with("key-square-brackets", () => {
            if (query !== undefined) {
              const url = new URL(`http://localhost${query.search}`);
              return url.searchParams
                .getAll(`${query.key}[]`)
                .map(value => codec.decode(value));
            }

            throw unsupported;
          })
          .with("repeat-key", () => {
            if (query !== undefined) {
              const url = new URL(`http://localhost${query.search}`);
              return url.searchParams
                .getAll(query.key)
                .map(value => codec.decode(value));
            }

            throw unsupported;
          })
          .exhaustive();
      },
      encode: (value, key) => {
        if (Array.isArray(value)) {
          if (value.length === 0) {
            return "";
          }

          const array = value.map(val => codec.encode(val));

          return match(format)
            .with("delimited", () => array.join(delimiter))
            .with("json", () => `[${array.join(",")}]`)
            .with("key-square-brackets", () => array.map(val => `${key}[]=${val}`).join("&"))
            .with("repeat-key", () => array.map(val => `${key}=${val}`).join("&"))
            .exhaustive();
        }

        throw new CodecEncodeError(`Unable to encode "${value}". An array value was expected`);
      },
    };
  },
  null(codec) {
    return {
      decode: text => text === "null" ? null : codec.decode(text),
      encode: value => value === null ? "null" : codec.encode(value),
    };
  },
  nullish(codec) {
    return this.null(this.undefined(codec));
  },
  numberLiteral(...literals) {
    return {
      decode: text => {
        const decoded = this.Number.decode(text);
        const isLiteral = (num: number): num is typeof literals[number] => {
          return literals.map(Number).includes(num);
        };

        if (isLiteral(decoded)) {
          return decoded;
        }

        throw new CodecDecodeError(`Literal value must be one of "[${literals.join(", ")}]". Got "${text}" instead`);
      },
      encode: value => {
        if (literals.includes(value)) {
          return this.Number.encode(value);
        }

        throw new CodecEncodeError(
          `Unable to encode "${value}". A literal value of "[${literals.join(", ")}]" was expected`
        );
      },
    };
  },
  stringLiteral(...literals) {
    return {
      decode: text => {
        const isLiteral = (str: string): str is typeof literals[number] => {
          return literals.map(String).includes(str);
        };

        if (isLiteral(text)) {
          return text;
        }

        throw new CodecDecodeError(`Literal value must be one of "[${literals.join(", ")}]". Got "${text}" instead`);
      },
      encode: value => {
        if (literals.includes(value)) {
          return value;
        }

        throw new CodecEncodeError(
          `Unable to encode "${value}". A literal value of "[${literals.join(", ")}]" was expected`
        );
      },
    };
  },
  undefined(codec) {
    return {
      decode: text => text === "undefined" ? undefined : codec.decode(text),
      encode: value => value === undefined ? "undefined" : codec.encode(value),
    };
  },
};

/**
 * Extends the {@link Codecs} object to and custom codecs to it. This is just a
 * convenience to have all codecs in one place and avoid rexporting an extended
 * Codecs object.
 *
 * @param name the name of the new codec
 * @param codec a codec or a function that returns a codec
 */
export function addCodec<T>(name: string, codec: Codec<T> | ((...args: any[]) => Codec<T>)): void {
  Object.defineProperty(Codecs, name, { value: codec });
}
