import { Codec } from "./Codecs";
import {
  CodecToPathVars,
  CodecToQueryParams,
  ParamsConfig,
  PathLike,
  RouteParams,
} from "./commons.types";
import { UrlParserError } from "./errors/UrlParserError";
import { mapValues, safeKeys } from "./helpers/commons";

type PathVarsCapture<P extends PathLike> =
  P extends `${string}/:${infer P1}/${string}:${infer P2}`
    ? P1 | PathVarsCapture<`/:${P2}`>
    : P extends `${string}/:${infer P3}/${string}`
      ? P3
      : P extends `${string}/:${infer P4}`
        ? P4
        : never;

type PathVars<P extends PathLike> =
  PathVarsCapture<P> extends never
    ? { }
    : Record<PathVarsCapture<P>, Codec<any>>;

type MakeUrl<V extends ParamsConfig, Q extends ParamsConfig> =
  keyof V extends never
    ? { makeUrl(params?: RouteParams<V, Q>): string; }
    : { makeUrl(params: RouteParams<V, Q>): string; };

export type Routeway<
  P extends PathLike = PathLike,
  V extends ParamsConfig = { },
  Q extends ParamsConfig = { },
  S extends Record<string, Routeway> = { },
> = MakeUrl<V, Q> & {
  $config(): {
    pathVars: V;
    queryParams: Q;
    segment: P;
    subRoutes: S;
  };
  parseUrl(uri: string): {
    pathVars: CodecToPathVars<V>;
    queryParams: CodecToQueryParams<Q>;
  };
  template(): string;
} & S;

type MakeSubRoutes<B extends RoutewaysBuilder<any>, V extends ParamsConfig> =
  B extends RoutewaysBuilder<infer M>
    ? M extends Record<infer N, Routeway>
      ? { [K in N]: RecurseSubRoute<M[K], V>; }
      : never
    : never;

type RecurseSubRoute<S extends Routeway, V extends ParamsConfig> =
  S extends Routeway
    ? Routeway<
        ReturnType<S["$config"]>["segment"],
        { [K in keyof (V & ReturnType<S["$config"]>["pathVars"])]: (V & ReturnType<S["$config"]>["pathVars"])[K]; },
        ReturnType<S["$config"]>["queryParams"],
        S extends Routeway<any, infer PV, any, infer SR>
          ? { [K in keyof SR]: RecurseSubRoute<SR[K], { [N in keyof (V & PV)]: (V & PV)[N] }>; }
          : { }
      >
    : never;

type PathConfig<
  N extends string,
  P extends PathLike,
  V extends PathVars<P>,
  Q extends ParamsConfig,
> = PathVarsCapture<P> extends never
      ? { name: N; path: P; queryParams?: Q; }
      : { name: N; path: P; queryParams?: Q; pathVars: V; };

type NestConfig<
  N extends string,
  P extends PathLike,
  V extends PathVars<P>,
  Q extends ParamsConfig,
  S extends RoutewaysBuilder<any>,
> = PathVarsCapture<P> extends never
      ? { name: N; path: P; queryParams?: Q; subRoutes: S; }
      : { name: N; path: P; queryParams?: Q; pathVars: V; subRoutes: S; };

/**
 * The Routeways builder API.
 */
export class RoutewaysBuilder<M extends Record<string, Routeway>> {

  private readonly routes: M;

  constructor(routes: M) {
    this.routes = routes;

    this.path = this.path.bind(this);
    this.nest = this.nest.bind(this);
    this.build = this.build.bind(this);
  }

  /**
   * Create a single path on the route under construction. Single paths do not
   * allow nesting and can be considered the latest point of a branch in the
   * router.
   *
   * If you need to nest routes use {@link RoutewaysBuilder.nest() .nest(..)}
   * instead.
   *
   * @param config a configuration object for the route
   * @returns the Routeways instance to continue building
   */
  public path<
    N extends string,
    P extends PathLike,
    V extends PathVars<P>,
    Q extends ParamsConfig,
  >(
    config: PathConfig<N, P, V, Q>,
  ): RoutewaysBuilder<{ [K in keyof M]: M[K]; } & { [K in N]: Routeway<P, V, Q>; }> {
    const { name, path, pathVars, queryParams = { } as Q } = "pathVars" in config
      ? config
      : { ...config, pathVars: { } as V };

    const newRoute: Routeway<P, V, Q> = {
      $config: () => ({
        pathVars,
        queryParams,
        segment: path,
        subRoutes: { },
      }),
      makeUrl: () => path,
      parseUrl: () => ({
        pathVars: { } as CodecToPathVars<V>,
        queryParams: { } as CodecToQueryParams<Q>,
      }),
      template: () => path,
    };

    return new RoutewaysBuilder({
      ...this.routes,
      [name]: newRoute,
    });
  }

