import { envValidationSchema } from './env.validation';

const requiredEnv = {
  DB_USERNAME: 'user',
  DB_PASSWORD: 'pass',
  DB_NAME: 'db',
  JWT_SECRET: 'secret',
  JWT_REFRESH_SECRET: 'refresh-secret',
  STORAGE_BUCKET: 'bucket',
  STORAGE_ACCESS_KEY: 'access-key',
  STORAGE_SECRET_KEY: 'secret-key',
  STORAGE_PUBLIC_ENDPOINT: 'http://localhost:9000',
};

const validate = (env: Record<string, string>) =>
  envValidationSchema.validate(
    { ...requiredEnv, ...env },
    { allowUnknown: true, abortEarly: false },
  );

describe('envValidationSchema — SWAGGER_ENABLED', () => {
  it('should reject SWAGGER_ENABLED with an invalid value', () => {
    const { error } = validate({ SWAGGER_ENABLED: 'invalid' });
    expect(error).toBeDefined();
    expect(error!.message).toContain('SWAGGER_ENABLED');
  });

  it('should accept SWAGGER_ENABLED=true', () => {
    const { error } = validate({ SWAGGER_ENABLED: 'true' });
    expect(error).toBeUndefined();
  });

  it('should accept SWAGGER_ENABLED=false', () => {
    const { error } = validate({ SWAGGER_ENABLED: 'false' });
    expect(error).toBeUndefined();
  });

  it('should apply default false when SWAGGER_ENABLED is not set', () => {
    const { value, error } = validate({});
    expect(error).toBeUndefined();
    expect(value.SWAGGER_ENABLED).toBe('false');
  });
});

describe('envValidationSchema — STORAGE_PUBLIC_ENDPOINT', () => {
  it('should reject when STORAGE_PUBLIC_ENDPOINT is missing', () => {
    const { STORAGE_PUBLIC_ENDPOINT, ...envWithoutPublicEndpoint } =
      requiredEnv;
    const { error } = envValidationSchema.validate(envWithoutPublicEndpoint, {
      allowUnknown: true,
      abortEarly: false,
    });
    expect(error).toBeDefined();
    expect(error!.message).toContain('STORAGE_PUBLIC_ENDPOINT');
  });

  it('should reject STORAGE_PUBLIC_ENDPOINT with an invalid URI', () => {
    const { error } = validate({ STORAGE_PUBLIC_ENDPOINT: 'not-a-uri' });
    expect(error).toBeDefined();
    expect(error!.message).toContain('STORAGE_PUBLIC_ENDPOINT');
  });

  it('should accept a valid STORAGE_PUBLIC_ENDPOINT', () => {
    const { error, value } = validate({
      STORAGE_PUBLIC_ENDPOINT: 'http://localhost:9000',
    });
    expect(error).toBeUndefined();
    expect(value.STORAGE_PUBLIC_ENDPOINT).toBe('http://localhost:9000');
  });
});
