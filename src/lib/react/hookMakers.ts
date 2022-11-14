import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";

import {
  CodecToPathVars,
  CodecToQueryParams,
  ParamsConfig,
  PathLike,
  RouteParams,
} from "../commons.types";
import { safeKeys } from "../helpers/commons";
import { Routeway } from "../Routeways";

type PathVarsNavConfig<V extends ParamsConfig, Q extends ParamsConfig> = RouteParams<V, Q> & {
  replace?: boolean,
};

type RouteParamsHook = <V extends ParamsConfig, Q extends ParamsConfig>(route: Routeway<PathLike, V, Q>) => {
  pathVars: CodecToPathVars<V>;
  queryParams: CodecToQueryParams<Q>;
  setQueryParams: Dispatch<SetStateAction<CodecToQueryParams<Q>>>;
};

type PathVarsHook = <V extends ParamsConfig>(route: Routeway<PathLike, V>) => CodecToPathVars<V>;

type QueryParamHook = <
  Q extends ParamsConfig,
  K extends keyof CodecToQueryParams<Q>
>(route: Routeway<PathLike, ParamsConfig, Q>, key: K) => [
  CodecToQueryParams<Q>[K],
  Dispatch<SetStateAction<CodecToQueryParams<Q>[K]>>
];

type AllQueryParamsHook = <Q extends ParamsConfig>(route: Routeway<PathLike, ParamsConfig, Q>) => {
  queryParams: CodecToQueryParams<Q>,
  setQueryParams: Dispatch<SetStateAction<CodecToQueryParams<Q>>>;
};

interface NavigateOptions {
  replace?: boolean;
}

type NavigateFn = (to: string, options?: NavigateOptions) => void;

interface LocationLike {
  hash: string;
  pathname: string;
  search: string;
}

type NavigateMethods<V extends ParamsConfig, Q extends ParamsConfig> =
  keyof V extends never
    ? {
      navigate(params?: RouteParams<V, Q>): void;
      replace(params?: RouteParams<V, Q>): void;
    }
    : {
      navigate(params: PathVarsNavConfig<V, Q>): void;
      replace(params: PathVarsNavConfig<V, Q>): void;
    };

type NavigatorHook<T extends Record<string, Routeway>> =
  T extends Record<string, Routeway>
    ? { [K in keyof T]: T[K] extends Routeway<any, infer V, infer Q, infer S>
          ? keyof S extends never
            ? NavigateMethods<V, Q>
            : NavigatorHook<S> & NavigateMethods<V, Q>
          : never
      }
    : never;

type GotToHook = <S extends Routeway>(route: S, options?: NavigateOptions) =>
  (...params: Parameters<S["makeUrl"]>) => () => void;

/**
 * Creates a hook that expects a `Routeways` route and returns a "goTo"
 * function. I.e. a function that can be used as a callback, or event handler.
 *
 * @param getNavigate a function or hook that provideds a navigation function
 * @returns a hook top create callback-like "goTo" functions of a route
 */
export function makeGotToHook(getNavigate: () => NavigateFn): GotToHook {
  return (route, options) => {
    const navigate = getNavigate();

    return (...params) => () => {
      const url = route.makeUrl(...params);
      navigate(url, options);
    };
  };
}

/**
 * Creates a hook that returns a "Navigator" of your custom routes. This
 * provides a more natural experience when imperative navigation is required.
 *
 * @param routes the custom `Routeways` routes
 * @param getNavigate a function or hook that provideds a navigation function
 * @returns a navigation hook of the custom `Routeways` routes
 */
export function makeNavigatorHook<T extends Record<string, Routeway>>(
  routes: T,
  getNavigate: () => NavigateFn,
): () => NavigatorHook<T> {
  return () => {
    const navigateFn = getNavigate();
    const routesAsNavigator = <S extends Record<string, Routeway>>(routeMap: S): NavigatorHook<S> =>
      safeKeys(routeMap).reduce((acc, key) => {
        const route = routeMap[key];

        if (route !== undefined) {
          return {
            ...acc,
            [key]: {
              ...routesAsNavigator(route.$config().subRoutes),
              navigate(params) {
                navigateFn(
                  route.makeUrl(params),
                  { replace: false },
                );
              },
              replace(params) {
                navigateFn(
                  route.makeUrl(params),
                  { replace: true },
                );
              },
            },
          };
        }

        return acc;
      }, { } as NavigatorHook<S>);

    return routesAsNavigator(routes);
  };
}

