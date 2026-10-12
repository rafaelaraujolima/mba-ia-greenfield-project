import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { Channel } from '../src/channels/entities/channel.entity';
import { Comment } from '../src/comments/entities/comment.entity';
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
  email: string;
  channelId: string;
  nickname: string;
}

interface VideoBody {
  id: string;
  likeCount: number;
  channelSubscriberCount: number;
  viewerState: {
    reaction: string | null;
    subscribed: boolean;
    isChannelOwner: boolean;
  } | null;
}

interface ChannelBody {
  subscriberCount: number;
  viewerState: { subscribed: boolean; isChannelOwner: boolean } | null;
}

interface ManageBody {
  items: { id: string; views: number; likes: number; comments: number }[];
}

describe('Social counts and viewerState (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let commentRepository: Repository<Comment>;
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
    commentRepository = dataSource.getRepository(Comment);
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
    const email = `social_counts_e2e_${++authCounter}@example.com`;
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
      email,
      channelId: channel.id,
      nickname: channel.nickname,
    };
  }

  async function createVideo(channelId: string): Promise<Video> {
    return videoRepository.save(
      videoRepository.create({
        channel_id: channelId,
        title: 'Social video',
        storage_key: `videos/${channelId}/original.mp4`,
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: new Date('2026-01-01T00:00:00Z'),
      }),
    );
  }

  function auth(token: string): [string, string] {
    return ['Authorization', `Bearer ${token}`];
  }

  async function like(token: string, videoId: string): Promise<void> {
    const res = await request(app.getHttpServer())
      .put(`/videos/${videoId}/reaction`)
      .set(...auth(token))
      .send({ type: 'like' });
    expect(res.status).toBe(204);
  }

  async function subscribe(token: string, nickname: string): Promise<void> {
    const res = await request(app.getHttpServer())
      .put(`/channels/${nickname}/subscription`)
      .set(...auth(token));
    expect(res.status).toBe(204);
  }

  describe('GET /videos/:id', () => {
    it('should expose likeCount and channelSubscriberCount with viewerState null for anonymous', async () => {
      const owner = await registerConfirmAndLogin();
      const fanA = await registerConfirmAndLogin();
      const fanB = await registerConfirmAndLogin();
      const video = await createVideo(owner.channelId);
      await like(fanA.accessToken, video.id);
      await like(fanB.accessToken, video.id);
      await subscribe(fanA.accessToken, owner.nickname);

      const res = await request(app.getHttpServer()).get(`/videos/${video.id}`);

      expect(res.status).toBe(200);
      const body = res.body as VideoBody;
      expect(body.likeCount).toBe(2);
      expect(body.channelSubscriberCount).toBe(1);
      expect(body.viewerState).toBeNull();
    });

    it('should expose the viewerState of the subscriber who liked, and flag the owner', async () => {
      const owner = await registerConfirmAndLogin();
      const viewer = await registerConfirmAndLogin();
      const video = await createVideo(owner.channelId);
      await like(viewer.accessToken, video.id);
      await subscribe(viewer.accessToken, owner.nickname);

      const asViewer = await request(app.getHttpServer())
        .get(`/videos/${video.id}`)
        .set(...auth(viewer.accessToken));
      const asOwner = await request(app.getHttpServer())
        .get(`/videos/${video.id}`)
        .set(...auth(owner.accessToken));

      expect((asViewer.body as VideoBody).viewerState).toEqual({
        reaction: 'like',
        subscribed: true,
        isChannelOwner: false,
      });
      expect((asOwner.body as VideoBody).viewerState?.isChannelOwner).toBe(
        true,
      );
    });

    it('should answer 200 anonymous when the token is expired', async () => {
      const owner = await registerConfirmAndLogin();
      const viewer = await registerConfirmAndLogin();
      const video = await createVideo(owner.channelId);
      const expired = await app
        .get(JwtService)
        .signAsync(
          { sub: viewer.userId, email: viewer.email },
          { expiresIn: -60 },
        );

      const res = await request(app.getHttpServer())
        .get(`/videos/${video.id}`)
        .set(...auth(expired));

      expect(res.status).toBe(200);
      expect((res.body as VideoBody).viewerState).toBeNull();
    });
  });

  describe('GET /channels/:nickname', () => {
    it('should expose subscriberCount and the viewerState per requester', async () => {
      const owner = await registerConfirmAndLogin();
      const subscriber = await registerConfirmAndLogin();
      await subscribe(subscriber.accessToken, owner.nickname);

      const anonymous = await request(app.getHttpServer()).get(
        `/channels/${owner.nickname}`,
      );
      const asSubscriber = await request(app.getHttpServer())
        .get(`/channels/${owner.nickname}`)
        .set(...auth(subscriber.accessToken));

      expect(anonymous.status).toBe(200);
      expect((anonymous.body as ChannelBody).subscriberCount).toBe(1);
      expect((anonymous.body as ChannelBody).viewerState).toBeNull();
      expect((asSubscriber.body as ChannelBody).subscriberCount).toBe(1);
      expect((asSubscriber.body as ChannelBody).viewerState).toEqual({
        subscribed: true,
        isChannelOwner: false,
      });
    });
  });

  describe('GET /channels/:id/manage/videos', () => {
    it('should return real likes and comments counts per video', async () => {
      const owner = await registerConfirmAndLogin();
      const fan = await registerConfirmAndLogin();
      const busy = await createVideo(owner.channelId);
      const quiet = await createVideo(owner.channelId);
      await like(fan.accessToken, busy.id);
      const top = await commentRepository.save(
        commentRepository.create({
          video_id: busy.id,
          user_id: fan.userId,
          body: 'top',
        }),
      );
      await commentRepository.save(
        commentRepository.create({
          video_id: busy.id,
          user_id: owner.userId,
          parent_id: top.id,
          body: 'reply',
        }),
      );

      const res = await request(app.getHttpServer())
        .get(`/channels/${owner.channelId}/manage/videos`)
        .set(...auth(owner.accessToken));

      expect(res.status).toBe(200);
      const byId = new Map(
        (res.body as ManageBody).items.map((item) => [item.id, item]),
      );
      expect(byId.get(busy.id)?.likes).toBe(1);
      expect(byId.get(busy.id)?.comments).toBe(2);
      expect(byId.get(quiet.id)?.likes).toBe(0);
      expect(byId.get(quiet.id)?.comments).toBe(0);
      expect(byId.get(busy.id)?.views).toBe(0);
    });
  });
});
