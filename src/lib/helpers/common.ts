import { Codec } from "../Codecs";
import { Routeway } from "../Routeways";

/**
 * Base structure of codec definitions. Useful for generic constraints.
 */
export type CodecMap = Record<string, Codec<unknown>>;

/**
 * Defines the type of path, which is any string that starts with a `/` char.
 */
export type PathLike = `/${string}`;

/**
 * Transform a record of codecs to a record based on the types of each codec.
 */
export type CodecsToRecord<T extends CodecMap> = {
  [K in keyof T]: T[K] extends Codec<infer V>
    ? V
    : never;
};

/**
 * Merges the path variables and query parameter in a single object.
 *
 * @param V the record type of the path variables
 * @param Q the record type of the query parameters
 */
export type RouteParams<
  V extends CodecMap,
  Q extends CodecMap,
> = CodecsToRecord<V> & Partial<CodecsToRecord<Q>>;

/**
 * Infers the query parameters type of a route.
 *
 * @example
 * ```
 * type UsersQueryParams = InferQueryParams<typeof MainRoutes.home.users>;
 * //   ^ type = { search?: string; page?: number; }
 * ```
 *
 * @param T the type of the route to make the infer
 */
export type InferQueryParams<T extends Routeway> =
  T extends Routeway<PathLike, CodecMap, infer Q, Record<never, Routeway>>
    ? Partial<CodecsToRecord<Q>>
    : never;

export function safeKeys<T extends object>(obj: T): Extract<keyof T, string>[] {
  const keys = Object.keys(obj).filter(key => key in obj);

  return keys as Extract<keyof T, string>[];
}

export function isValidDate(date: Date): boolean {
  return !isNaN(date.getTime());
}
