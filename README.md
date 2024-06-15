[![CI](https://github.com/JoseLion/ts-routeways/actions/workflows/ci.yml/badge.svg)](https://github.com/JoseLion/ts-routeways/actions/workflows/ci.yml)
[![CodeQL](https://github.com/JoseLion/ts-routeways/actions/workflows/codeql.yml/badge.svg)](https://github.com/JoseLion/ts-routeways/actions/workflows/codeql.yml)
[![Pages](https://github.com/JoseLion/ts-routeways/actions/workflows/pages.yml/badge.svg)](https://github.com/JoseLion/ts-routeways/actions/workflows/pages.yml)
[![Release](https://github.com/JoseLion/ts-routeways/actions/workflows/release.yml/badge.svg)](https://github.com/JoseLion/ts-routeways/actions/workflows/release.yml)
[![NPM version](https://img.shields.io/npm/v/ts-routeways?logo=npm)](https://www.npmjs.com/package/ts-routeways)
[![NPM bundle size](https://img.shields.io/bundlephobia/min/ts-routeways)](https://www.npmjs.com/package/ts-routeways)
[![NPM downloads](https://img.shields.io/npm/dm/ts-routeways)](https://www.npmjs.com/package/ts-routeways)
[![NPM license](https://img.shields.io/npm/l/ts-routeways)](https://github.com/JoseLion/ts-routeways/blob/main/LICENSE)
[![GitHub Release Date](https://img.shields.io/github/release-date/JoseLion/ts-routeways)](https://github.com/JoseLion/ts-routeways/releases)
[![Known Vulnerabilities](https://snyk.io/test/github/JoseLion/ts-routeways/badge.svg)](https://snyk.io/test/github/JoseLion/ts-routeways)

![Logo](./docs/assets/logo%40128x128.png)

> Lightweight and type-safe! All-in-one solution to define and consume routes

# ts-routeways

## Why?

"Yet another route library?" you might think. In part you're right, there are a lot of libraries out there designed to create routes, some of them routes are plain, some do allow nesting; some of them have simple-wide types like `any`, and some of them have full type-safety and inference through template literals. However, the reality is that none give you the complete solution.

That is to say, once you have some routes defined, you need to consume them! You want to create URLs from them, taking into account path variables and query parameters, and as well parse a URL into an object, so you can safely use the variables and parameters in the current route. Typically, you'd use a separate library to handle query parameters, and maybe another to parse/build URLs. Wouldn't it be nice if you'd have "one ring to rule them all"? With `ts-routeways` now you can!

Some features of `ts-routeways` include:

🪶 Lightweight implementation. Zero extra dependencies.

✅ TypeScript optimized. Static check ensures routes are parsed/built as they should be.

🍰 Simple API. Allows nesting and splitting into multiple files (useful on bigger apps).

⚙️ Codec based. Parameters are defined with codecs imagination is the limit.
> We provide the most commmon codecs in on single `Codecs` object, which can be extended to add custom codecs of your own.

🔧 Fully agnostic. You can use it with any framework/library, the concepts apply to any web-like router.

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

Only the most basic data types are provided by the `Codecs` helper. Sometimes you'll find yourself in need of a more complex codec, some specific data type, or a serializable class instance. With `ts-routeways`, you can use custom codecs, and also use its extension mechanism for the `Codecs` helper, so you can have all your codecs in one place. You need only to create an object containing a `decode` and an `encode` method:
```ts
interface Codec<T> {
  decode(text: string): T;
  encode(value: T): string;
}
```

Optionally, add your codec to the `Codecs` helper. Also, extend the `CodecsType` interface to add the types:
```ts
declare module "ts-routeways" {

  export interface CodecsType {
    UUID: Codec<UUID>;
  }
}

const UUIDCodec = { /* ... */ };

addCodec("UUID", UUIDCodec);

Codecs.UUID // Ready to use on a router
```

You can find more details and a complete example of custom codecs in the link below:

[Custom Codecs ⚙️](./docs/CustomCodecs.md)

## Getting your QueryParam types back

Sometimes you'd like to use the queryParam types that are already defined in your router somewhere else. For instance, in the argument of the function in charge of making a request with those query parameters. This could be a very common pattern, let's assume we have `MainRoutes` as presented in the [Usage section](#usage) and an API that receives `byName` and `showAll` query params.

**Not so safe, isn't it?**
```ts
export function searchUsers(params: any): Promise<User[]> {
//                                  ^ What am I supposed to use here?
  return axios.get<User[]>("/api/users", { params })
    .then(({ data }) => data);
}
```

Instead, you can infer the type of the query params of any route using the types helper `InferQueryParams<R>`, where `R` is the type of your route:

**This is better!**
```ts
import { InferQueryParams } from "ts-routeways";

type UsersQueryParams = InferQueryParams<typeof MainRoutes.users.search>;
//   ^ type = { byName?: string; showAll?: boolean; }

export function searchUsers(params: UsersQueryParams): Promise<User[]> {
  return axios.get<User[]>("/api/users", { params })
    .then(({ data }) => data);
}
```

## Working with React.js ⚛️

If you are looking to use ts-routeways with React.js, please refer to [react-routeways](https://www.npmjs.com/package/react-routeways) instead. This package seamlessly integrates ts-routeways with React.js and [react-router](https://reactrouter.com/).

## API Reference

The library is documented on its JSDocs, which is the most useful place for help. However, if you'd like to see the API reference, you can find them in the link below:

[API Reference 📚](./docs/APIReference.md)

## Something's missing?

Suggestions are always welcome! Please create an [issue](https://github.com/JoseLion/ts-routeways/issues/new) describing the request, feature, or bug. We'll try to look into it as soon as possible 🙂

## Contributions

Contributions are very welcome! To do so, please fork this repository and open a Pull Request to the `main` branch.

## License

[MIT License](./LICENSE)

---

_Attribution:_ <a href="https://www.flaticon.com/free-icons/route" title="route icons">Route icon created by Smashicons - Flaticon</a>
