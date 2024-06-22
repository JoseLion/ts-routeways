import { expect } from "@assertive-ts/core";
import { it, suite } from "vitest";

import { RoutewaysBuilder } from "../../src/lib/Routeways";
import { Routeways } from "../../src/main";

suite("[Unit] index.test.ts", () => {
  suite("Routeways", () => {
    it("returns an initial Routeways builder", () => {
      const builder = Routeways();

      expect(builder).toBeInstanceOf(RoutewaysBuilder);
    });
  });
});
