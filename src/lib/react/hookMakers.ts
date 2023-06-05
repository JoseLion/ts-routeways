import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";

import { Routeway } from "../Routeways";
import { CodecMap, CodecsToRecord, PathLike, RouteParams, safeKeys } from "../helpers/common";

type RouteParamsHook = <
  V extends CodecMap,
  Q extends CodecMap,
>(route: Routeway<PathLike, V, Q>) => {
  pathVars: CodecsToRecord<V>;
  queryParams: Partial<CodecsToRecord<Q>>;
  setQueryParams: Dispatch<SetStateAction<Partial<CodecsToRecord<Q>>>>;
};

type PathVarsHook = <V extends CodecMap>(route: Routeway<PathLike, V>) => CodecsToRecord<V>;

interface QueryParamHook {
  /**
   * Make a state out of the query parameters of an specific route. The codecs
   * in that route are used to encode/decode the query string. Changing the
   * state of the query param updates the query string in the current path.
   *
   * @param route the route to use for the query params
   * @param key the key of the specific query param
   * @returns a React state and dispatcher tuple of the query param
   */
  <Q extends CodecMap, K extends keyof Q>(
    route: Routeway<PathLike, CodecMap, Q>,
    key: K,
  ): [
    Partial<CodecsToRecord<Q>>[K],
    Dispatch<SetStateAction<Partial<CodecsToRecord<Q>>[K]>>,
  ];
  /**
   * Make a state out of the query parameters of an specific route. The codecs
   * in that route are used to encode/decode the query string. Changing the
   * state of the query param updates the query string in the current path.
   *
   * @param route the route to use for the query params
   * @param key the key of the specific query param
   * @param fallback a value to fall back if the query param is `undefined`
   * @returns a React state and dispatcher tuple of the query param
   */
  <Q extends CodecMap, K extends keyof Q>(
    route: Routeway<PathLike, CodecMap, Q>,
    key: K,
    fallback: NonNullable<Partial<CodecsToRecord<Q>>[K]>,
  ): [
    CodecsToRecord<Q>[K],
    Dispatch<SetStateAction<NonNullable<CodecsToRecord<Q>[K]>>>,
  ];
}

type AllQueryParamsHook = <Q extends CodecMap>(
  route: Routeway<PathLike, CodecMap, Q>
) => {
  queryParams: Partial<CodecsToRecord<Q>>;
  setQueryParams: Dispatch<SetStateAction<Partial<CodecsToRecord<Q>>>>;
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

type NavigateMethods<
  V extends CodecMap,
  Q extends CodecMap,
> = keyof V extends never
      ? {
          navigate(params?: RouteParams<V, Q>): void;
          replace(params?: RouteParams<V, Q>): void;
        }
      : {
          navigate(params: RouteParams<V, Q>): void;
          replace(params: RouteParams<V, Q>): void;
        };

type NavigatorHook<T extends Record<string, Routeway>> =
  T extends Record<string, Routeway>
    ? { [K in keyof T]: T[K] extends Routeway<PathLike, infer V, infer Q, infer S>
          ? keyof S extends never
            ? NavigateMethods<V, Q>
            : NavigatorHook<S> & NavigateMethods<V, Q>
          : never
      }
    : never;

type GoToHook = <S extends Routeway>(route: S, options?: NavigateOptions) =>
  (...params: Parameters<S["makeUrl"]>) => () => void;

/**
 * Creates a hook that expects a `Routeways` route and returns a "goTo"
 * function. I.e. a function that can be used as a callback, or event handler.
 *
 * @param getNavigate a function or hook that provideds a navigation function
 * @returns a hook top create callback-like "goTo" functions of a route
 *
 * @deprecated in favour of {@link https://www.npmjs.com/package/react-routeways react-routeways} package
 */
export function makeGotToHook(getNavigate: () => NavigateFn): GoToHook {
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
 *
 * @deprecated in favour of {@link https://www.npmjs.com/package/react-routeways react-routeways} package
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
 *
 * @deprecated in favour of {@link https://www.npmjs.com/package/react-routeways react-routeways} package
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
 *
 * @deprecated in favour of {@link https://www.npmjs.com/package/react-routeways react-routeways} package
 */
export function makeQueryParamHook(getLocation: () => LocationLike, getNavigate: () => NavigateFn): QueryParamHook {
  return ((route, key, fallback) => {
    const navigateFn = getNavigate();
    const { hash, pathname, search } = getLocation();

    const [queryParam, setQueryParam] = useState(() => {
      const url = pathname.concat(hash, search);
      const param = route.parseUrl(url).queryParams[key];

      return param ?? fallback;
    });

    useEffect(() => {
      const { pathVars, queryParams } = route.parseUrl(pathname.concat(hash, search));
      const url = route.makeUrl({
        ...pathVars,
        ...queryParams,
        [key]: queryParam,
      });

      navigateFn(url);
    }, [queryParam]);

    return [queryParam, setQueryParam];
  }) as QueryParamHook;
}

/**
 * Creates a hook that expects a `Routeways` route and returns a React state of
 * those query parameters. Whenever the state of the parameter is changed, a
 * navigation is executed to change the query parameters in the source too.
 *
 * @param getLocation a function or hook that provides a location-like object
 * @param getNavigate a function or hook that provideds a navigation function
 * @returns a hook to manage all query parameters of a route
 *
 * @deprecated in favour of {@link https://www.npmjs.com/package/react-routeways react-routeways} package
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
 *
 * @deprecated in favour of {@link https://www.npmjs.com/package/react-routeways react-routeways} package
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
