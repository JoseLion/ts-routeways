import { expect } from "@assertive-ts/core";

import { Routeways } from "../../src";
import { RoutewaysBuilder } from "../../src/lib/Routeways";

describe("[Unit] index.test.ts", () => {
  describe("Routeways", () => {
    it("returns an initial Routeways builder", () => {
      const builder = Routeways();

      expect(builder).toBeInstanceOf(RoutewaysBuilder);
    });
  });
});
