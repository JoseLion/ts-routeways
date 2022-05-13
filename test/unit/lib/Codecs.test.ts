import dedent from "@cometlib/dedent";
import { expect } from "iko";

import { addCodec, Codec, Codecs } from "../../../src/lib/Codecs";
import { CodecDecodeError } from "../../../src/lib/errors/CodecDecodeError";
import { CodecEncodeError } from "../../../src/lib/errors/CodecEncodeError";

function captureError<E extends Error>(operation: () => unknown): E {
  try {
    const value = operation();

    throw Error(`Expected function to throw, but returned ${JSON.stringify(value)} instead`);
  } catch (error) {
    return error as E;
  }
}

describe("[Unit] Codecs.test.ts", () => {
  describe("#Boolean" , () => {
    const variants = [
      ["true", true],
      ["false", false],
    ] as const;

    describe(".decode", () => {
      context("when the string is either 'true' or 'false'", () => {
        variants.forEach(([text, bool]) => {
          it(`[${text}] returns its boolean value`, () => {
            const decoded = Codecs.Boolean.decode(text);

            expect(decoded).toBe(bool);
          });
        });
      });

      context("when the string is not either 'true' nor 'false'", () => {
        it("throws a CodecDecodeError", () => {
          const error = captureError(() => Codecs.Boolean.decode("some"));

          expect(error).toBeInstanceOf(CodecDecodeError);
          expect(error.message).toBe('Boolean values must be "true" or "false". Got "some" instead');
        });
      });
    });

    describe(".encode", () => {
      context("when the value is a boolean", () => {
        variants.forEach((([str, bool]) => {
          it(`[${bool}] returns its string representation`, () => {
            const encoded = Codecs.Boolean.encode(bool);

            expect(encoded).toBe(str);
          });
        }));
      });

      context("when the value is not a boolean", () => {
        it("throws a CodecEncodeError", () => {
          const error = captureError(() => Codecs.Boolean.encode("some" as any));

          expect(error).toBeInstanceOf(CodecEncodeError);
          expect(error.message).toBe('Unable to encode "some". A boolean value was expected');
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
          const error = captureError(() => Codecs.Date.decode("foo"));

          expect(error).toBeInstanceOf(CodecDecodeError);
          expect(error.message).toBe('Date values must have a ISO or RFC2822 format. Got "foo" instead');
        });
      });
    });

    describe(".encode", () => {
      context("when the value is a date", () => {
        it("returns its UTC string representation", () => {
          const encoded = Codecs.Date.encode(new Date("2022-04-05T18:30:15.150-05:00"));

          expect(encoded).toBe("2022-04-05T23:30:15.150Z");
        });
      });

      context("when the value is not a date", () => {
        it("throws a CodecEncodeError", () => {
          const error = captureError(() => Codecs.Date.encode("some" as any));

          expect(error).toBeInstanceOf(CodecEncodeError);
          expect(error.message).toBe('Unable to encode "some". A Date instance was expected');
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

            expect(decoded).toBe(num);
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
            const error = captureError(() => Codecs.Number.decode(text));

            expect(error).toBeInstanceOf(CodecDecodeError);
            expect(error.message).toBe(`Number values must be numeric only. Got "${text}" instead`);
          });
        });
      });
    });

    describe(".encode", () => {
      context("whent the value is a number", () => {
        variants.forEach(([variant, text, num]) => {
          it(`[${variant}] returns its string representation`, () => {
            const encoded = Codecs.Number.encode(num);

            expect(encoded).toBe(text);
          });
        });
      });

      context("when the value is not a number", () => {
        it("throws a CodecEncodeError", () => {
          const error = captureError(() => Codecs.Number.encode("some" as any));

          expect(error).toBeInstanceOf(CodecEncodeError);
          expect(error.message).toBe('Unable to encode "some". A number value was expected');
        });
      });
    });
  });

  describe("#String", () => {
    describe(".decode", () => {
      it("returns the same string", () => {
        const decoded = Codecs.String.decode("foo");

        expect(decoded).toBe("foo");
      });
    });

    describe(".encode", () => {
      context("when the value is a string", () => {
        it("returns the same string value", () => {
          const encoded = Codecs.String.encode("foo");

          expect(encoded).toBe("foo");
        });
      });

      context("when the value is not a string", () => {
        it("throws a CodecEncodeError", () => {
          const error = captureError(() => Codecs.String.encode({ foo: 1 } as any));

          expect(error).toBeInstanceOf(CodecEncodeError);
          expect(error.message).toBe('Unable to encode "[object Object]". A string value was expected');
        });
      });
    });
  });

  describe(".array", () => {
    const commaVariants: Array<[string, string, string[]]> = [
      ["1 comma(s)", "[,]", ["", ""]],
      ["2 comma(s)", "[,,]", ["", "", ""]],
      ["3 comma(s)", "[,,,]", ["", "", "", ""]],
    ];

    describe(".decode", () => {
      context("when the string has a valid array format", () => {
        context("and the string is empty", () => {
          it("returns an empty array", () => {
            const decoded = Codecs.array(Codecs.String).decode("");

            expect(decoded).toBeEqual([]);
          });
        });

        context("and the values between the brackets are valid for the inner codec", () => {
          it("returns an array with the values", () => {
            const encoded = Codecs.array(Codecs.Number).decode("[1,2,3]");

            expect(encoded).toBeEqual([1, 2, 3]);
          });

          context("and the string is exactly []", () => {
            it("returns an array with an empty string", () => {
              const decoded = Codecs.array(Codecs.String).decode("[]");

              expect(decoded).toBeEqual([""]);
            });
          });

          context("and the string contains only commas", () => {
            commaVariants.forEach(([variant, text, array]) => {
              it(`[${variant}] it treats each side of the comma as an empty string`, () => {
                const decoded = Codecs.array(Codecs.String).decode(text);

                expect(decoded).toBeEqual(array);
              });
            });
          });
        });

        context("and the values between the brackets are not valid for the inner codec", () => {
          it("throws the inner codec's CodecDecodeError", () => {
            const error = captureError(() => Codecs.array(Codecs.Number).decode("[1,2,]"));

            expect(error).toBeInstanceOf(CodecDecodeError);
            expect(error.message).toBe('Number values must be numeric only. Got "" instead');
          });
        });
      });

      context("when the string does not has a valid string format", () => {
        it("throws a CodecDecodeError", () => {
          const error = captureError(() => Codecs.array(Codecs.Number).decode("1,2,3"));

          expect(error).toBeInstanceOf(CodecDecodeError);
          expect(error.message).toBe(dedent`
            Array values must be either an empty string (for empty arrays) or be \
            surrounded by square brackets "[...]". Got "1,2,3" instead
          `);
        });
      });
    });

    describe(".encode", () => {
      context("when the value is an array", () => {
        context("and the array is empty", () => {
          it("returns an empty string", () => {
            const encoded = Codecs.array(Codecs.String).encode([]);

            expect(encoded).toBe("");
          });
        });

        context("and the array values are valid for the inner codec", () => {
          it("returns the string representation of the array", () => {
            const encoded = Codecs.array(Codecs.Number).encode([1, 2, 3]);

            expect(encoded).toBe("[1,2,3]");
          });

          context("and the array contains only one empty string", () => {
            it("returns exactly []", () => {
              const encoded = Codecs.array(Codecs.String).encode([""]);

              expect(encoded).toBe("[]");
            });
          });

          context("and the array contains only empty strings", () => {
            commaVariants.forEach(([variant, text, array]) => {
              it(`[${variant}] returns exatly ${text}`, () => {
                const encoded = Codecs.array(Codecs.String).encode(array);

                expect(encoded).toBe(text);
              });
            });
          });
        });

        context("and the array values are not valid for the inner codec", () => {
          it("throws the inner codec's CodecEncodeError", () => {
            const error = captureError(() => Codecs.array(Codecs.Number).encode([1, 2, ""] as any));

            expect(error).toBeInstanceOf(CodecEncodeError);
            expect(error.message).toBe('Unable to encode "". A number value was expected');
          });
        });
      });

      context("when the value is not an array", () => {
        it("throws a CodecEncodeError", () => {
          const error = captureError(() => Codecs.array(Codecs.Number).encode({ } as any));

          expect(error).toBeInstanceOf(CodecEncodeError);
          expect(error.message).toBe('Unable to encode "[object Object]". An array value was expected');
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

            expect(decoded).toBe(2);
          });
        });

        context("and the number is not one of the codec literals", () => {
          it("throws a CodecDecodeError", () => {
            const error = captureError(() => Codecs.numberLiteral(1, 2, 3).decode("5"));

            expect(error).toBeInstanceOf(CodecDecodeError);
            expect(error.message).toBe('Literal value must be one of "[1, 2, 3]". Got "5" instead');
          });
        });
      });

      context("when the string is not a valid number", () => {
        it("throws the Number's CodecDecodeError", () => {
          const error = captureError(() => Codecs.numberLiteral(1, 2, 3).decode("foo"));

          expect(error).toBeInstanceOf(CodecDecodeError);
          expect(error.message).toBe('Number values must be numeric only. Got "foo" instead');
        });
      });
    });

    describe(".encode", () => {
      context("when the value is one of the codec literals", () => {
        it("returns its string representation", () => {
          const encoded = Codecs.numberLiteral(1, 2, 3).encode(2);

          expect(encoded).toBe("2");
        });
      });

      context("when the value is not one of the codec literals", () => {
        it("throws a CodecEncodeError", () => {
          const error = captureError(() => Codecs.numberLiteral(1, 2, 3).encode(5 as any));

          expect(error).toBeInstanceOf(CodecEncodeError);
          expect(error.message).toBe('Unable to encode "5". A literal value of "[1, 2, 3]" was expected');
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

          expect(decoded).toBe(true);
        });
      });

      context("when the string is not valid for the inner codec", () => {
        it("throws the inner CodecDecodeError", () => {
          const error = captureError(() => Codecs.null(Codecs.Boolean).decode("foo"));

          expect(error).toBeInstanceOf(CodecDecodeError);
          expect(error.message).toBe('Boolean values must be "true" or "false". Got "foo" instead');
        });
      });
    });

    describe(".encode", () => {
      context("when the value is null", () => {
        it("returns exactly 'null'", () => {
          const encoded = Codecs.null(Codecs.String).encode(null);

          expect(encoded).toBe("null");
        });
      });

      context("when the value is valid for the inner codec", () => {
        it("returns the inner codec encoded value", () => {
          const encoded = Codecs.null(Codecs.Boolean).encode(true);

          expect(encoded).toBe("true");
        });
      });

      context("when the value is not valid for the inner codec", () => {
        it("throws the inner CodecEncodeError", () => {
          const error = captureError(() => Codecs.null(Codecs.Boolean).encode("foo" as any));

          expect(error).toBeInstanceOf(CodecEncodeError);
          expect(error.message).toBe('Unable to encode "foo". A boolean value was expected');
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

          expect(decoded).toBeUndefined();
        });
      });

      context("when the string is valid for the inner codec", () => {
        it("returns the inner codec decoded value", () => {
          const decoded = Codecs.nullish(Codecs.Boolean).decode("true");

          expect(decoded).toBe(true);
        });
      });

      context("when the string is not valid for the inner codec", () => {
        it("throws the inner CodecDecodeError", () => {
          const error = captureError(() => Codecs.nullish(Codecs.Boolean).decode("foo"));

          expect(error).toBeInstanceOf(CodecDecodeError);
          expect(error.message).toBe('Boolean values must be "true" or "false". Got "foo" instead');
        });
      });
    });

    describe(".encode", () => {
      context("when the value is null", () => {
        it("returns exactly 'null'", () => {
          const encoded = Codecs.nullish(Codecs.String).encode(null);

          expect(encoded).toBe("null");
        });
      });

      context("when the value is undefined", () => {
        it("returns exactly 'undefined'", () => {
          const encoded = Codecs.nullish(Codecs.String).encode(undefined);

          expect(encoded).toBe("undefined");
        });
      });

      context("when the value is valid for the inner codec", () => {
        it("returns the inner codec encoded value", () => {
          const encoded = Codecs.nullish(Codecs.Boolean).encode(true);

          expect(encoded).toBe("true");
        });
      });

      context("when the value is not valid for the inner codec", () => {
        it("throws the inner CodecEncodeError", () => {
          const error = captureError(() => Codecs.nullish(Codecs.Boolean).encode("foo" as any));

          expect(error).toBeInstanceOf(CodecEncodeError);
          expect(error.message).toBe('Unable to encode "foo". A boolean value was expected');
        });
      });
    });
  });

  describe(".stringLiteral", () => {
    describe(".decode", () => {
      context("when the string is one of the codec literals", () => {
        it("returns its string literal value", () => {
          const decoded = Codecs.stringLiteral("foo", "bar", "baz").decode("foo");

          expect(decoded).toBe("foo");
        });
      });

      context("when the string is not one of the codec literals", () => {
        it("throws a CodecDecodeError", () => {
          const error = captureError(() => Codecs.stringLiteral("foo", "bar", "baz").decode("fizz"));

          expect(error).toBeInstanceOf(CodecDecodeError);
          expect(error.message).toBe('Literal value must be one of "[foo, bar, baz]". Got "fizz" instead');
        });
      });
    });

    describe(".encode", () => {
      context("when the value is one of the codec literals", () => {
        it("returns the literal as a string", () => {
          const encoded = Codecs.stringLiteral("foo", "bar", "baz").encode("baz");

          expect(encoded).toBe("baz");
        });
      });

      context("when the value is not one of the codec literals", () => {
        it("throws a CodecEncodeError", () => {
          const error = captureError(() => Codecs.stringLiteral("foo", "bar", "baz").encode("fizz" as any));

          expect(error).toBeInstanceOf(CodecEncodeError);
          expect(error.message).toBe('Unable to encode "fizz". A literal value of "[foo, bar, baz]" was expected');
        });
      });
    });
  });

  describe(".undefined", () => {
    describe(".decode", () => {
      context("when the string is exactly 'undefined'", () => {
        it("returns undefined as the value", () => {
          const decoded = Codecs.undefined(Codecs.String).decode("undefined");

          expect(decoded).toBeUndefined();
        });
      });

      context("when the string is valid for the inner codec", () => {
        it("returns the inner codec decoded value", () => {
          const decoded = Codecs.undefined(Codecs.Boolean).decode("false");

          expect(decoded).toBe(false);
        });
      });

      context("when the string is not valid for the inner codec", () => {
        it("throws the inner CodecDecodeError", () => {
          const error = captureError(() => Codecs.undefined(Codecs.Boolean).decode("foo"));

          expect(error).toBeInstanceOf(CodecDecodeError);
          expect(error.message).toBe('Boolean values must be "true" or "false". Got "foo" instead');
        });
      });
    });

    describe(".encode", () => {
      context("when the value is undefined", () => {
        it("returns exactly 'undefined'", () => {
          const encoded = Codecs.undefined(Codecs.String).encode(undefined);

          expect(encoded).toBe("undefined");
        });
      });

      context("when the value is valid for the inner codec", () => {
        it("returns the inner codec encoded value", () => {
          const encoded = Codecs.undefined(Codecs.Boolean).encode(false);

          expect(encoded).toBe("false");
        });
      });

      context("when the value is not valid for the inner codec", () => {
        it("throws the inner CodecEncodeError", () => {
          const error = captureError(() => Codecs.undefined(Codecs.Boolean).encode("foo" as any));

          expect(error).toBeInstanceOf(CodecEncodeError);
          expect(error.message).toBe('Unable to encode "foo". A boolean value was expected');
        });
      });
    });
  });

  describe(".addCodec", () => {
    it("adds the codec with it's name to the Codec object", () => {
      const codec: Codec<"foo"> = {
        decode: _text => "foo",
        encode: _value => "foo",
      };
      const makeFoo = (_arg1: number, _arg2: boolean) => codec;

      addCodec("Foo", codec);
      addCodec("makeFoo", makeFoo);

      expect((Codecs as any).Foo).toBe(codec);
      expect((Codecs as any).makeFoo).toBe(makeFoo);
    });
  });
});
