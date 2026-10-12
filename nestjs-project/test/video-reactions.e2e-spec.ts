import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { Channel } from '../src/channels/entities/channel.entity';
import { DomainExceptionFilter } from '../src/common/filters/domain-exception.filter';
import { ValidationExceptionFilter } from '../src/common/filters/validation-exception.filter';
import { ReactionType } from '../src/reactions/entities/reaction-type.enum';
import { VideoReaction } from '../src/reactions/entities/video-reaction.entity';
import { cleanAllTables } from '../src/test/create-test-data-source';
import {
  Video,
  VideoStatus,
  VideoVisibility,
} from '../src/videos/entities/video.entity';

interface TestUser {
  accessToken: string;
  userId: string;
  channelId: string;
}

const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000000';

describe('Video reactions (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let reactionRepository: Repository<VideoReaction>;
  let throttlerStorage: ThrottlerStorageService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(
      new DomainExceptionFilter(),
      new ValidationExceptionFilter(),
    );
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);
    reactionRepository = dataSource.getRepository(VideoReaction);
    throttlerStorage =
      moduleFixture.get<ThrottlerStorageService>(ThrottlerStorage);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanAllTables(dataSource);
    throttlerStorage.storage.clear();
  });

  let authCounter = 0;
  async function registerConfirmAndLogin(): Promise<TestUser> {
    const email = `video_reactions_e2e_${++authCounter}@example.com`;
    const password = 'password123';
    const authService = app.get(AuthService);
    const { mailService } = authService as unknown as {
      mailService: {
        sendConfirmationEmail: (
          email: string,
          name: string,
          token: string,
        ) => Promise<void>;
      };
    };
    let capturedToken = '';
    jest
      .spyOn(mailService, 'sendConfirmationEmail')
      .mockImplementationOnce((_e: string, _n: string, t: string) => {
        capturedToken = t;
        return Promise.resolve();
      });

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password });
    await request(app.getHttpServer())
      .get('/auth/confirm-email')
      .query({ token: capturedToken });
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password });

    const { id: userId } = registerRes.body as { id: string };
    const { access_token: accessToken } = loginRes.body as {
      access_token: string;
    };
    const channel = await channelRepository.findOneByOrFail({
      user_id: userId,
    });

    return { accessToken, userId, channelId: channel.id };
  }

  let videoCounter = 0;
  async function createVideo(
    channelId: string,
    overrides: Partial<Video> = {},
  ): Promise<Video> {
    return videoRepository.save(
      videoRepository.create({
        channel_id: channelId,
        title: `Reacted video ${++videoCounter}`,
        storage_key: `videos/${channelId}/${videoCounter}.mp4`,
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
      }),
    );
  }

  describe('PUT /videos/:id/reaction', () => {
    it('should create a single like reaction and answer 204', async () => {
      const viewer = await registerConfirmAndLogin();
      const owner = await registerConfirmAndLogin();
      const video = await createVideo(owner.channelId);

      const res = await request(app.getHttpServer())
        .put(`/videos/${video.id}/reaction`)
        .set('Authorization', `Bearer ${viewer.accessToken}`)
        .send({ type: 'like' });

      expect(res.status).toBe(204);
      const rows = await reactionRepository.findBy({
        user_id: viewer.userId,
        video_id: video.id,
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].type).toBe(ReactionType.LIKE);
    });

    it('should replace the like with a dislike, keeping a single row', async () => {
      const viewer = await registerConfirmAndLogin();
      const owner = await registerConfirmAndLogin();
      const video = await createVideo(owner.channelId);
      const url = `/videos/${video.id}/reaction`;

      const like = await request(app.getHttpServer())
        .put(url)
        .set('Authorization', `Bearer ${viewer.accessToken}`)
        .send({ type: 'like' });
      const dislike = await request(app.getHttpServer())
        .put(url)
        .set('Authorization', `Bearer ${viewer.accessToken}`)
        .send({ type: 'dislike' });

      expect(like.status).toBe(204);
      expect(dislike.status).toBe(204);
      const rows = await reactionRepository.findBy({
        user_id: viewer.userId,
        video_id: video.id,
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].type).toBe(ReactionType.DISLIKE);
    });

    it('should answer 400 when type is missing or not like/dislike', async () => {
      const viewer = await registerConfirmAndLogin();
      const owner = await registerConfirmAndLogin();
      const video = await createVideo(owner.channelId);
      const url = `/videos/${video.id}/reaction`;

      const missing = await request(app.getHttpServer())
        .put(url)
        .set('Authorization', `Bearer ${viewer.accessToken}`)
        .send({});
      const invalid = await request(app.getHttpServer())
        .put(url)
        .set('Authorization', `Bearer ${viewer.accessToken}`)
        .send({ type: 'love' });

      expect(missing.status).toBe(400);
      expect(invalid.status).toBe(400);
      expect(await reactionRepository.count()).toBe(0);
    });

    it('should answer 404 VIDEO_NOT_FOUND for an unknown or unpublished video', async () => {
      const viewer = await registerConfirmAndLogin();
      const owner = await registerConfirmAndLogin();
      const draft = await createVideo(owner.channelId, {
        status: VideoStatus.DRAFT,
        published_at: null,
      });

      const unknown = await request(app.getHttpServer())
        .put(`/videos/${UNKNOWN_UUID}/reaction`)
        .set('Authorization', `Bearer ${viewer.accessToken}`)
        .send({ type: 'like' });
      const hidden = await request(app.getHttpServer())
        .put(`/videos/${draft.id}/reaction`)
        .set('Authorization', `Bearer ${viewer.accessToken}`)
        .send({ type: 'like' });

      expect(unknown.status).toBe(404);
      expect((unknown.body as { error: string }).error).toBe('VIDEO_NOT_FOUND');
      expect(hidden.status).toBe(404);
      expect((hidden.body as { error: string }).error).toBe('VIDEO_NOT_FOUND');
    });

    it('should answer 401 without a token', async () => {
      const owner = await registerConfirmAndLogin();
      const video = await createVideo(owner.channelId);

      const res = await request(app.getHttpServer())
        .put(`/videos/${video.id}/reaction`)
        .send({ type: 'like' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /videos/:id/reaction', () => {
    it('should remove the reaction and stay idempotent', async () => {
      const viewer = await registerConfirmAndLogin();
      const owner = await registerConfirmAndLogin();
      const video = await createVideo(owner.channelId);
      const url = `/videos/${video.id}/reaction`;
      await request(app.getHttpServer())
        .put(url)
        .set('Authorization', `Bearer ${viewer.accessToken}`)
        .send({ type: 'like' });

      const first = await request(app.getHttpServer())
        .delete(url)
        .set('Authorization', `Bearer ${viewer.accessToken}`);
      const second = await request(app.getHttpServer())
        .delete(url)
        .set('Authorization', `Bearer ${viewer.accessToken}`);

      expect(first.status).toBe(204);
      expect(second.status).toBe(204);
      expect(await reactionRepository.count()).toBe(0);
    });

    it('should answer 404 VIDEO_NOT_FOUND for an unknown video', async () => {
      const viewer = await registerConfirmAndLogin();

      const res = await request(app.getHttpServer())
        .delete(`/videos/${UNKNOWN_UUID}/reaction`)
        .set('Authorization', `Bearer ${viewer.accessToken}`);

      expect(res.status).toBe(404);
      expect((res.body as { error: string }).error).toBe('VIDEO_NOT_FOUND');
    });

    it('should answer 401 without a token', async () => {
      const owner = await registerConfirmAndLogin();
      const video = await createVideo(owner.channelId);

      const res = await request(app.getHttpServer()).delete(
        `/videos/${video.id}/reaction`,
      );

      expect(res.status).toBe(401);
    });
  });
});
