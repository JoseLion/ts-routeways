import { Routeways } from "../src";
import { Codecs } from "../src/lib/Codecs";

export const TestRoutes = Routeways()
  .path({ name: "home", path: "/home" })
  .nest({
    name: "users",
    path: "/users",
    subRoutes: Routeways()
      .path({ name: "view", path: "/view" })
      .nest({
        name: "edit",
        path: "/edit",
        subRoutes: Routeways()
          .path({ name: "profile", path: "/profile" }),
      }),
  })
  .nest({
    name: "library",
    path: "/library/:libId",
    pathVars: { libId: Codecs.Number },
    queryParams: {
      limit: Codecs.Boolean,
      page: Codecs.Number,
    },
    subRoutes: Routeways()
      .path({ name: "about", path: "/about/:tab", pathVars: { tab: Codecs.String } })
      .nest({
        name: "author",
        path: "/author/:authorId",
        pathVars: { authorId: Codecs.Number },
        queryParams: { tab: Codecs.String },
        subRoutes: Routeways()
          .path({
            name: "book",
            path: "/book/:bookId",
            pathVars: { bookId: Codecs.Number },
            queryParams: { isFree: Codecs.Boolean },
          })
          .nest({
            name: "collection",
            path: "/collection/:collectionId",
            pathVars: { collectionId: Codecs.String },
            subRoutes: Routeways()
              .path({ name: "tome", path: "/tome/:tomeId", pathVars: { tomeId: Codecs.String } }),
          }),
      }),
  })
  .path({
    name: "static1",
    path: "/static1",
    queryParams: {
      optional: Codecs.Boolean,
      page: Codecs.Number,
      search: Codecs.array(Codecs.String),
      size: Codecs.Number,
    },
  })
  .nest({
    name: "level1",
    path: "/level1",
    queryParams: { foo: Codecs.Boolean },
    subRoutes: Routeways()
      .path({ name: "static2", path: "/static2", queryParams: { some: Codecs.String } })
      .nest({
        name: "level2",
        path: "/level2",
        queryParams: { foo: Codecs.Boolean },
        subRoutes: Routeways()
          .path({
            name: "static3",
            path: "/static3",
            queryParams: {
              optional: Codecs.String,
              other: Codecs.Boolean,
            },
          }),
      }),
  })
  .build();
