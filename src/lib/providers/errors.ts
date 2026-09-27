export class MissingKeyError extends Error {
  constructor(public envKey: string) {
    super(`Missing ${envKey} environment variable`);
    this.name = "MissingKeyError";
  }
}
