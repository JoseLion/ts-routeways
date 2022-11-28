import { Codec } from "./Codecs";
import { Routeway } from "./Routeways";

export type PathLike = `/${string}`;

export type CodecsOf<T extends Record<string, unknown>> = { [K in keyof T]: Codec<T[K]> };

export type RouteParams<
  V extends Record<string, unknown>,
  Q extends Record<string, unknown>,
> = V & Partial<Q>;

/**
 * Infers the `queryParams` type of a route.
 *
 * @example
 * ```
 * type UsersQueryParams = InferQueryParams<typeof MainRoutes.home.users>;
 * //   ^ type = { search?: string; page?: number; }
 * ```
 */
export type InferQueryParams<T extends Routeway> =
  T extends Routeway<PathLike, Record<string, unknown>, infer Q, Record<never, Routeway>>
    ? Q
    : never;
