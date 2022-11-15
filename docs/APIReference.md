# API Reference

The entry point to the API would be the `Routeways()` function. This is a convenience constructor that takes no arguments and returns a `RoutewaysBuilder` so you can start defining your routes:

```ts
function Routeways(): RoutewaysBuilder;
```

Then, the `RoutewaysBuilder` instance provides the following methods: 

| Method | Description |
| ------ | ----------- |
| `.path(config: PathConfig): RoutewaysBuilder` | Create a single path on the route under construction. Single paths do not allow nesting and can be considered the latest point of a branch in the router. Returns the same builder instance to continue the route definition. |
| `.nest(config: NestConfig): RoutewaysBuilder` | Create a path on the route under construction that allows creation of nested routes under it. Returns the same builder instance to continue the route definition. |
| `.build(): Record<string, Routeway>` | Builds the routes defined by the API and returns a `Routeways` instance shaped by the names of the paths. |

Keep in mind that both `PathConfig` and `NestConfig` are complex, generic, conditional types. For the sake of the API reference, here's a simplified version of their type definition:

```ts
type PathConfig = {
  name: string;
  path: PathLike;
  queryParams?: ParamsConfig;
  pathVars: PathVars; // Not always required, it depends on what `path` looks like
}

type NestConfig = {
  name: string;
  path: PathLike;
  queryParams?: ParamsConfig;
  pathVars: PathVars; // Not always required, it depends on what `path` looks like
  subRoutes: RoutewaysBuilder; // another builders instance to create the nested routes
}
```

Once you have a `Routeways` instance, these are the methods available on each of your routes:

| Method | Description |
| ------ | ----------- |
| `.$config(): RouteConfig` | Convenience method that returns the configuration of the route. See the section below for details on the `RouteConfig` object. |
| `.makeUrl(params: RouteParams): string` | Creates a raw string URL for the route using the provided parameters. Keep in mind that `params` is not always required, depending on the route, if it had path variables or not.
| `.parseUrl(uri: string): { pathVars: PathVars; queryParams: QueryParams; }` | Parse a raw URL to get the path variables and query parameters from it. |
| `.template(): string` | Creates the complete template of the route. Useful when working with other routing libraries that need the context of the path with its variables. |

Finally, the `RouteConfig` object represents the configuration of the route and has the following properties:

| Property | Type | Description |
| -------- | ---- | ----------- |
| pathVars | `Record<string, Codec>` | A record of the path variables configuration. The key refers to the name of the path variable and the value is the specific codec for the variable. |
| queryParams | `Record<string, Codec>` | A record of the query parameters configuration. The key refers to the name of the query parameters and the value is the specific codec for the parameter. |
| segment | `PathLike` | The template of this route segment. Differently from the `.template()` method, this property does not contain the template of the full path, but only of the specific route. |
| subRoutes | `Record<string, Routeway>` | A record of the nested `Routeway` instances of the route (if any). |
