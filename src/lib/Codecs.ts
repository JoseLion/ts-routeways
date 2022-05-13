import dedent from "@cometlib/dedent";

import { CodecDecodeError } from "./errors/CodecDecodeError";
import { CodecEncodeError } from "./errors/CodecEncodeError";
import { isValidDate } from "./helpers/commons";

export interface Codec<T> {
  /**
   * Decodes a string into a value of type `T`.
   *
   * @param text the string to decode into a value
   */
  decode(text: string): T;
  /**
   * Encodes a value of type `T` into a string.
   *
   * @param value the value to encode as a string
   */
  encode(value: T): string;
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
   */
  array<T>(codec: Codec<T>): Codec<T[]>;
  /**
   * Creates a codec for a specific set of numbers as literals.
   *
   * @example
   * ```
   * type Weekdays = 1 | 2 | 3 | 4 | 5 | 6 | 7;
   *
   * Codecs.numberLiteral<Weekdays>(1, 2, 3, 4, 5, 6, 7); // Constraints the values to `Weekdays`
   *
   * Codes.numberLiteral(2, 4, 6, 8, 10); // Infers the type from the provided values
   * ```
   * @param literals the number literal for the specific codec
   */
  numberLiteral<T extends number>(...literals: T[]): Codec<T>;
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
   * Creates a codec for a specific set of string as literals.
   *
   * @example
   * ```
   * type Fruit = "apple" | "grape" | "melon";
   *
   * Codecs.stringLiteral<Fruit>("apple", "grape", "melon"); // Constraints the values to `Fruit`
   *
   * Codecs.stringLiteral("Jan", "Feb", "Mar", "Apr"); Infers the type from the provided values
   * ```
   *
   * @param literals the string literals for the specific codec
   */
  stringLiteral<T extends string>(...literals: T[]): Codec<T>;
  /**
   * Transforms the provided codec into an undefined codec. That is to say, it can
   * now encode/decode both the provided codec type and `undefined`.
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
  array(codec) {
    return {
      decode: text => {
        if (text === "") {
          return [];
        }

        if (text.startsWith("[") && text.endsWith("]")) {
          const normalized = text.slice(1, text.length - 1);

          return normalized.split(",").map(codec.decode);
        }

        throw new CodecDecodeError(dedent`
          Array values must be either an empty string (for empty arrays) or be \
          surrounded by square brackets "[...]". Got "${text}" instead
        `);
      },
      encode: value => {
        if (Array.isArray(value)) {
          return value.length
            ? `[${value.map(codec.encode).join(",")}]`
            : "";
        }

        throw new CodecEncodeError(`Unable to encode "${value}". An array value was expected`);
      },
    };
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

        throw new CodecEncodeError(`Unable to encode "${value}". A literal value of "[${literals.join(", ")}]" was expected`);
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

        throw new CodecEncodeError(`Unable to encode "${value}". A literal value of "[${literals.join(", ")}]" was expected`);
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
