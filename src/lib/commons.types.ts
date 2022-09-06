import { Codec } from "./Codecs";

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
