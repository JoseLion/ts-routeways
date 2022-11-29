import { expect } from "@stackbuilders/assertive-ts";

import { Codecs } from "../../../src/lib/Codecs";
import { CodecsOf, InferQueryParams, PathLike, RouteParams } from "../../../src/lib/commons.types";
import { TestRoutes } from "../../TestRoutes";

describe("[Unit] Commons.types.test.ts", () => {
  describe("PathLike", () => {
    it("defines a string that starts with /", () => {
      const path: PathLike = "/foo";

      expect(path).toBeTruthy();
    });
  });

  describe("CodecsOf<T>", () => {
    it("defines an object of codecs based on T", () => {
      const base = { x: 1, y: true, z: "foo" };
      const codecs: CodecsOf<typeof base> = {
        x: Codecs.Number,
        y: Codecs.Boolean,
        z: Codecs.String,
      };

      expect(codecs).toBeTruthy();
    });
  });

  describe("RouteParams<V, Q>", () => {
    it("defines an object of both path variables and quuery params based on V and Q", () => {
      const pathVars = { id: 1 };
      const queryParams = { page: 1, sort: "foo", zod: false };
      const params: RouteParams<typeof pathVars, typeof queryParams> = {
        id: 1,
        page: 1,
        sort: "foo",
      };

      expect(params).toBeTruthy();
    });
  });

  describe("InferQueryParams<R>", () => {
    it("describes the query params type of the R route", () => {
      const queryParams: InferQueryParams<typeof TestRoutes.static1> = {
        page: 1,
        search: ["foo"],
        size: 4,
      };

      expect(queryParams).toBeTruthy();
    });
  });
});
