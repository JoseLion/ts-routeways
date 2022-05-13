import { RoutewaysBuilder } from "./lib/Routeways";

export { type Routeway } from "./lib/Routeways";
export { type PathLike } from "./lib/commons.types";
export { type Codec, type CodecsType, Codecs, addCodec } from "./lib/Codecs";
export { CodecDecodeError } from "./lib/errors/CodecDecodeError";
export { CodecEncodeError } from "./lib/errors/CodecEncodeError";

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
