import { expect } from "@assertive-ts/core";

import { Codecs } from "../../../../src/lib/Codecs";

import type { CodecsToRecord, InferQueryParams, PathLike, RouteParams } from "../../../../src/lib/helpers/common";
import type { TestRoutes } from "../../../TestRoutes";

describe("[Unit] Commons.types.test.ts", () => {
  describe("PathLike", () => {
    it("defines a string that starts with /", () => {
      const path: PathLike = "/foo";

      expect(path).toBeTruthy();
    });
  });

  describe("CodecsToRecord<T>", () => {
    it("transforms a record of codecs to a recors of the codec's types", () => {
      const codecs = { x: Codecs.Boolean, y: Codecs.Number, z: Codecs.String };
      const result: CodecsToRecord<typeof codecs> = {
        x: true,
        y: 1,
        z: "foo",
      };

      expect(result).toBeTruthy();
    });
  });

  describe("RouteParams<V, Q>", () => {
    it("defines an object of both path variables and quuery params based on V and Q", () => {
      const pathVars = { id: Codecs.Number };
      const queryParams = { page: Codecs.Number, sort: Codecs.String, zod: Codecs.Boolean };
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
