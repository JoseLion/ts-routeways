import { Codec } from "./Codecs";
import { Routeway } from "./Routeways";

/**
 * Defines the type of path, which is any string that starts with a `/` char.
 */
export type PathLike = `/${string}`;

/**
 * Defines a record of codecs based on the types of another record.
 *
 * @param T the record type to define the codecs
 */
export type CodecsOf<T extends Record<string, unknown>> = { [K in keyof T]: Codec<T[K]> };

/**
 * Merges the path variables and query parameter in a single object.
 *
 * @param V the record type of the path variables
 * @param Q the record type of the query parameters
 */
export type RouteParams<
  V extends Record<string, unknown>,
  Q extends Record<string, unknown>,
> = V & Partial<Q>;

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
  T extends Routeway<PathLike, Record<string, unknown>, infer Q, Record<never, Routeway>>
    ? Partial<Q>
    : never;
