import { RoutewaysBuilder } from "./lib/Routeways";

export { Routeway } from "./lib/Routeways";
export { PathLike } from "./lib/commons.types";
export { Codec, CodecsType, Codecs, addCodec } from "./lib/Codecs";
export { CodecDecodeError } from "./lib/errors/CodecDecodeError";
export { CodecEncodeError } from "./lib/errors/CodecEncodeError";
export {
  makeGotToHook,
  makeNavigatorHook,
  makePathVarsHook,
  makeQueryParamHook,
  makeRouteParamsHook,
} from "./lib/react/hookMakers";

/**
 * Creates a `Routeways` builder instance. Use this instance to start defining
 * your routes as well as nested routes. When you're done defining the routes,
 * use the `.build()` method to construct your custom `Routeways` instance.
 *
 * @returns a `Routeways` builder instance
 */
export function Routeways(): RoutewaysBuilder<{ }> {
  return new RoutewaysBuilder({ });
}
