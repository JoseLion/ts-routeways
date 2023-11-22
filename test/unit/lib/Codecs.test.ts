import { TypeFactories, expect } from "@assertive-ts/core";

import { addCodec, Codec, Codecs, CodecsType } from "../../../src/lib/Codecs";
import { CodecDecodeError } from "../../../src/lib/errors/CodecDecodeError";
import { CodecEncodeError } from "../../../src/lib/errors/CodecEncodeError";

interface CodecsWithFoo extends CodecsType {
  Foo: Codec<"foo">;
  makeFoo: () => Codec<"foo">;
}

type ArrayVariant = [string, Codec<string | number>, string, Array<string | number>];

describe("[Unit] Codecs.test.ts", () => {
  describe("#Boolean", () => {
    const variants = [
      ["true", true],
      ["false", false],
    ] as const;

    describe(".decode", () => {
      context("when the string is either 'true' or 'false'", () => {
        variants.forEach(([text, bool]) => {
          it(`[${text}] returns its boolean value`, () => {
            const decoded = Codecs.Boolean.decode(text);

            expect(decoded).toBeEqual(bool);
          });
        });
      });

      context("when the string is not either 'true' nor 'false'", () => {
        it("throws a CodecDecodeError", () => {
          expect(() => Codecs.Boolean.decode("some"))
            .toThrowError(CodecDecodeError)
            .toHaveMessage('Boolean values must be "true" or "false". Got "some" instead');
        });
      });
    });

    describe(".encode", () => {
      context("when the value is a boolean", () => {
        variants.forEach((([str, bool]) => {
          it(`[${bool}] returns its string representation`, () => {
            const encoded = Codecs.Boolean.encode(bool);

            expect(encoded).toBeEqual(str);
          });
        }));
      });

      context("when the value is not a boolean", () => {
        it("throws a CodecEncodeError", () => {
          expect(() => Codecs.Boolean.encode("some" as unknown as boolean))
            .toThrowError(CodecEncodeError)
            .toHaveMessage('Unable to encode "some". A boolean value was expected');
        });
      });
    });
  });

  describe("#Date", () => {
    describe(".decode", () => {
      context("when the string is a valid date format", () => {
        const variants = [
          ["RFC2822", "Tue Apr 05 2022 18:30:15.150 GMT-0500"],
          ["ISO", "2022-04-05T18:30:15.150-05:00"],
          ["UTC", "2022-04-05T23:30:15.150Z"],
        ] as const;

        variants.forEach(([format, text]) => {
          it(`[${format}] returns its date value`, () => {
            const decoded = Codecs.Date.decode(text);

            expect(decoded).toBeEqual(new Date("2022-04-05T23:30:15.150Z"));
          });
        });
      });

      context("when the string is not a valid date format", () => {
        it("throws a CodecDecodeError", () => {
          expect(() => Codecs.Date.decode("foo"))
            .toThrowError(CodecDecodeError)
            .toHaveMessage('Date values must have a ISO or RFC2822 format. Got "foo" instead');
        });
      });
    });

    describe(".encode", () => {
      context("when the value is a date", () => {
        it("returns its UTC string representation", () => {
          const encoded = Codecs.Date.encode(new Date("2022-04-05T18:30:15.150-05:00"));

          expect(encoded).toBeEqual("2022-04-05T23:30:15.150Z");
        });
      });

      context("when the value is not a date", () => {
        it("throws a CodecEncodeError", () => {
          expect(() => Codecs.Date.encode("some" as unknown as Date))
            .toThrowError(CodecEncodeError)
            .toHaveMessage('Unable to encode "some". A Date instance was expected');
        });
      });
    });
  });

  describe("#Number", () => {
    const variants = [
      ["integer", "10", 10],
      ["negative", "-20", -20],
      ["decimal", "0.5", 0.5],
      ["negative decimal", "-0.1", -0.1],
      ["infinity", "Infinity", Infinity],
      ["negative infinity", "-Infinity", -Infinity],
    ] as const;

    describe(".decode", () => {
      context("when the string is a valid number", () => {
        variants.forEach(([variant, text, num]) => {
          it(`[${variant}] returns its number value`, () => {
            const decoded = Codecs.Number.decode(text);

            expect(decoded).toBeEqual(num);
          });
        });
      });

      context("when the string is not a valid number", () => {
        const invalidVariants = [
          ["empty string", ""],
          ["non numeric", "foo"],
        ] as const;

        invalidVariants.forEach(([variant, text]) => {
          it(`[${variant}] throws a CodecDecodeError`, () => {
            expect(() => Codecs.Number.decode(text))
              .toThrowError(CodecDecodeError)
              .toHaveMessage(`Number values must be numeric only. Got "${text}" instead`);
          });
        });
      });
    });

    describe(".encode", () => {
      context("whent the value is a number", () => {
        variants.forEach(([variant, text, num]) => {
          it(`[${variant}] returns its string representation`, () => {
            const encoded = Codecs.Number.encode(num);

            expect(encoded).toBeEqual(text);
          });
        });
      });

      context("when the value is not a number", () => {
        it("throws a CodecEncodeError", () => {
          expect(() => Codecs.Number.encode("some" as unknown as number))
            .toThrowError(CodecEncodeError)
            .toHaveMessage('Unable to encode "some". A number value was expected');
        });
      });
    });
  });

  describe("#String", () => {
    describe(".decode", () => {
      it("returns the same string", () => {
        const decoded = Codecs.String.decode("foo");

        expect(decoded).toBeEqual("foo");
      });
    });

    describe(".encode", () => {
      context("when the value is a string", () => {
        it("returns the same string value", () => {
          const encoded = Codecs.String.encode("foo");

          expect(encoded).toBeEqual("foo");
        });
      });

      context("when the value is not a string", () => {
        it("throws a CodecEncodeError", () => {
          expect(() => Codecs.String.encode({ foo: 1 } as unknown as string))
            .toThrowError(CodecEncodeError)
            .toHaveMessage('Unable to encode "[object Object]". A string value was expected');
        });
      });
    });
  });

  describe(".array", () => {
    const jsonVariants: ArrayVariant[] = [
      ["empty array", Codecs.String, "", []],
      ["1 empty str", Codecs.String, "[]", [""]],
      ["2 empty str", Codecs.String, "[,]", ["", ""]],
      ["3 empty str", Codecs.String, "[,,]", ["", "", ""]],
      ["non-empty", Codecs.Number, "[1,2,3]", [1, 2, 3]],
    ];
    const delimitedVariants: ArrayVariant[] = [
      ["empty array", Codecs.String, "", []],
      // ["1 empty str", Codecs.String, "", [""]], // Ambiguious, not possible!
      ["2 empty str", Codecs.String, ",", ["", ""]],
      ["3 empty str", Codecs.String, ",,", ["", "", ""]],
      ["non-empty", Codecs.Number, "1,2,3", [1, 2, 3]],
    ];
    const repeatVariants: ArrayVariant[] = [
      ["empty array", Codecs.String, "?", []],
      ["1 empty str", Codecs.String, "?x=", [""]],
      ["2 empty str", Codecs.String, "?x=&x=", ["", ""]],
      ["3 empty str", Codecs.String, "?x=&x=&x=", ["", "", ""]],
      ["non-empty", Codecs.Number, "?x=1&x=2&x=3", [1, 2, 3]],
    ];
    const bracketsVariants: ArrayVariant[] = [
      ["empty array", Codecs.String, "?", []],
      ["1 empty str", Codecs.String, "?x[]=", [""]],
      ["2 empty str", Codecs.String, "?x[]=&x[]=", ["", ""]],
      ["3 empty str", Codecs.String, "?x[]=&x[]=&x[]=", ["", "", ""]],
      ["non-empty", Codecs.Number, "?x[]=1&x[]=2&x[]=3", [1, 2, 3]],
    ];

    describe(".decode", () => {
      context("when the format is 'json'", () => {
        context("and the format is valid", () => {
          jsonVariants.forEach(([desc, inner, text, array]) => {
            it(`[Text: ${desc}] returns the decoded array`, () => {
              const decoded = Codecs.array(inner, { format: "json" }).decode(text);

              expect(decoded).toBeEqual(array);
            });
          });
        });

        context("and the format is invalid", () => {
          it("throws a CodecDecodeError", () => {
            expect(() => Codecs.array(Codecs.Number).decode("1,2,3"))
              .toThrowError(CodecDecodeError)
              .toHaveMessage("Invalid array format! Expected values to be on square brackets");
          });
        });
      });

      context("when the format is 'delimited'", () => {
        context("and the default delimiter is used", () => {
          delimitedVariants.forEach(([desc, inner, text, array]) => {
            it(`[Text: ${desc}] returns the decoded array using commas as delimiter`, () => {
              const decoded = Codecs.array(inner, { format: "delimited" }).decode(text);

              expect(decoded).toBeEqual(array);
            });
          });
        });

        context("and the delimiter is changed", () => {
          it("returns the decoded array based on the new delimter", () => {
            const text = "true_false_true_false";
            const decoded = Codecs.array(Codecs.Boolean, { delimiter: "_", format: "delimited" }).decode(text);

            expect(decoded).toBeEqual([true, false, true, false]);
          });
        });
      });

      context("when the format is 'repeat-key'", () => {
        repeatVariants.forEach(([desc, inner, search, array]) => {
          it(`[Text: ${desc}] returns the decoded array`, () => {
            const decoded = Codecs.array(inner, { format: "repeat-key" }).decode("", { key: "x", search });

            expect(decoded).toBeEqual(array);
          });
        });
      });

      context("when the format is 'key-square-brackets'", () => {
        bracketsVariants.forEach(([desc, inner, search, array]) => {
          it(`[Text: ${desc}] returns the decoded array`, () => {
            const decoded = Codecs.array(inner, { format: "key-square-brackets" }).decode("", { key: "x", search });

            expect(decoded).toBeEqual(array);
          });
        });
      });
    });

    describe(".encode", () => {
      context("when the value is an array", () => {
        context("and the array is empty", () => {
          it("returns an empty string", () => {
            const encoded = Codecs.array(Codecs.String).encode([]);

            expect(encoded).toBeEqual("");
          });
        });

        context("and the format is 'json'", () => {
          jsonVariants.forEach(([desc, inner, text, array]) => {
            it(`[Array: ${desc}] returns the string representation of the array`, () => {
              const encoded = Codecs.array(inner, { format: "json" }).encode(array);

              expect(encoded).toBeEqual(text);
            });
          });
        });

        context("and the format is 'delimited'", () => {
          context("and the default delimiter is used", () => {
            delimitedVariants.forEach(([desc, inner, text, array]) => {
              it(`[Array: ${desc}] returns the string representation of the array`, () => {
                const encoded = Codecs.array(inner, { format: "delimited" }).encode(array);

                expect(encoded).toBeEqual(text);
              });
            });
          });

          context("and the delimiter is changed", () => {
            it("returns the decoded array based on the new delimter", () => {
              const array = [true, false, true, false];
              const encoded = Codecs.array(Codecs.Boolean, { delimiter: "_", format: "delimited" }).encode(array);

              expect(encoded).toBeEqual("true_false_true_false");
            });
          });
        });

        context("and the format is 'repeat-key'", () => {
          repeatVariants.forEach(([desc, inner, text, array]) => {
            it(`[Array: ${desc}] returns the search string representation of the array`, () => {
              const encoded = Codecs.array(inner, { format: "repeat-key" }).encode(array, "x");

              expect(encoded).toBeEqual(text.replace("?", ""));
            });
          });
        });

        context("and the format is 'key-square-brackets'", () => {
          bracketsVariants.forEach(([desc, inner, text, array]) => {
            it(`[Array: ${desc}] returns the search string representation of the array`, () => {
              const encoded = Codecs.array(inner, { format: "key-square-brackets" }).encode(array, "x");

              expect(encoded).toBeEqual(text.replace("?", ""));
            });
          });
        });
      });

      context("when the value is not an array", () => {
        it("throws a CodecEncodeError", () => {
          expect(() => Codecs.array(Codecs.Number).encode({ } as unknown as number[]))
            .toThrowError(CodecEncodeError)
            .toHaveMessage('Unable to encode "[object Object]". An array value was expected');
        });
      });
    });
  });

  describe(".numberLiteral", () => {
    describe(".decode", () => {
      context("when the string is a valid number", () => {
        context("and the number is one of the codec literals", () => {
          it("returns its number literal value", () => {
            const decoded = Codecs.numberLiteral(1, 2, 3).decode("2");

            expect(decoded).toBeEqual(2);
          });
        });

        context("and the number is not one of the codec literals", () => {
          it("throws a CodecDecodeError", () => {
            expect(() => Codecs.numberLiteral(1, 2, 3).decode("5"))
              .toThrowError(CodecDecodeError)
              .toHaveMessage('Literal value must be one of "[1, 2, 3]". Got "5" instead');
          });
        });
      });

      context("when the string is not a valid number", () => {
        it("throws the Number's CodecDecodeError", () => {
          expect(() => Codecs.numberLiteral(1, 2, 3).decode("foo"))
            .toThrowError(CodecDecodeError)
            .toHaveMessage('Number values must be numeric only. Got "foo" instead');
        });
      });
    });

    describe(".encode", () => {
      context("when the value is one of the codec literals", () => {
        it("returns its string representation", () => {
          const encoded = Codecs.numberLiteral(1, 2, 3).encode(2);

          expect(encoded).toBeEqual("2");
        });
      });

      context("when the value is not one of the codec literals", () => {
        it("throws a CodecEncodeError", () => {
          expect(() => Codecs.numberLiteral(1, 2, 3).encode(5 as unknown as 1))
            .toThrowError(CodecEncodeError)
            .toHaveMessage('Unable to encode "5". A literal value of "[1, 2, 3]" was expected');
        });
      });
    });
  });

  describe(".null", () => {
    describe(".decode", () => {
      context("when the string is exactly 'null'", () => {
        it("returns null as the value", () => {
          const decoded = Codecs.null(Codecs.String).decode("null");

          expect(decoded).toBeNull();
        });
      });

      context("when the string is valid for the inner codec", () => {
        it("returns the inner codec decoded value", () => {
          const decoded = Codecs.null(Codecs.Boolean).decode("true");

          expect(decoded).toBeEqual(true);
        });
      });

      context("when the string is not valid for the inner codec", () => {
        it("throws the inner CodecDecodeError", () => {
          expect(() => Codecs.null(Codecs.Boolean).decode("foo"))
            .toThrowError(CodecDecodeError)
            .toHaveMessage('Boolean values must be "true" or "false". Got "foo" instead');
        });
      });
    });

    describe(".encode", () => {
      context("when the value is null", () => {
        it("returns exactly 'null'", () => {
          const encoded = Codecs.null(Codecs.String).encode(null);

          expect(encoded).toBeEqual("null");
        });
      });

      context("when the value is valid for the inner codec", () => {
        it("returns the inner codec encoded value", () => {
          const encoded = Codecs.null(Codecs.Boolean).encode(true);

          expect(encoded).toBeEqual("true");
        });
      });

      context("when the value is not valid for the inner codec", () => {
        it("throws the inner CodecEncodeError", () => {
          expect(() => Codecs.null(Codecs.Boolean).encode("foo" as unknown as boolean))
            .toThrowError(CodecEncodeError)
            .toHaveMessage('Unable to encode "foo". A boolean value was expected');
        });
      });
    });
  });

  describe(".nullish", () => {
    describe(".decode", () => {
      context("when the string is exactly 'null'", () => {
        it("returns null as the value", () => {
          const decoded = Codecs.nullish(Codecs.String).decode("null");

          expect(decoded).toBeNull();
        });
      });

      context("when the string is exactly 'undefined'", () => {
        it("returns undefined as the value", () => {
          const decoded = Codecs.nullish(Codecs.String).decode("undefined");

          expect(decoded).not.toBePresent();
        });
      });

      context("when the string is valid for the inner codec", () => {
        it("returns the inner codec decoded value", () => {
          const decoded = Codecs.nullish(Codecs.Boolean).decode("true");

          expect(decoded).toBeEqual(true);
        });
      });

      context("when the string is not valid for the inner codec", () => {
        it("throws the inner CodecDecodeError", () => {
          expect(() => Codecs.nullish(Codecs.Boolean).decode("foo"))
            .toThrowError(CodecDecodeError)
            .toHaveMessage('Boolean values must be "true" or "false". Got "foo" instead');
        });
      });
    });

    describe(".encode", () => {
      context("when the value is null", () => {
        it("returns exactly 'null'", () => {
          const encoded = Codecs.nullish(Codecs.String).encode(null);

          expect(encoded).toBeEqual("null");
        });
      });

      context("when the value is undefined", () => {
        it("returns exactly 'undefined'", () => {
          const encoded = Codecs.nullish(Codecs.String).encode(undefined);

          expect(encoded).toBeEqual("undefined");
        });
      });

      context("when the value is valid for the inner codec", () => {
        it("returns the inner codec encoded value", () => {
          const encoded = Codecs.nullish(Codecs.Boolean).encode(true);

          expect(encoded).toBeEqual("true");
        });
      });

      context("when the value is not valid for the inner codec", () => {
        it("throws the inner CodecEncodeError", () => {
          expect(() => Codecs.nullish(Codecs.Boolean).encode("foo" as unknown as boolean))
            .toThrowError(CodecEncodeError)
            .toHaveMessage('Unable to encode "foo". A boolean value was expected');
        });
      });
    });
  });

  describe(".stringLiteral", () => {
    describe(".decode", () => {
      context("when the string is one of the codec literals", () => {
        it("returns its string literal value", () => {
          const decoded = Codecs.stringLiteral("foo", "bar", "baz").decode("foo");

          expect(decoded).toBeEqual("foo");
        });
      });

      context("when the string is not one of the codec literals", () => {
        it("throws a CodecDecodeError", () => {
          expect(() => Codecs.stringLiteral("foo", "bar", "baz").decode("fizz"))
            .toThrowError(CodecDecodeError)
            .toHaveMessage('Literal value must be one of "[foo, bar, baz]". Got "fizz" instead');
        });
      });
    });

    describe(".encode", () => {
      context("when the value is one of the codec literals", () => {
        it("returns the literal as a string", () => {
          const encoded = Codecs.stringLiteral("foo", "bar", "baz").encode("baz");

          expect(encoded).toBeEqual("baz");
        });
      });

      context("when the value is not one of the codec literals", () => {
        it("throws a CodecEncodeError", () => {
          expect(() => Codecs.stringLiteral("foo", "bar", "baz").encode("fizz" as unknown as "foo"))
            .toThrowError(CodecEncodeError)
            .toHaveMessage('Unable to encode "fizz". A literal value of "[foo, bar, baz]" was expected');
        });
      });
    });
  });

  describe(".undefined", () => {
    describe(".decode", () => {
      context("when the string is exactly 'undefined'", () => {
        it("returns undefined as the value", () => {
          const decoded = Codecs.undefined(Codecs.String).decode("undefined");

          expect(decoded).not.toBePresent();
        });
      });

      context("when the string is valid for the inner codec", () => {
        it("returns the inner codec decoded value", () => {
          const decoded = Codecs.undefined(Codecs.Boolean).decode("false");

          expect(decoded).toBeEqual(false);
        });
      });

      context("when the string is not valid for the inner codec", () => {
        it("throws the inner CodecDecodeError", () => {
          expect(() => Codecs.undefined(Codecs.Boolean).decode("foo"))
            .toThrowError(CodecDecodeError)
            .toHaveMessage('Boolean values must be "true" or "false". Got "foo" instead');
        });
      });
    });

    describe(".encode", () => {
      context("when the value is undefined", () => {
        it("returns exactly 'undefined'", () => {
          const encoded = Codecs.undefined(Codecs.String).encode(undefined);

          expect(encoded).toBeEqual("undefined");
        });
      });

      context("when the value is valid for the inner codec", () => {
        it("returns the inner codec encoded value", () => {
          const encoded = Codecs.undefined(Codecs.Boolean).encode(false);

          expect(encoded).toBeEqual("false");
        });
      });

      context("when the value is not valid for the inner codec", () => {
        it("throws the inner CodecEncodeError", () => {
          expect(() => Codecs.undefined(Codecs.Boolean).encode("foo" as unknown as boolean))
            .toThrowError(CodecEncodeError)
            .toHaveMessage('Unable to encode "foo". A boolean value was expected');
        });
      });
    });
  });

  describe(".addCodec", () => {
    it("adds the codec with it's name to the Codec object", () => {
      const codec: Codec<"foo"> = {
        decode: () => "foo",
        encode: () => "foo",
      };
      const makeFoo = (): Codec<"foo"> => codec;

      addCodec("Foo", codec);
      addCodec("makeFoo", makeFoo);

      expect((Codecs as CodecsWithFoo).Foo)
        .asType(TypeFactories.object<Codec<"foo">>())
        .toBeEqual(codec);
      expect((Codecs as CodecsWithFoo).makeFoo)
        .asType(TypeFactories.Function)
        .toBeEqual(makeFoo);
    });
  });
});
