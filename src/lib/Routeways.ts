import {
  CodecsOf,
  PathLike,
  RouteParams,
} from "./commons.types";
import { UrlParserError } from "./errors/UrlParserError";
import { safeKeys } from "./helpers/commons";

type PathVarsCapture<P extends PathLike> =
  P extends `${string}/:${infer P1}/${string}:${infer P2}`
    ? P1 | PathVarsCapture<`/:${P2}`>
    : P extends `${string}/:${infer P3}/${string}`
      ? P3
      : P extends `${string}/:${infer P4}`
        ? P4
        : never;

type MakeUrl<V extends Record<string, unknown>, Q extends Record<string, unknown>> =
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
  V extends Record<string, unknown> = Record<never, unknown>,
  Q extends Record<string, unknown> = Record<never, unknown>,
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
    pathVars: CodecsOf<V>;
    /**
     * A record of the query parameters configuration. The key refers to the
     * name of the query parameters and the value is the specific codec for the
     * parameter.
     */
    queryParams: CodecsOf<Q>;
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
    pathVars: V;
    queryParams: Partial<Q>;
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

type ResultSubRoutes<B extends RoutewaysBuilder<Record<string, Routeway>>, V extends Record<string, unknown>> =
  B extends RoutewaysBuilder<infer M>
    ? M extends Record<string, Routeway>
      ? { [K in keyof M]: GetResultRoute<M[K], V>; }
      : never
    : never;

type GetResultRoute<S extends Routeway, V1 extends Record<string, unknown>> =
  S extends Routeway<infer G, infer V2, infer Q, infer SR>
    ? Routeway<
        G,
        { [K in keyof (V1 & V2)]: (V1 & V2)[K]; },
        Q,
        { [K in keyof SR]: GetResultRoute<SR[K], { [K2 in keyof (V1 & V2)]: (V1 & V2)[K2] }>; }
      >
    : never;

type PathConfig<
  N extends string,
  P extends PathLike,
  V extends { [K in PathVarsCapture<P>]: V[K] },
  Q extends Record<string, unknown>,
> = PathVarsCapture<P> extends never
      ? { name: N; path: P; queryParams?: CodecsOf<Q>; }
      : { name: N; path: P; pathVars: CodecsOf<V>; queryParams?: CodecsOf<Q>; };

type NestConfig<
  N extends string,
  P extends PathLike,
  V extends { [K in PathVarsCapture<P>]: V[K] },
  Q extends Record<string, unknown>,
  S extends RoutewaysBuilder<Record<string, Routeway>>,
> = PathVarsCapture<P> extends never
      ? { name: N; path: P; queryParams?: CodecsOf<Q>; subRoutes: S; }
      : { name: N; path: P; pathVars: CodecsOf<V>; queryParams?: CodecsOf<Q>; subRoutes: S; };

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
    V extends { [K in PathVarsCapture<P>]: V[K] },
    Q extends Record<string, unknown>,
  >(
    config: PathConfig<N, P, V, Q>,
  ): RoutewaysBuilder<{ [K in keyof M]: M[K]; } & { [K in N]: Routeway<P, V, Q>; }> {
    const { name, path, pathVars, queryParams = { } as CodecsOf<Q> } = "pathVars" in config
      ? config
      : { ...config, pathVars: { } as CodecsOf<V> };

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
          pathVars: { } as V,
          queryParams: { } as Q,
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
    V extends { [K in PathVarsCapture<P>]: V[K] },
    Q extends Record<string, unknown>,
    S extends RoutewaysBuilder<DefinedSubRoutes<S>>,
  >(
    config: NestConfig<N, P, V, Q, S>,
  ): RoutewaysBuilder<{ [K in keyof M]: M[K] } & { [K in N]: Routeway<P, V, Q, ResultSubRoutes<S, V>> }> {
    const { name, path, pathVars, queryParams = { } as CodecsOf<Q>, subRoutes } = "pathVars" in config
      ? config
      : { ...config, pathVars: { } as CodecsOf<V> };
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
        pathVars: { } as V,
        queryParams: { } as Q,
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
    return safeKeys(this.routes).reduce((acc, key) => {
      const route = this.routes[key];

      if (route !== undefined) {
        return {
          ...acc,
          [key]: injectParentData(route),
        };
      }

      return acc;
    }, { } as M);
  }
}

function injectParentData<
  R extends Routeway<PathLike, V, Q, S>,
  S extends Record<string, Routeway> = Record<never, never>,
  V extends Record<string, unknown> = Record<never, unknown>,
  Q extends Record<string, unknown> = Record<never, unknown>,
>(
  route: R,
  path = "",
  pathVars: CodecsOf<V> = { } as CodecsOf<V>,
): R {
  const routeConfig = route.$config();
  const fullPath = `${path}${route.template()}`;
  const allPathVars = { ...pathVars, ...routeConfig.pathVars };

  return safeKeys(route)
    .reduce((acc, routeName) => {
      const subRoute = route[routeName];

      return {
        ...acc,
        $config: () => ({
          ...routeConfig,
          pathVars: allPathVars,
        }),
        makeUrl: (params?: RouteParams<V, Q>): string => {
          if (params === undefined) {
            return fullPath;
          }

          const queryKeys = safeKeys(routeConfig.queryParams).filter(key => safeKeys(params).includes(key));
          const queryParams = queryKeys.reduce<string>((search, key) => {
            const codec = routeConfig.queryParams[key];
            const paramValue = params[key] as Q[Extract<keyof Q, string>];

            if (codec !== undefined && paramValue !== undefined) {
              const encodedValue = codec.encode(paramValue, key);
              const joinChar: string = search === "?" ? "" : "&";

              return encodedValue.includes(`${key}=`)
                ? `${search}${joinChar}${encodeURI(encodedValue)}`
                : `${search}${joinChar}${key}=${encodeURIComponent(encodedValue)}`;
            }

            return search;
          }, "?");
          const baseUrl = safeKeys(allPathVars)
            .reduce((url, key) => {
              const paramValue = params[key];
              const codec = allPathVars[key];
              const encoded = codec.encode(paramValue);

              return url.replaceAll(`:${String(key)}`, encoded);
            }, fullPath);

          return `${baseUrl}${queryKeys.length > 0 ? queryParams : ""}`;
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
              pathVars: safeKeys(allPathVars)
                .reduce((params, key) => {
                  const templateIndex = templateChunks.indexOf(`:${String(key)}`);
                  const pathVar = pathnameChunks[templateIndex];

                  return pathVar !== undefined
                    ? { ...params, [key]: allPathVars[key].decode(pathVar) }
                    : params;
                }, { } as V),
              queryParams: safeKeys(routeConfig.queryParams)
                .reduce((params, key) => {
                  const codec = routeConfig.queryParams[key];
                  const first = url.searchParams.get(`${key}`);
                  const { search } = url;

                  if (first && codec) {
                    return {
                      ...params,
                      [key]: codec.decode(first, { key, search }),
                    };
                  }

                  return params;
                }, { } as Q),
            };
          }

          throw new UrlParserError(`Unable to parse "${uri}". The url does not match the template "${fullPath}"`);
        },
        [routeName]: isRouteway<V, Q, S>(subRoute)
          ? injectParentData(subRoute, fullPath, allPathVars)
          : subRoute,
        template: () => fullPath,
      };
    }, { } as R);
}

function isRouteway<
  V extends Record<string, unknown>,
  Q extends Record<string, unknown>,
  S extends Record<string, Routeway>,
>(value: unknown): value is Routeway<PathLike, V, Q, S> {
  return typeof value !== "function";
}
