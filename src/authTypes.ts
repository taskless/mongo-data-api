export type EmailPasswordAuthOptions = {
  email: string;
  password: string;
};

export type ApiKeyAuthOptions = {
  apiKey: string;
};

export type CustomJwtAuthOptions = {
  jwtTokenString: string;
};

export type BearerTokenAuthOptions = {
  bearerToken: string;
};

export type AuthOptions =
  | EmailPasswordAuthOptions
  | ApiKeyAuthOptions
  | CustomJwtAuthOptions
  | BearerTokenAuthOptions;
