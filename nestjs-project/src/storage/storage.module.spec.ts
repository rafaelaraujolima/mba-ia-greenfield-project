import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import storageConfig from '../config/storage.config';
import { S3_CLIENT, S3_PRESIGN_CLIENT } from './storage.constants';
import { StorageModule } from './storage.module';

describe('StorageModule', () => {
  beforeEach(() => {
    process.env.STORAGE_ENDPOINT = 'http://minio:9000';
    process.env.STORAGE_PUBLIC_ENDPOINT = 'http://localhost:9000';
    process.env.STORAGE_BUCKET = 'streamtube';
    process.env.STORAGE_ACCESS_KEY = 'streamtube';
    process.env.STORAGE_SECRET_KEY = 'streamtube123';
  });

  it('exposes both S3_CLIENT and S3_PRESIGN_CLIENT as S3Client instances', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [storageConfig] }),
        StorageModule,
      ],
    }).compile();

    const s3Client = module.get(S3_CLIENT);
    const s3PresignClient = module.get(S3_PRESIGN_CLIENT);

    expect(s3Client).toBeInstanceOf(S3Client);
    expect(s3PresignClient).toBeInstanceOf(S3Client);
    expect(s3PresignClient).not.toBe(s3Client);

    await module.close();
  });

  it('configures S3_PRESIGN_CLIENT with the public endpoint, not the internal one', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [storageConfig] }),
        StorageModule,
      ],
    }).compile();

    const s3Client: S3Client = module.get(S3_CLIENT);
    const s3PresignClient: S3Client = module.get(S3_PRESIGN_CLIENT);

    const internalEndpoint = await s3Client.config.endpoint?.();
    const publicEndpoint = await s3PresignClient.config.endpoint?.();

    expect(internalEndpoint?.hostname).toBe('minio');
    expect(publicEndpoint?.hostname).toBe('localhost');

    await module.close();
  });
});
