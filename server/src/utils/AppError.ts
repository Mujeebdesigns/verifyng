/**
 * Typed application error.
 * Thrown by services with an HTTP-appropriate status code.
 * Caught by controllers and mapped to the standard error response shape.
 */
export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
