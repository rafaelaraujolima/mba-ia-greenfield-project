import 'dotenv/config';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import storageConfig from '../config/storage.config';

async function configureStorage(): Promise<void> {
  const config = storageConfig();

  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
    console.log(`Bucket "${config.bucket}" already exists`);
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: config.bucket }));
    console.log(`Bucket "${config.bucket}" created`);
  }
}

configureStorage().catch((error: unknown) => {
  console.error('Storage configuration failed:', error);
  process.exit(1);
});
