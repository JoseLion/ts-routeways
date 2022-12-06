import { Codec } from "./Codecs";
import { Routeway } from "./Routeways";

/**
 * Defines the type of path, which is any string that starts with a `/` char.
 */
export type PathLike = `/${string}`;

/**
 * Transform a record of codecs to a record based on the types of each codec.
 */
export type CodecsToRecord<T extends Record<string, Codec<unknown>>> = {
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
  V extends Record<string, Codec<unknown>>,
  Q extends Record<string, Codec<unknown>>,
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
  T extends Routeway<PathLike, Record<string, Codec<unknown>>, infer Q, Record<never, Routeway>>
    ? Partial<CodecsToRecord<Q>>
    : never;
