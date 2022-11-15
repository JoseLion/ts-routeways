# Custom Codecs

In `ts-routeways` a codec is just an object that defines a decoder and an encoder. These are generic functions, where `T` is the type of the codec:

- **Decoder:** A function that receives a raw `string` value and transforms it into a `T` value.
- **Encoder:** A function that receives a `T` value and transforms it into a raw `string` value.

Let's assume you want to use an awesome UUID library that has its own types, and you want to use those UUIDs in your routes. Here's how you'd add your custom codec:

```ts
// In your application entry point, or before building/exporting your `Routeways` instance(s)

import { UUID } from "my-awesome-uuid-lib";
import { type Codec, addCodec, CodecDecodeError, CodecEncodeError } from "ts-routeways";

const UUIDCodec: Codec<UUID> = {
  decode: text => {
    if (UUID.isValid(text)) {
      return UUID.parse(text);
    }

    throw new CodecDecodeError(`Unable to decode "${text}". The value is not a valid UUID. `);
  },
  encode: value => {
    // the type of `value` is `UUID`, but we check it anyways for the sake of runtime safety.
    if (value instanceof UUID) {
      return value.toString();
    }

    throw new CodecEncodeError(`Unable to encode "${value}". A UUID instance was expected`);
  }
}

// Now add the codec to the `Codecs` object
addCodec("UUID", UUIDCodec);
```

> 🚨 **Important:** Make sure to run the `addCodec(..)` function before you define (or export a definition) of your custom `Routeways`. Otherwise, your definition will not have your custom codecs at the moment of building and you'll get runtime errors.

Now you just need to extend the type definition. Create the file `./typings/ts-routes.d.ts` and add the following:

```ts
import { UUID } from "my-awesome-uuid-lib";
import { type CodecsType, type Codec } from "ts-routeways";

declare module "ts-routeways" {

  export interface CodecsType {
    /**
     * Codec for `UUID` values
     */
    UUID: Codec<UUID>;
  }
}
```

And that's it! Now you can go ahead and use `Codecs.UUID` in your routes definition.
