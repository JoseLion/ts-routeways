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

export function makePathVarsHook(getLocation: () => LocationLike): PathVarsHook {
  return route => {
    const { hash, pathname, search } = getLocation();

    return useMemo(() => {
      const { pathVars } = route.parseUrl(pathname.concat(hash, search));

      return pathVars;
    }, []);
  };
}

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

export function makeGotToHook(getNavigate: () => NavigateFn): GotToHook {
  return (route, options) => {
    const navigate = getNavigate();

    return (...params) => () => {
      const url = route.makeUrl(...params);
      navigate(url, options);
    };
  };
}