/**
 * Creates a hook that expects a `Routeways` route and returns an object with
 * its path variables parsed from the current location.
 *
 * @param getLocation a function or hook that provides a location-like object
 * @returns a hook to consume the path variables of a route
 */
export function makePathVarsHook(getLocation: () => LocationLike): PathVarsHook {
  return route => {
    const { hash, pathname, search } = getLocation();

    return useMemo(() => {
      const { pathVars } = route.parseUrl(pathname.concat(hash, search));

      return pathVars;
    }, []);
  };
}

/**
 * Creates a hook that expects a `Routeways` route and the key of one of the
 * possible query parameters of that route. It returns then a React state of
 * that query parameter. Whenever the state of the parameter is changed, a
 * navigation is executed to change the query parameter in the source too.
 *
 * @param getLocation a function or hook that provides a location-like object
 * @param getNavigate a function or hook that provideds a navigation function
 * @returns a hook to manage a query parameter of a route
 */
export function makeQueryParamHook(getLocation: () => LocationLike, getNavigate: () => NavigateFn): QueryParamHook {
  return (route, key) => {
    const navigateFn = getNavigate();
    const { hash, pathname, search } = getLocation();

    const [queryParam, setQueryParam] = useState(() => route.parseUrl(pathname.concat(hash, search)).queryParams[key]);

    useEffect(() => {
      const { pathVars, queryParams } = route.parseUrl(pathname.concat(hash, search));

      navigateFn(route.makeUrl({
        ...pathVars,
        ...queryParams,
        [key]: queryParam,
      }));
    }, [queryParam]);

    return [queryParam, setQueryParam];
  };
}

/**
 * Creates a hook that expects a `Routeways` route and returns a React state of
 * those query parameters. Whenever the state of the parameter is changed, a
 * navigation is executed to change the query parameters in the source too.
 *
 * @param getLocation a function or hook that provides a location-like object
 * @param getNavigate a function or hook that provideds a navigation function
 * @returns a hook to manage all query parameters of a route
 */
export function makeAllQueryParamsHook(
  getLocation: () => LocationLike,
  getNavigate: () => NavigateFn,
): AllQueryParamsHook {
  return route => {
    const navigateFn = getNavigate();

    const { hash, pathname, search } = getLocation();

    const [queryParams, setQueryParams] = useState(() => route.parseUrl(pathname.concat(hash, search)).queryParams);

    useEffect(() => {
      const { pathVars } = route.parseUrl(pathname.concat(hash, search));
      const url = route.makeUrl({ ...pathVars, ...queryParams });

      navigateFn(url);
    }, [queryParams]);

    return { queryParams, setQueryParams };
  };
}

/**
 * Creates a hook that expects a `Routeways` route and returns an object with
 * all the path variables and query paramaters as states. That is to say, it
 * returns a `pathVars` state object along with its `setPathVars` function; as
 * well as a `queryParams` state object and its `setQueryParams` function.
 *
 * **Note:** This hook should be used on concrete complex situations where
 * using all parameters as a single state is required. Keep in mind that a
 * change on a single query parameter, for example, will cause a rerender on
 * anything using the other query parameters. A `setPathVars` is not provided
 * though because it's not very common to change a path variable and expect to
 * stay in the same view, something should change so it's better to use a
 * navigator in this specific scenarion.
 *
 * @param getLocation a function or hook that provides a location-like object
 * @param getNavigate a function or hook that provideds a navigation function
 * @returns a hook to manage all path variables and query parameters of a route
 */
export function makeRouteParamsHook(getLocation: () => LocationLike, getNavigate: () => NavigateFn): RouteParamsHook {
  return route => {
    const navigateFn = getNavigate();
    const { hash, pathname, search } = getLocation();

    const [queryParams, setQueryParams] = useState(() => route.parseUrl(pathname.concat(hash, search)).queryParams);

    const pathVars = useMemo(() => {
      const url = route.parseUrl(pathname.concat(hash, search));

      return url.pathVars;
    }, []);

    useEffect(() => {
      const url = route.makeUrl({ ...pathVars, ...queryParams });

      navigateFn(url);
    }, [queryParams]);

    return {
      pathVars,
      queryParams,
      setQueryParams,
    };
  };
}
