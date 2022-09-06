[![CircleCI](https://dl.circleci.com/status-badge/img/gh/JoseLion/ts-routeways/tree/main.svg?style=shield)](https://dl.circleci.com/status-badge/redirect/gh/JoseLion/ts-routeways/tree/main)
[![npm version](https://badge.fury.io/js/ts-routeways.svg)](https://badge.fury.io/js/ts-routeways)

![Logo](./docs/assets/logo%40128x128.png)

> Lightweight and type-safe! All-in-one solution to define and consume routes

# ts-routeways

## Why?

"Yet another route library?" you might think. In part you're right, there're a lot of libraries out there designed to create routes, in some of them routes are plain, some do allow nesting; some of them have simple-wide types like `any`, and some of them have full type-safety and inference through template literals. However, the reality is that none give you the complete solution.

That is to say, once you have some routes defined, you need to consume them! You want to create URLs from them, taking into account path variables and query parameters, and as well parse a URL into an object, so you can safely use the variables and parameters in the current route. Typically, you'd use a separate library to handle query parameters, and maybe another to parse/build URLs. Wouldn't it be nice if you'd have "one ring to rule them all"? With `ts-routeways` now you can!

Some features of `ts-routeways` include:

🪶 Lightweight implemetation. Zero extra dependencies.

✅ TypeScript optimized. Static check ensures routes are parse/build as they should be.

🍰 Simple API. Allows nesting and spliting into multiple files (useful on bigger apps).

⚙️ Codec based. Parameters are defined with codecs imagination is the limit.
> We provide the most commmon codecs in on single `Codecs` object, which can be extended to add custom codecs of your own.

🔧 Fully agnostic. You can use it with any framework/library, the concepts apply to any web-like router.
> We provide optional hook makers for React, just as a convenience. We're open to add more helpers for other libraries if necessary. PRs and suggestions are always welcome!

## Install

With NPM:

```bash
npm i ts-routeways
```

With Yarn:

```bash
yarn add ts-routeways
```

## Usage

The concept is simple, use the builder to create a `Routeways` instance that contains your custom routes. Then use that instance to access your routes in the same structured way you define them. Each route can make a raw string URL, or parse a URL to consume the parameters on it.

```ts
import { Codecs, Routeways } from "ts-routeways";

export const MainRoutes = Routeways()
  .path({ name: "home", path: "/home" }) // (1)
  .nest({
    name: "users",
    path: "/users",
    subRoutes: Routeways() // (2)
      .path({ name: "view", path: "/view/:userId", pathVars: { userId: Codecs.Number } }) // (3)
      .path({ name "search", path: "/search", queryParams: { byName: Codecs.String, showAll: Codecs.Boolean } }) // (4)
  })
  .build(); // (5)
```

> **(1)** Nothing else required, no path variables in the path.
> <br/>
> **(2)** On `.nest(..)` the `subRoutes` property is required.
> <br/>
> **(3)** A path variable is present in the path (`:userId`). Now `pathVars` is required and it must contain a `userId` property with the codec you prefer.
> <br/>
> **(4)** The `queryParams` property is optional. Use it to define the query parameters the route supports and the codecs to be used on each one. By definition, query parameters are optional in any URL.
> <br/>
> **(5)** Finally, build an instance of your own `Routeways` to use it.

With your `Routeways` defined, you can use them like in the examples below:

```ts
import { MainRoutes } from "./MainRoutes";

MainRoutes.home.makeUrl(); // -> /home
MainRoutes.users.makeUrl(); // -> /users

MainRoutes.users.view.makeUrl({ userId: 3 }); // -> /users/view/3
MainRoutes.users.search.makeUrl(); // -> /users/search (query params are always optional)
MainRoutes.users.search.makeUrl({ byName: "foo", showAll: true }); // -> /users/search?byName=foo&showAll=true

const {
  pathVars: {
    userId, // 3 (number)
  },
} = MainRoutes.users.view.parseUrl("/users/view/3");

const {
  pathVars: {
    byName, // john (string)
  },
  queryParams: {
    showAll, // false (boolean)
  },
} = MainRoutes.users.search.parseUrl("/users/search?byName=john&showAll=false")

// #template: useful for 3rd party routing libraries
MainRoutes.home.template(); // -> /home
MainRoutes.users.view.template(); // -> /users/view/:userId
```

## Custom Codecs

In `ts-routeways` a codec is just an object that defines a decoder and an encoder. These are generic functions, where `T` is the type of the codec:

- **Decoder:** A function that receives a raw `string` value and transforms it into a `T` value.
- **Encoder:** A function that receives a `T` value and transforms it into a raw `string` value.

Let's assume you want to use an awesome UUID library that has its own types, and you want to use those UUIDs in your routes. Here's how you'd add your custom codec:

```ts
// In your application entry point, or before building/exporting your `Routeways` instance(s)

import { UUID } from "my-awesome-uuid-lib";
import { type Codec, addCodec, CodecDecodeError, CodecEncodeError } from "ts-routeways";

const UUIDCodec: Codec<UUID> = {
  decode: text => {
    if (UUID.isValid(text)) {
      return UUID.parse(text);
    }

    throw new CodecDecodeError(`Unable to decode "${text}". The value is not a valid UUID. `);
  },
  encode: value => {
    // the type of `value` is `UUID`, but we check it anyways for the sake of runtime safety.
    if (value instanceof UUID) {
      return value.toString();
    }

    throw new CodecEncodeError(`Unable to encode "${value}". A UUID instance was expected`);
  }
}

// Now add the codec to the `Codecs` object
addCodec("UUID", UUIDCodec);
```

> 🚨 **Important:** Be sure to run the `addCodec(..)` function before you define (or export a definition) of your custom `Routeways`. Otherwise, your definition will not have your custom codecs at the moment of building and you'll get runtime errors.

Now you just need to extend the type definition. Create the file `./typings/ts-routes.d.ts` and add the following:

```ts
import { UUID } from "my-awesome-uuid-lib";
import { type CodecsType, type Codec } from "ts-routeways";

declare module "ts-routeways" {

  export interface CodecsType {
    /**
     * Codec for `UUID` values
     */
    UUID: Codec<UUID>;
  }
}
```

And that's it! Now you can go ahead and use `Codecs.UUID` in your routes definition.

## API Reference

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

## More Examples

- [Usage with React](./docs/ReactExample.md)

## Something's missing?

Suggestions are always welcome! Please create an [issue](https://github.com/JoseLion/ts-routeways/issues/new) describing the request, feature, or bug. We'll try to look into it as soon as possible 🙂

## Contributions

Contributions are very welcome! To do so, please fork this repository and open a Pull Request to the `main` branch.

## License

[MIT License](./LICENSE)

---

_Attribution:_ <a href="https://www.flaticon.com/free-icons/route" title="route icons">Route icon created by Smashicons - Flaticon</a>
