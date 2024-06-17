import { expect } from "@assertive-ts/core";
import { it, suite } from "vitest";

import { Routeways } from "../../src";
import { RoutewaysBuilder } from "../../src/lib/Routeways";

suite("[Unit] index.test.ts", () => {
  suite("Routeways", () => {
    it("returns an initial Routeways builder", () => {
      const builder = Routeways();

      expect(builder).toBeInstanceOf(RoutewaysBuilder);
    });
  });
});
