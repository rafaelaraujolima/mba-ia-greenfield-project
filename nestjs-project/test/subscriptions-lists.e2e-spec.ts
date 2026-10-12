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
  nickname: string;
}

interface FollowedChannelsBody {
  items: {
    channelId: string;
    channelName: string;
    channelNickname: string;
    subscribedAt: string;
  }[];
}

interface FeedBody {
  items: {
    id: string;
    title: string;
    channelName: string;
    channelNickname: string;
    publishedAt: string;
  }[];
  page: number;
  pageSize: number;
  total: number;
}

describe('Subscriptions — lists and feed (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
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
    const email = `sub_lists_e2e_${++authCounter}@example.com`;
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

    return {
      accessToken,
      userId,
      channelId: channel.id,
      nickname: channel.nickname,
    };
  }

  async function follow(viewer: TestUser, channel: TestUser): Promise<void> {
    const res = await request(app.getHttpServer())
      .put(`/channels/${channel.nickname}/subscription`)
      .set('Authorization', `Bearer ${viewer.accessToken}`);
    expect(res.status).toBe(204);
  }

  let videoCounter = 0;
  async function createVideo(
    channelId: string,
    overrides: Partial<Video> = {},
  ): Promise<Video> {
    return videoRepository.save(
      videoRepository.create({
        channel_id: channelId,
        title: `Feed video ${++videoCounter}`,
        storage_key: `videos/${channelId}/${videoCounter}.mp4`,
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
      }),
    );
  }

  describe('GET /subscriptions', () => {
    it('should list followed channels newest first and honour limit', async () => {
      const viewer = await registerConfirmAndLogin();
      const first = await registerConfirmAndLogin();
      const second = await registerConfirmAndLogin();
      const third = await registerConfirmAndLogin();
      await follow(viewer, first);
      await follow(viewer, second);
      await follow(viewer, third);

      const res = await request(app.getHttpServer())
        .get('/subscriptions')
        .query({ limit: 2 })
        .set('Authorization', `Bearer ${viewer.accessToken}`);

      expect(res.status).toBe(200);
      const body = res.body as FollowedChannelsBody;
      expect(body.items).toHaveLength(2);
      expect(body.items[0].channelNickname).toBe(third.nickname);
      expect(body.items[1].channelNickname).toBe(second.nickname);
      expect(body.items[0].channelId).toBe(third.channelId);
      expect(typeof body.items[0].channelName).toBe('string');
      expect(typeof body.items[0].subscribedAt).toBe('string');
    });

    it('should answer an empty list for a user without subscriptions', async () => {
      const viewer = await registerConfirmAndLogin();

      const res = await request(app.getHttpServer())
        .get('/subscriptions')
        .set('Authorization', `Bearer ${viewer.accessToken}`);

      expect(res.status).toBe(200);
      expect((res.body as FollowedChannelsBody).items).toEqual([]);
    });

    it('should answer 400 for an invalid limit', async () => {
      const viewer = await registerConfirmAndLogin();

      const res = await request(app.getHttpServer())
        .get('/subscriptions')
        .query({ limit: 0 })
        .set('Authorization', `Bearer ${viewer.accessToken}`);

      expect(res.status).toBe(400);
    });

    it('should answer 401 without a token', async () => {
      const res = await request(app.getHttpServer()).get('/subscriptions');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /subscriptions/videos', () => {
    it('should return only published public videos of followed channels, newest first', async () => {
      const viewer = await registerConfirmAndLogin();
      const followed = await registerConfirmAndLogin();
      const notFollowed = await registerConfirmAndLogin();
      await follow(viewer, followed);

      const older = await createVideo(followed.channelId, {
        published_at: new Date('2026-01-01T00:00:00Z'),
      });
      const newer = await createVideo(followed.channelId, {
        published_at: new Date('2026-02-01T00:00:00Z'),
      });
      await createVideo(followed.channelId, {
        status: VideoStatus.DRAFT,
        published_at: null,
      });
      await createVideo(notFollowed.channelId);

      const res = await request(app.getHttpServer())
        .get('/subscriptions/videos')
        .set('Authorization', `Bearer ${viewer.accessToken}`);

      expect(res.status).toBe(200);
      const body = res.body as FeedBody;
      expect(body.items.map((item) => item.id)).toEqual([newer.id, older.id]);
      expect(body.items[0].channelNickname).toBe(followed.nickname);
      expect(body.page).toBe(1);
      expect(body.total).toBe(2);
      expect(typeof body.pageSize).toBe('number');
    });

    it('should answer 400 for page=0', async () => {
      const viewer = await registerConfirmAndLogin();

      const res = await request(app.getHttpServer())
        .get('/subscriptions/videos')
        .query({ page: 0 })
        .set('Authorization', `Bearer ${viewer.accessToken}`);

      expect(res.status).toBe(400);
    });

    it('should answer 401 without a token', async () => {
      const res = await request(app.getHttpServer()).get(
        '/subscriptions/videos',
      );

      expect(res.status).toBe(401);
    });
  });
});
