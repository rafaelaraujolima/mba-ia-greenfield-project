import { Category } from '../categories/entities/category.entity';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import type { Queue } from 'bullmq';
import { Channel } from '../channels/entities/channel.entity';
import storageConfig from '../config/storage.config';
import {
  cleanAllTables,
  createTestDataSource,
} from '../test/create-test-data-source';
import { S3_CLIENT } from '../storage/storage.constants';
import { User } from '../users/entities/user.entity';
import { Video, VideoStatus } from './entities/video.entity';
import { VideoProcessor } from './video.processor';
import { VideosModule } from './videos.module';
import { VIDEO_PROCESSING_QUEUE, VIDEO_PROCESS_JOB } from './videos.constants';

const execFileAsync = promisify(execFile);
const ALL_ENTITIES = [User, Channel, Category, Video];

async function createTestModule(): Promise<TestingModule> {
  const ds = createTestDataSource(ALL_ENTITIES);
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, load: [storageConfig] }),
      TypeOrmModule.forRoot(ds.options),
      BullModule.forRoot({ connection: { host: 'redis', port: 6379 } }),
      VideosModule,
    ],
  }).compile();
}

describe('VideoProcessor (integration)', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let s3Client: S3Client;
  let videoProcessor: VideoProcessor;
  let queue: Queue;
  let fixtureDir: string;
  let fixturePath: string;

  beforeAll(async () => {
    module = await createTestModule();
    await module.init();
    dataSource = module.get(DataSource);
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);
    s3Client = module.get(S3_CLIENT);
    videoProcessor = module.get(VideoProcessor);
    queue = module.get(getQueueToken(VIDEO_PROCESSING_QUEUE));
    void videoProcessor.worker.run();

    fixtureDir = await mkdtemp(join(tmpdir(), 'video-fixture-'));
    fixturePath = join(fixtureDir, 'fixture.mp4');
    await execFileAsync('ffmpeg', [
      '-f',
      'lavfi',
      '-i',
      'testsrc=duration=2:size=64x64:rate=10',
      '-pix_fmt',
      'yuv420p',
      '-y',
      fixturePath,
    ]);
  }, 30000);

  afterAll(async () => {
    await videoProcessor.worker.close();
    await rm(fixtureDir, { recursive: true, force: true });
    await module.close();
  });

  beforeEach(async () => {
    await cleanAllTables(dataSource);
  });

  let counter = 0;
  async function createUserAndChannel(): Promise<Channel> {
    const user = await userRepository.save(
      userRepository.create({
        email: `video_proc_${++counter}@example.com`,
        password: 'hashed',
      }),
    );
    return channelRepository.save(
      channelRepository.create({
        name: `Channel ${counter}`,
        nickname: `channel-proc-${counter}`,
        user_id: user.id,
      }),
    );
  }

  async function createVideo(
    channelId: string,
    overrides: Partial<Video> = {},
  ): Promise<Video> {
    return videoRepository.save(
      videoRepository.create({
        channel_id: channelId,
        title: 'My video',
        status: VideoStatus.PROCESSING,
        storage_key: `videos/${counter}/original.mp4`,
        content_type: 'video/mp4',
        ...overrides,
      }),
    );
  }

  async function uploadFixture(storageKey: string): Promise<void> {
    const body = await readFile(fixturePath);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: 'streamtube',
        Key: storageKey,
        Body: body,
        ContentType: 'video/mp4',
      }),
    );
  }

  // The NestJS `@OnWorkerEvent('failed'/'completed')` handler that persists
  // the outcome runs as an independent, un-awaited listener on the same
  // worker event as any listener we attach here — so waiting on the event
  // itself races the DB write. Poll the row instead.
  async function waitForVideoToLeaveProcessing(
    videoId: string,
  ): Promise<Video> {
    const deadline = Date.now() + 25000;
    while (Date.now() < deadline) {
      const video = await videoRepository.findOneByOrFail({ id: videoId });
      if (video.status !== VideoStatus.PROCESSING) return video;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error(`Video ${videoId} did not leave "processing" in time`);
  }

  it('processes a real video end-to-end and marks it ready with metadata and thumbnail', async () => {
    const channel = await createUserAndChannel();
    const video = await createVideo(channel.id);
    await uploadFixture(video.storage_key);

    await queue.add(VIDEO_PROCESS_JOB, { videoId: video.id }, { attempts: 1 });
    const persisted = await waitForVideoToLeaveProcessing(video.id);
    expect(persisted.status).toBe(VideoStatus.READY);
    expect(persisted.duration_seconds).not.toBeNull();
    expect(Number(persisted.duration_seconds)).toBeGreaterThan(0);
    expect(persisted.width).toBe(64);
    expect(persisted.height).toBe(64);
    expect(persisted.thumbnail_key).toBe(`videos/${video.id}/thumbnail.jpg`);

    const head = await s3Client.send(
      new HeadObjectCommand({
        Bucket: 'streamtube',
        Key: persisted.thumbnail_key!,
      }),
    );
    expect(head.ContentType).toBe('image/jpeg');
  }, 30000);

  it('marks the video as error with error_message once the job exhausts its attempts', async () => {
    const channel = await createUserAndChannel();
    const video = await createVideo(channel.id, {
      storage_key: 'videos/does-not-exist/original.mp4',
    });

    await queue.add(VIDEO_PROCESS_JOB, { videoId: video.id }, { attempts: 1 });
    const persisted = await waitForVideoToLeaveProcessing(video.id);

    expect(persisted.status).toBe(VideoStatus.ERROR);
    expect(persisted.error_message).toBeTruthy();
  }, 30000);

  it('does not mark the video as error while retries remain', async () => {
    const channel = await createUserAndChannel();
    const video = await createVideo(channel.id, {
      storage_key: 'videos/does-not-exist/original.mp4',
    });

    const fakeJob = {
      data: { videoId: video.id },
      attemptsMade: 1,
      opts: { attempts: 3 },
    } as any;

    await videoProcessor.onFailed(fakeJob, new Error('transient failure'));

    const persisted = await videoRepository.findOneByOrFail({ id: video.id });
    expect(persisted.status).toBe(VideoStatus.PROCESSING);
    expect(persisted.error_message).toBeNull();
  });
});
