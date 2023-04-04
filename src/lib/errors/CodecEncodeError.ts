/**
 * Custom error used to determine that a codec failed to encode a value
 */
export class CodecEncodeError extends Error {

  public constructor(message: string) {
    super(message);

    this.name = this.constructor.name;
    Object.setPrototypeOf(this, CodecEncodeError.prototype);
  }
}
