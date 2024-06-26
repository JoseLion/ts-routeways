import { expect } from "@assertive-ts/core";
import { describe, it, suite } from "vitest";

import { Codecs } from "../../../src/lib/Codecs";
import { UrlParserError } from "../../../src/lib/errors/UrlParserError";
import { TestRoutes } from "../../TestRoutes";

function captureError<E extends Error>(operation: () => unknown): E {
  try {
    const value = operation();

    throw Error(`Expected function to throw, but returned ${JSON.stringify(value)} instead`);
  } catch (error) {
    return error as E;
  }
}

suite("[Unit] SafeRouter.test.ts", () => {
  suite(".$config", () => {
    suite("#pathVars", () => {
      describe("when the route has no path variables", () => {
        it("returns an empty object", () => {
          expect(TestRoutes.home.$config().pathVars).toBeEqual({ });
          expect(TestRoutes.users.view.$config().pathVars).toBeEqual({ });
          expect(TestRoutes.users.edit.profile.$config().pathVars).toBeEqual({ });
        });
      });

      describe("when the route has path variables", () => {
        it("returns an object with the accumulated path variables", () => {
          expect(TestRoutes.library.$config().pathVars).toBeEqual({ libId: Codecs.Number });
          expect(TestRoutes.library.about.$config().pathVars).toBeEqual({ libId: Codecs.Number, tab: Codecs.String });
          expect(TestRoutes.library.author.book.$config().pathVars).toBeEqual({
            authorId: Codecs.Number,
            bookId: Codecs.Number,
            libId: Codecs.Number,
          });
          expect(TestRoutes.library.author.collection.tome.$config().pathVars).toBeEqual({
            authorId: Codecs.Number,
            collectionId: Codecs.String,
            libId: Codecs.Number,
            tomeId: Codecs.String,
          });
        });
      });
    });

    suite("#queryParams", () => {
      describe("when the route has no query parameters", () => {
        it("returns an empty object", () => {
          expect(TestRoutes.home.$config().queryParams).toBeEqual({ });
          expect(TestRoutes.users.view.$config().queryParams).toBeEqual({ });
          expect(TestRoutes.users.edit.profile.$config().queryParams).toBeEqual({ });
        });
      });

      describe("when the route has query parameters", () => {
        it("returns only the segment query parameters", () => {
          expect(TestRoutes.library.$config().queryParams).toBeEqual({ limit: Codecs.Boolean, page: Codecs.Number });
          expect(TestRoutes.library.author.$config().queryParams).toBeEqual({ tab: Codecs.String });
          expect(TestRoutes.library.author.book.$config().queryParams).toBeEqual({ isFree: Codecs.Boolean });
        });
      });
    });

    suite("#segment", () => {
      it("returns the segment of the route", () => {
        expect(TestRoutes.home.$config().segment).toBeEqual("/home");
        expect(TestRoutes.users.view.$config().segment).toBeEqual("/view");
        expect(TestRoutes.users.edit.profile.$config().segment).toBeEqual("/profile");

        expect(TestRoutes.library.$config().segment).toBeEqual("/library/:libId");
        expect(TestRoutes.library.author.$config().segment).toBeEqual("/author/:authorId");
        expect(TestRoutes.library.author.book.$config().segment).toBeEqual("/book/:bookId");
      });
    });

    suite("#subRoutes", () => {
      it("returns the subroutes of the route", () => {
        const subRoutes1 = TestRoutes.home.$config().subRoutes;
        const subRoutes2 = TestRoutes.users.$config().subRoutes;
        const subRoutes3 = TestRoutes.users.edit.$config().subRoutes;
        const subRoutes4 = TestRoutes.users.edit.profile.$config().subRoutes;

        expect(Object.keys(subRoutes1)).toBeEqual([]);
        expect(Object.keys(subRoutes2)).toBeEqual(["view", "edit"]);
        expect(Object.keys(subRoutes3)).toBeEqual(["profile"]);
        expect(Object.keys(subRoutes4)).toBeEqual([]);
      });
    });
  });

  suite(".makeUrl", () => {
    describe("when the route has no path variable nor query parameters", () => {
      it("returns the full path", () => {
        const fullpath = TestRoutes.users.edit.profile.makeUrl();

        expect(fullpath).toBeEqual("/users/edit/profile");
      });
    });

    describe("when the route has path variables", () => {
      it("returns the full path replacing all path variables", () => {
        const fullpath1 = TestRoutes.library.makeUrl({ libId: 1 });
        const fullpath2 = TestRoutes.library.author.makeUrl({
          authorId: 2,
          libId: 1,
        });
        const fullpath3 = TestRoutes.library.author.book.makeUrl({
          authorId: 2,
          bookId: 3,
          libId: 1,
        });
        const fullpath4 = TestRoutes.library.author.collection.tome.makeUrl({
          authorId: 2,
          collectionId: "1a",
          libId: 1,
          tomeId: "2b",
        });

        expect(fullpath1).toBeEqual("/library/1");
        expect(fullpath2).toBeEqual("/library/1/author/2");
        expect(fullpath3).toBeEqual("/library/1/author/2/book/3");
        expect(fullpath4).toBeEqual("/library/1/author/2/collection/1a/tome/2b");
      });
    });

    describe("when the route has query parameters", () => {
      it("eturns the full path appending the query string", () => {
        const fullpath1 = TestRoutes.static1.makeUrl({
          page: 3,
          search: ["one", "two", "three"],
          size: 50,
        });
        const fullpath2 = TestRoutes.level1.static2.makeUrl({ some: "hello world!" });
        const fullpath3 = TestRoutes.level1.level2.static3.makeUrl({
          optional: undefined,
          other: true,
        });

        expect(fullpath1).toBeEqual("/static1?page=3&search=%5Bone%2Ctwo%2Cthree%5D&size=50");
        expect(fullpath2).toBeEqual("/level1/static2?some=hello%20world!");
        expect(fullpath3).toBeEqual("/level1/level2/static3?other=true");
      });
    });

    describe("when the route has both path variables and query parameters", () => {
      it("returns the full path replacing all path variables and appending the query string", () => {
        const fullpath1 = TestRoutes.library.makeUrl({
          libId: 1,
          limit: true,
          page: 3,
        });
        const fullpath2 = TestRoutes.library.author.makeUrl({
          authorId: 2,
          libId: 1,
          tab: "tab one",
        });
        const fullpath3 = TestRoutes.library.author.book.makeUrl({
          authorId: 2,
          bookId: 3,
          isFree: false,
          libId: 1,
        });

        expect(fullpath1).toBeEqual("/library/1?limit=true&page=3");
        expect(fullpath2).toBeEqual("/library/1/author/2?tab=tab%20one");
        expect(fullpath3).toBeEqual("/library/1/author/2/book/3?isFree=false");
      });
    });
  });

  suite(".parseUrl", () => {
    describe("when the URL matches the route template", () => {
      describe("and the URL has no path variables nor query parameters", () => {
        it("returns empty objects for both pathVars and queryParams", () => {
          const { pathVars, queryParams } = TestRoutes.users.edit.profile.parseUrl("/users/edit/profile");

          expect(pathVars).toBeEqual({ });
          expect(queryParams).toBeEqual({ });
        });
      });

      describe("and the URL has path variables", () => {
        it("decodes the path variables into pathVars", () => {
          const route1 = TestRoutes.library.parseUrl("/library/3");
          const route2 = TestRoutes.library.author.parseUrl("/library/3/author/1");
          const route3 = TestRoutes.library.author.book.parseUrl("/library/3/author/1/book/7");
          const route4 = TestRoutes.library.author.collection.tome.parseUrl(
            "/library/3/author/2/collection/LOTR/tome/4gfd-adf5",
          );

          expect(route1.pathVars).toBeEqual({ libId: 3 });
          expect(route2.pathVars).toBeEqual({ authorId: 1, libId: 3 });
          expect(route3.pathVars).toBeEqual({ authorId: 1, bookId: 7, libId: 3 });
          expect(route4.pathVars).toBeEqual({ authorId: 2, collectionId: "LOTR", libId: 3, tomeId: "4gfd-adf5" });
        });
      });

      describe("and the URL has query parameters", () => {
        it("decodes the query parameters into queryParams ignoring any not defined", () => {
          const route1 = TestRoutes.static1.parseUrl("/static1?page=3&search=%5Bone%2Ctwo%2Cthree%5D&size=50&other=x");
          const route2 = TestRoutes.level1.static2.parseUrl("/level1/static2?foo=true&some=hello%20world!");
          const route3 = TestRoutes.level1.level2.static3.parseUrl("/level1/level2/static3?optional=foo&other=false");
          const route4 = TestRoutes.static1.parseUrl("/static1?search=[one,two,three]&page=1");

          expect(route1.queryParams).toBeEqual({ page: 3, search: ["one", "two", "three"], size: 50 });
          expect(route2.queryParams).toBeEqual({ some: "hello world!" });
          expect(route3.queryParams).toBeEqual({ optional: "foo", other: false });
          expect(route4.queryParams).toBeEqual({ page: 1, search: ["one", "two", "three"] });
        });
      });

      describe("and the URL has both path variables and query parameters", () => {
        it("decodes the path variables into pathVars and the query parameters into queryParams", () => {
          const route1 = TestRoutes.library.parseUrl("/library/1?limit=true&page=3");
          const route2 = TestRoutes.library.author.parseUrl("/library/1/author/4?tab=info");
          const route3 = TestRoutes.library.author.book.parseUrl("/library/1/author/4/book/7?isFree=false");

          expect(route1).toBeEqual({
            pathVars: { libId: 1 },
            queryParams: { limit: true, page: 3 },
          });
          expect(route2).toBeEqual({
            pathVars: { authorId: 4, libId: 1 },
            queryParams: { tab: "info" },
          });
          expect(route3).toBeEqual({
            pathVars: { authorId: 4, bookId: 7, libId: 1 },
            queryParams: { isFree: false },
          });
        });
      });
    });

    describe("when the url does not match the route template", () => {
      it.each([
        ["Level 1", TestRoutes.users, "/foo"],
        ["Level 2", TestRoutes.users.edit, "/users/foo"],
        ["Level 3", TestRoutes.users.edit.profile, "/edit/users/profile"],
        ["Smaller size", TestRoutes.users.edit.profile, "/users/edit"],
        ["Bigger size", TestRoutes.users.edit.profile, "/users/edit/profile/other"],
      ])("[%s] throws a UrlParserError", (_, route, url) => {
        const error = captureError(() => route.parseUrl(url));

          expect(error).toBeInstanceOf(UrlParserError);
          expect(error.message).toBeEqual(
            `Unable to parse "${url}". The url does not match the template "${route.template()}"`,
          );
      });
    });
  });

  suite(".template", () => {
    it("returns the full path of the route", () => {
      expect(TestRoutes.home.template()).toBeEqual("/home");
      expect(TestRoutes.users.view.template()).toBeEqual("/users/view");
      expect(TestRoutes.users.edit.profile.template()).toBeEqual("/users/edit/profile");

      expect(TestRoutes.library.template()).toBeEqual("/library/:libId");
      expect(TestRoutes.library.author.template()).toBeEqual("/library/:libId/author/:authorId");
      expect(TestRoutes.library.author.book.template()).toBeEqual("/library/:libId/author/:authorId/book/:bookId");
    });
  });
});
