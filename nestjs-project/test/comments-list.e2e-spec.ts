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
}

interface CommentItemBody {
  id: string;
  parentId: string | null;
  likeCount: number;
  replyCount: number;
  viewerState: { reaction: string | null } | null;
}

interface PageBody {
  items: CommentItemBody[];
  nextCursor: string | null;
  totalCount?: number;
}

const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000000';

describe('Comments — list and replies (e2e)', () => {
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
    const email = `comments_list_e2e_${++authCounter}@example.com`;
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

    return { accessToken, userId, email, channelId: channel.id };
  }

  async function createVideo(
    channelId: string,
    overrides: Partial<Video> = {},
  ): Promise<Video> {
    return videoRepository.save(
      videoRepository.create({
        channel_id: channelId,
        title: 'Commented video',
        storage_key: `videos/${channelId}/original.mp4`,
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
      }),
    );
  }

  async function seedComment(
    videoId: string,
    userId: string,
    minute: number,
    overrides: Partial<Comment> = {},
  ): Promise<Comment> {
    const createdAt = new Date(Date.UTC(2026, 1, 1, 0, minute, 0));
    return commentRepository.save(
      commentRepository.create({
        video_id: videoId,
        user_id: userId,
        body: `comment ${minute}`,
        created_at: createdAt,
        ...overrides,
      }),
    );
  }

  describe('GET /videos/:id/comments', () => {
    it('should list top-level comments newest first for an anonymous visitor', async () => {
      const owner = await registerConfirmAndLogin();
      const video = await createVideo(owner.channelId);
      const older = await seedComment(video.id, owner.userId, 1);
      const newer = await seedComment(video.id, owner.userId, 2);
      await seedComment(video.id, owner.userId, 3, { parent_id: older.id });

      const res = await request(app.getHttpServer()).get(
        `/videos/${video.id}/comments`,
      );

      expect(res.status).toBe(200);
      const body = res.body as PageBody;
      expect(body.items.map((item) => item.id)).toEqual([newer.id, older.id]);
      expect(body.nextCursor).toBeNull();
      expect(body.totalCount).toBe(3);
      expect(body.items.every((item) => item.viewerState === null)).toBe(true);
      expect(body.items[1].replyCount).toBe(1);
    });

    it('should fill viewerState.reaction for the authenticated viewer', async () => {
      const owner = await registerConfirmAndLogin();
      const viewer = await registerConfirmAndLogin();
      const video = await createVideo(owner.channelId);
      const liked = await seedComment(video.id, owner.userId, 1);
      const untouched = await seedComment(video.id, owner.userId, 2);
      await request(app.getHttpServer())
        .put(`/comments/${liked.id}/reaction`)
        .set('Authorization', `Bearer ${viewer.accessToken}`)
        .send({ type: 'like' });

      const res = await request(app.getHttpServer())
        .get(`/videos/${video.id}/comments`)
        .set('Authorization', `Bearer ${viewer.accessToken}`);

      expect(res.status).toBe(200);
      const byId = new Map(
        (res.body as PageBody).items.map((item) => [item.id, item]),
      );
      expect(byId.get(liked.id)?.viewerState).toEqual({ reaction: 'like' });
      expect(byId.get(liked.id)?.likeCount).toBe(1);
      expect(byId.get(untouched.id)?.viewerState).toEqual({ reaction: null });
    });

    it('should treat an expired token as anonymous instead of answering 401', async () => {
      const owner = await registerConfirmAndLogin();
      const viewer = await registerConfirmAndLogin();
      const video = await createVideo(owner.channelId);
      await seedComment(video.id, owner.userId, 1);
      const expired = await app
        .get(JwtService)
        .signAsync(
          { sub: viewer.userId, email: viewer.email },
          { expiresIn: -60 },
        );

      const res = await request(app.getHttpServer())
        .get(`/videos/${video.id}/comments`)
        .set('Authorization', `Bearer ${expired}`);

      expect(res.status).toBe(200);
      expect(
        (res.body as PageBody).items.every((item) => item.viewerState === null),
      ).toBe(true);
    });

    it('should paginate with the cursor without repeating items and reject a bad cursor', async () => {
      const owner = await registerConfirmAndLogin();
      const video = await createVideo(owner.channelId);
      const created: Comment[] = [];
      for (let minute = 1; minute <= 5; minute++) {
        created.push(await seedComment(video.id, owner.userId, minute));
      }

      const first = await request(app.getHttpServer())
        .get(`/videos/${video.id}/comments`)
        .query({ limit: 2 });
      const firstBody = first.body as PageBody;
      const second = await request(app.getHttpServer())
        .get(`/videos/${video.id}/comments`)
        .query({ limit: 2, cursor: firstBody.nextCursor });
      const secondBody = second.body as PageBody;
      const third = await request(app.getHttpServer())
        .get(`/videos/${video.id}/comments`)
        .query({ limit: 2, cursor: secondBody.nextCursor });
      const thirdBody = third.body as PageBody;

      const seen = [
        ...firstBody.items,
        ...secondBody.items,
        ...thirdBody.items,
      ].map((item) => item.id);
      expect(seen).toEqual([...created].reverse().map((c) => c.id));
      expect(thirdBody.nextCursor).toBeNull();

      const invalid = await request(app.getHttpServer())
        .get(`/videos/${video.id}/comments`)
        .query({ cursor: 'lixo' });
      expect(invalid.status).toBe(400);
      expect((invalid.body as { error: string }).error).toBe('INVALID_CURSOR');
    });

    it('should answer 404 VIDEO_NOT_FOUND for an unknown or unpublished video', async () => {
      const owner = await registerConfirmAndLogin();
      const draft = await createVideo(owner.channelId, {
        status: VideoStatus.DRAFT,
        published_at: null,
      });

      const unknown = await request(app.getHttpServer()).get(
        `/videos/${UNKNOWN_UUID}/comments`,
      );
      const hidden = await request(app.getHttpServer()).get(
        `/videos/${draft.id}/comments`,
      );

      expect(unknown.status).toBe(404);
      expect(hidden.status).toBe(404);
      expect((hidden.body as { error: string }).error).toBe('VIDEO_NOT_FOUND');
    });
  });

  describe('GET /comments/:id/replies', () => {
    it('should list the replies of a top-level comment', async () => {
      const owner = await registerConfirmAndLogin();
      const video = await createVideo(owner.channelId);
      const top = await seedComment(video.id, owner.userId, 1);
      const olderReply = await seedComment(video.id, owner.userId, 2, {
        parent_id: top.id,
      });
      const newerReply = await seedComment(video.id, owner.userId, 3, {
        parent_id: top.id,
      });

      const res = await request(app.getHttpServer()).get(
        `/comments/${top.id}/replies`,
      );

      expect(res.status).toBe(200);
      const body = res.body as PageBody;
      expect(body.items.map((item) => item.id)).toEqual([
        newerReply.id,
        olderReply.id,
      ]);
      expect(body.items.every((item) => item.parentId === top.id)).toBe(true);
      expect(body.nextCursor).toBeNull();
    });

    it('should answer 404 COMMENT_NOT_FOUND for an unknown comment and for a reply', async () => {
      const owner = await registerConfirmAndLogin();
      const video = await createVideo(owner.channelId);
      const top = await seedComment(video.id, owner.userId, 1);
      const reply = await seedComment(video.id, owner.userId, 2, {
        parent_id: top.id,
      });

      const unknown = await request(app.getHttpServer()).get(
        `/comments/${UNKNOWN_UUID}/replies`,
      );
      const ofReply = await request(app.getHttpServer()).get(
        `/comments/${reply.id}/replies`,
      );

      expect(unknown.status).toBe(404);
      expect((unknown.body as { error: string }).error).toBe(
        'COMMENT_NOT_FOUND',
      );
      expect(ofReply.status).toBe(404);
      expect((ofReply.body as { error: string }).error).toBe(
        'COMMENT_NOT_FOUND',
      );
    });
  });
});
