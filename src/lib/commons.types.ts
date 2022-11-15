import { Codec } from "./Codecs";
import { Routeway } from "./Routeways";

export type PathLike = `/${string}`;

export type ParamsConfig = Record<string, Codec<any>>;

export type CodecToPathVars<V extends ParamsConfig> =
  V extends Record<infer N, Codec<any>>
    ? { [K in N]: V[K] extends Codec<infer T> ? T : never; }
    : never;

export type CodecToQueryParams<Q extends ParamsConfig> =
  Q extends Record<infer N, Codec<any>>
    ? { [K in N]?: Q[K] extends Codec<infer T> ? T : never; }
    : never;

export type RouteParams<
  V extends ParamsConfig,
  Q extends ParamsConfig,
> = CodecToPathVars<V> & CodecToQueryParams<Q>;

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
  T extends Routeway<PathLike, ParamsConfig, infer Q, Record<any, any>>
    ? CodecToQueryParams<Q>
    : never;
