# Usage with React

As mentioned in the main documentation, `ts-routeways` is an agnostic solution, so you should be able to integrate it with React in the way it works better for you. However, here we show a quick example on how it can be used with a React application that uses React Router v6.

## Define your router

As mentioned in the documentation, let's first define a custom `Routeway` instance.

```ts
export const MainRoutes = Routeways()
  .path({ name: "home", path: "/home" })
  .nest({
    name: "users",
    path: "/users",
    subRoutes: Routeways()
      .path({ name: "view", path: "/view/:userId", pathVars: { userId: Codecs.Number } })
      .path({ name "search", path: "/search", queryParams: { byName: Codecs.String, showAll: Codecs.Boolean } })
      .path({
        name: "edit",
        path: "/edit/:userId",
        pathVars: { userId: Codecs.Number },
        queryParams: { autosave: Codecs.Boolean }
      })
  })
  .build();
```

## Integration with React Router v6

Now you can use the `MainRoutes` instance in the router. Use the `.template()` method 

```tsx
import { Route, Routes } from "react-router";

import { MainRoutes } from "./MainRoutes";

export function MainNavigator(): ReactElement {

  return (
    <Routes>
      <Route path={MainRoutes.home.template()} component={Home} />
      <Route path={MainRoutes.users.template()} component={Users}>
        <Route path={MainRoutes.users.view.template()} component={ViewUser} />
        <Route path={MainRoutes.users.search.template()} component={SearchUser} />
      </Routes>
    </Routes>
  )
} 
```

## Create your custom hooks

You can also create some custom hooks based on React Router v6 hooks. These are just convenience abstractions that allow easy navigation, usage of query parameter(s) as React state, etc.

```ts
import { useLocation, useNavigate } from "react-router";
import {
  makeGotToHook,
  makeNavigatorHook,
  makePathVarsHook,
  makeQueryParamHook,
  makeRouteParamsHook
} from "ts-routeways";

import { MainRoutes } from ".MainRoutes";

export const useGoTo = makeGotToHook(useNavigate);

export const useMainNavigator = makeNavigatorHook(MainRoutes, useNavigate);

export const usePathVars = makePathVarsHook(useLocation);

export const useQueryParam = makeQueryParamHook(useLocation, useNavigate);

export const useAllQueryParams = makeAllQueryParamsHook(useLocation, useNavigate);

export const useRouteParams = makeRouteParamsHook(useLocation, useNavigate);
```

Below you can find a more comprehensive description of what each hook maker does.

### makeGotToHook(..)

Creates a hook that expects a `Routeways` route and returns a "goTo" function. I.e., a function that can be used as a callback or event handler.

```tsx
const goToViewUser = useGoTo(MainRoutes.users.viewUser);

// ...

<button onClick={goToViewUser({ userId: 3 })}>See User</button>
```

### makeNavigatorHook(..)

Creates a hook that returns a "Navigator" of your custom routes. This provides a more natural experience when imperative navigation is required.

```tsx
const Navigator = useMainNavigator();

useEffect(() => {
  if (!canViewUser) {
    Navigator.home.navigate();
  }
}, [canViewUser]);
```

### makePathVarsHook(..)

Creates a hook that expects a `Routeways` route and returns an object with its path variables parsed from the current location.

```tsx
const { userId } = usePathVars(MainRoutes.users.viewUser);

useEffect(() => {
  getUserById(userId)
    .then(user => setUser(user));
    .catch(err => /* ... */);
}, []);
```

### makeQueryParamHook

Creates a hook that expects a `Routeways` route and the key of one of the possible query parameters of that route. Then it returns a React state of that query parameter. Whenever the state of the parameter is changed, navigation is executed to change the query parameter in the source too.

```tsx
const [byName, setByName] = useQueryParam(MainRoutes.users.search, "byName");

// ...

<input type="search" onChange={setByName} value={byName} />
```

### makeAllQueryParamsHook

Creates a hook that expects a `Routeways` route and returns a React state of those query parameters. Whenever the state of the parameter is changed, a navigation is executed to change the query parameters in the source too.

```tsx
const { queryParams, setQueryParams } = useAllQueryParams(MainRoutes.users.search);

const handleStatusChange = (status: Status): void => {
  setQueryParams(prev => ({
    ...prev,
    status,
    page: 1
  }));
}

// ...

<>
  <Select
    options={statuses}
    selected={queryParams.status}
    onChange={handleStatusChange}
  >

  <Pagination page={queryParams.page}>
</>
```

### makeRouteParamsHook(..)

Creates a hook that expects a `Routeways` route and returns an object with all the path variables and query parameters as states. That is to say, it returns a `pathVars` state object along with its `setPathVars` function, as well as a `queryParams` state object and its `setQueryParams` function.

**Note:** This hook should be used in concrete complex situations where using all parameters as a single state is required. Keep in mind that a change on a single query parameter, for example, will cause a rerender on anything using the other query parameters. A `setPathVars` is not provided, though, because it's not very common to change a path variable and expect to stay in the same view. Something should change, so it's better to use a navigator in this specific scenario.

```tsx
const { pathVars, queryParams, setQueryParams } = useRouteParams(MainRoutes.users.edit);

const toggleAutosave = (): void => {
  setQueryParams(prev => { ...prev, autosave: !prev.autosave });
};

useEffect(() -> {
  getUserById(pathVars.userId)
    .then(user => setUser(user));
    .catch(err => /* ... */);
}, [pathVars.userId]);

// ...

<input type="checkbox" onChange={toggleAutosave} value={queryParams.autosave}>
```