  /**
   * Create a path on the route under construction that allows creating nested
   * routes under it. The `subRoutes` are required in this method, if you need
   * to create a terminal route, use {@link RoutewaysBuilder.path() .path(..)}
   * instead.
   *
   * @param config a configuration object for the route
   * @returns the Routeways instance to continue building
   */
  public nest<
    N extends string,
    P extends PathLike,
    V extends PathVars<P>,
    Q extends ParamsConfig,
    S extends RoutewaysBuilder<{ }>,
  >(
    config: NestConfig<N, P, V, Q, S>,
  ): RoutewaysBuilder<{ [K in keyof M]: M[K] } & { [K in N]: Routeway<P, V, Q, MakeSubRoutes<S, V>> }> {
    const { name, path, pathVars, queryParams = { } as Q, subRoutes } = "pathVars" in config
      ? config
      : { ...config, pathVars: { } as V };
    const subRouteRecord = subRoutes.routes as MakeSubRoutes<S, V>;

    const newRoute: Routeway<P, V, Q, MakeSubRoutes<S, V>> = {
      $config: () => ({
        pathVars,
        queryParams,
        segment: path,
        subRoutes: subRouteRecord,
      }),
      makeUrl: () => "",
      parseUrl: () => ({
        pathVars: { } as CodecToPathVars<V>,
        queryParams: { } as CodecToQueryParams<Q>,
      }),
      template: () => path,
      ...subRouteRecord,
    };

    return new RoutewaysBuilder({
      ...this.routes,
      [name]: newRoute,
    });
  }

  /**
   * Builds the routes defined by the API and returns an `Routeways` instance
   * shaped by the names of the paths.
   *
   * @returns the built `Routeways` instance
   */
  public build(): M {
    return mapValues(
      this.routes,
      route => injectParentData(route),
    );
  }
}

function injectParentData<
  V extends ParamsConfig,
  Q extends ParamsConfig,
  R extends Routeway<any, V, Q, Record<string, Routeway<any, any, any, any>>>
>(
  route: R,
  path: string = "",
  pathVars: V = { } as V,
): R {
  return safeKeys(route)
    .reduce((acc, routeName) => {
      const routeConfig = route.$config();
      const routeProp = route[routeName];
      const fullPath = `${path}${route.template()}`;
      const allPathVars = { ...pathVars, ...routeConfig.pathVars };

      return {
        ...acc,
        [routeName]: typeof routeProp !== "function"
          ? injectParentData(routeProp, fullPath, allPathVars)
          : routeProp,
        $config: () => ({
          ...routeConfig,
          pathVars: allPathVars,
        }),
        makeUrl: (params?: RouteParams<V, Q>): string => {
          const paramKeys = safeKeys(params ?? { });
          const queryKeys = paramKeys.filter(key => key in routeConfig.queryParams);
          const queryParams = queryKeys.reduce<string>((search, key) => {
            const codec = routeConfig.queryParams[key];
            const paramValue = params?.[key];

            if (codec && paramValue !== undefined) {
              const encodedValue = codec.encode(paramValue);
              const joinChar: string = search === "?" ? "" : "&";

              return `${search}${joinChar}${key}=${encodeURIComponent(encodedValue)}`;
            }

            return search;
          }, "?");

          return paramKeys
            .filter(key => key in allPathVars)
            .reduce((url, key) => {
              const encoded = allPathVars[key]?.encode(params?.[key]);

              return url.replaceAll(`:${String(key)}`, String(encoded));
            }, fullPath)
            .concat(queryKeys.length > 0 ? queryParams : "");
        },
        parseUrl: uri => {
          const url = new URL(uri.startsWith("http") ? uri : `http://localhost${uri}`);
          const pathnameChunks = url.pathname.split("/");
          const templateChunks = fullPath.split("/");
          const allChuncksMatch = templateChunks.every((chunck, i) =>
            pathnameChunks[i] === chunck || chunck.startsWith(":"),
          );

          if (pathnameChunks.length === templateChunks.length && allChuncksMatch) {
            return {
              pathVars: mapValues(allPathVars, (codec, key) => {
                const templateIndex = templateChunks.indexOf(`:${key}`);
                const pathVar = pathnameChunks[templateIndex]!;

                return codec.decode(pathVar);
              }),
              queryParams: safeKeys(routeConfig.queryParams)
                .reduce((params, key) => {
                  const codec = routeConfig.queryParams[key];
                  const [head, ...rest] = url.searchParams.getAll(`${key}`);

                  if (head && codec) {
                    return {
                      ...params,
                      [key]: codec.decode(
                        rest.length > 0
                          ? `[${[head, ...rest].join(",")}]`
                          : head,
                      ),
                    };
                  }

                  return params;
                }, { }),
            };
          }

          throw new UrlParserError(`Unable to parse "${uri}". The url does not match the template "${fullPath}"`);
        },
        template: () => fullPath,
      };
    }, { } as R);
}
