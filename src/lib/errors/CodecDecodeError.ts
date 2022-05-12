/**
 * Custom error used to determine that a codec failed to decode a value
 */
export class CodecDecodeError extends Error {

  public constructor(message: string) {
    super(message);

    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, CodecDecodeError.prototype);
  }
}
