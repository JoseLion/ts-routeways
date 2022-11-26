import {
  AnyCodec,
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
    ? Record<never, never>
    : Record<PathVarsCapture<P>, AnyCodec>;

type MakeUrl<V extends ParamsConfig, Q extends ParamsConfig> =
  keyof V extends never
    ? {
        /**
         * Creates a raw string URL for the route using the provided parameters.
         *
         * @param params the parameters used to build the route
         * @returns the built URL of the route
         */
        makeUrl(params?: RouteParams<V, Q>): string;
      }
    : {
        /**
         * Creates a raw string URL for the route using the provided parameters.
         *
         * @param params the parameters used to build the route
         * @returns the built URL of the route
         */
        makeUrl(params: RouteParams<V, Q>): string;
      };

export type Routeway<
  P extends PathLike = PathLike,
  V extends ParamsConfig = Record<never, never>,
  Q extends ParamsConfig = Record<never, never>,
  S extends Record<string, Routeway> = Record<never, never>,
> = MakeUrl<V, Q> & {
  /**
   * Convenience method that returns the configuration of the route.
   *
   * @returns an object with all the configuration of the route
   */
  $config(): {
    /**
     * A record of the path variables configuration. The key refers to the name
     * of the path variable and the value is the specific codec for the
     * variable.
     */
    pathVars: V;
    /**
     * A record of the query parameters configuration. The key refers to the
     * name of the query parameters and the value is the specific codec for the
     * parameter.
     */
    queryParams: Q;
    /**
     * The template of this route segment. Differently from the `.template()`
     * method, this property does not contain the template of the full path,
     * but only of the specific route.
     */
    segment: P;
    /**
     * A record of the nested `Routeway` instances of the route (if any).
     */
    subRoutes: S;
  };
  /**
   * Parse a raw URL to get the path variables and query parameters from it.
   *
   * @param uri the raw URL to parse the params from
   * @returns an object with the parsed path variables and query parameters
   */
  parseUrl(uri: string): {
    pathVars: CodecToPathVars<V>;
    queryParams: CodecToQueryParams<Q>;
  };
  /**
   * Creates the complete template of the route. Useful when working with other
   * routing libraries that need the context of the path with its variables.
   *
   * @returns the route template
   */
  template(): string;
} & S;

type DefinedSubRoutes<B extends RoutewaysBuilder<Record<string, Routeway>>> =
  B extends RoutewaysBuilder<infer M>
    ? M extends Record<string, Routeway>
      ? { [K in keyof M]: GetDefinedRoute<M[K]> }
      : never
    : never;

type GetDefinedRoute<S extends Routeway> =
  S extends Routeway<infer P, infer V, infer Q, infer SR>
    ? Routeway<P, V, Q, { [K in keyof SR]: GetDefinedRoute<SR[K]> }>
    : never;

type ResultSubRoutes<B extends RoutewaysBuilder<Record<string, Routeway>>, V extends ParamsConfig> =
  B extends RoutewaysBuilder<infer M>
    ? M extends Record<string, Routeway>
      ? { [K in keyof M]: GetResultRoute<M[K], V>; }
      : never
    : never;

type GetResultRoute<S extends Routeway, V extends ParamsConfig> =
  S extends Routeway<infer G, infer PV, infer Q, infer SR>
    ? Routeway<G, V & PV, Q, { [K in keyof SR]: GetResultRoute<SR[K], V & PV>; }>
    : never;

type PathConfig<
  N extends string,
  P extends PathLike,
  V extends PathVars<P>,
  Q extends ParamsConfig,
> = PathVarsCapture<P> extends never
      ? { name: N; path: P; queryParams?: Q; }
      : { name: N; path: P; pathVars: V; queryParams?: Q; };

type NestConfig<
  N extends string,
  P extends PathLike,
  V extends PathVars<P>,
  Q extends ParamsConfig,
  S extends RoutewaysBuilder<Record<string, Routeway>>,
> = PathVarsCapture<P> extends never
      ? { name: N; path: P; queryParams?: Q; subRoutes: S; }
      : { name: N; path: P; pathVars: V; queryParams?: Q; subRoutes: S; };

/**
 * The Routeways builder API.
 */
export class RoutewaysBuilder<M extends Record<string, Routeway>> {

  private readonly routes: M;

  public constructor(routes: M) {
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

    return new RoutewaysBuilder({
      ...this.routes,
      [name]: {
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
      },
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
    S extends RoutewaysBuilder<DefinedSubRoutes<S>>,
  >(
    config: NestConfig<N, P, V, Q, S>,
  ): RoutewaysBuilder<{ [K in keyof M]: M[K] } & { [K in N]: Routeway<P, V, Q, ResultSubRoutes<S, V>> }> {
    const { name, path, pathVars, queryParams = { } as Q, subRoutes } = "pathVars" in config
      ? config
      : { ...config, pathVars: { } as V };
    const subRouteRecord = subRoutes.routes as ResultSubRoutes<S, V>;

    const newRoute: Routeway<P, V, Q, ResultSubRoutes<S, V>> = {
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
   * Builds the routes defined by the API and returns a `Routeways` instance
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  R extends Routeway<PathLike, V, Q, Record<string, Routeway<PathLike, ParamsConfig, ParamsConfig, any>>>,
>(
  route: R,
  path = "",
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
        $config: () => ({
          ...routeConfig,
          pathVars: allPathVars,
        }),
        makeUrl: (params?: RouteParams<V, Q>): string => {
          const paramKeys = safeKeys(params ?? { } as RouteParams<V, Q>);
          const queryKeys = paramKeys.filter(key => key in routeConfig.queryParams);
          const queryParams = queryKeys.reduce<string>((search, key) => {
            const codec = routeConfig.queryParams[key];
            const paramValue = params?.[key];

            if (codec && paramValue !== undefined) {
              const encodedValue = codec.encode(paramValue, key);
              const joinChar: string = search === "?" ? "" : "&";

              return encodedValue.includes(`${key}=`)
                ? `${search}${joinChar}${encodeURI(encodedValue)}`
                : `${search}${joinChar}${key}=${encodeURIComponent(encodedValue)}`;
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
                const templateIndex = templateChunks.indexOf(`:${String(key)}`);
                const pathVar = pathnameChunks[templateIndex]!;

                return codec.decode(pathVar) as V[typeof key];
              }),
              queryParams: safeKeys(routeConfig.queryParams)
                .reduce((params, key) => {
                  const codec = routeConfig.queryParams[key];
                  const first = url.searchParams.get(`${key}`);
                  const { search } = url;

                  if (first && codec) {
                    return {
                      ...params,
                      [key]: codec.decode(first, { key, search }) as Q[typeof key],
                    };
                  }

                  return params;
                }, { }),
            };
          }

          throw new UrlParserError(`Unable to parse "${uri}". The url does not match the template "${fullPath}"`);
        },
        [routeName]: typeof routeProp !== "function"
          ? injectParentData(routeProp, fullPath, allPathVars)
          : routeProp,
        template: () => fullPath,
      };
    }, { } as R);
}
