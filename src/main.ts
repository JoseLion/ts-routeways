import { type Routeway, RoutewaysBuilder } from "./lib/Routeways";

export type { ArrayCodecOptions, Codec, CodecsType, DecodeQuery } from "./lib/Codecs";
export { addCodec, Codecs } from "./lib/Codecs";
export { CodecDecodeError } from "./lib/errors/CodecDecodeError";
export { CodecEncodeError } from "./lib/errors/CodecEncodeError";
export { UrlParserError } from "./lib/errors/UrlParserError";
export type {
  CodecMap,
  CodecsToRecord,
  InferQueryParams,
  PathLike,
  RouteParams,
} from "./lib/helpers/common";
export type { Routeway } from "./lib/Routeways";

/**
 * Creates a `Routeways` builder instance. Use this instance to start defining
 * your routes as well as nested routes. When you're done defining the routes,
 * use the `.build()` method to construct your custom `Routeways` instance.
 *
 * @returns a `Routeways` builder instance
 */
export function Routeways(): RoutewaysBuilder<Record<never, Routeway>> {
  return new RoutewaysBuilder({ });
}
