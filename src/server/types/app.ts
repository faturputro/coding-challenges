export enum AppErrorCode {
  InternalServerError = 'internal_server_error',
  BadRequest = 'bad_request',
  Unauthorized = 'unauthorized',
  Forbidden = 'forbidden',
  NotFound = 'not_found',
  Conflict = 'conflict',
  ValidationFailed = 'validation_failed',
  TooManyRequests = 'too_many_requests',
  DuplicateUniqueResource = 'duplicate_unique_resource',
  TokenExpired = 'token_expired',
  InvalidToken = 'invalid_token',
  BadConfiguration = 'bad_configuration',
  InvalidCredentials = 'invalid_credentials'
}
