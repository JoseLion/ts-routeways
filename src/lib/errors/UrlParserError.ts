/**
 * Custom error used to determine that a URL failed to be parsed
 */
export class UrlParserError extends Error {

  public constructor(message: string) {
    super(message);

    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, UrlParserError.prototype);
  }
}
