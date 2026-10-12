import { INestApplication, ValidationPipe } from '@nestjs/common';
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
import { CommentReaction } from '../src/reactions/entities/comment-reaction.entity';
import { ReactionType } from '../src/reactions/entities/reaction-type.enum';
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

describe('Comment reactions (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let commentRepository: Repository<Comment>;
  let reactionRepository: Repository<CommentReaction>;
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
    reactionRepository = dataSource.getRepository(CommentReaction);
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
    const email = `comment_reactions_e2e_${++authCounter}@example.com`;
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

  async function createComment(author: TestUser): Promise<Comment> {
    const video = await videoRepository.save(
      videoRepository.create({
        channel_id: author.channelId,
        title: 'Commented video',
        storage_key: `videos/${author.channelId}/original.mp4`,
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: new Date('2026-01-01T00:00:00Z'),
      }),
    );
    return commentRepository.save(
      commentRepository.create({
        video_id: video.id,
        user_id: author.userId,
        body: 'A comment',
      }),
    );
  }

  describe('PUT /comments/:id/reaction', () => {
    it('should create a single like reaction and answer 204', async () => {
      const viewer = await registerConfirmAndLogin();
      const author = await registerConfirmAndLogin();
      const comment = await createComment(author);

      const res = await request(app.getHttpServer())
        .put(`/comments/${comment.id}/reaction`)
        .set('Authorization', `Bearer ${viewer.accessToken}`)
        .send({ type: 'like' });

      expect(res.status).toBe(204);
      const rows = await reactionRepository.findBy({
        user_id: viewer.userId,
        comment_id: comment.id,
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].type).toBe(ReactionType.LIKE);
    });

    it('should replace the like with a dislike, keeping a single row', async () => {
      const viewer = await registerConfirmAndLogin();
      const author = await registerConfirmAndLogin();
      const comment = await createComment(author);
      const url = `/comments/${comment.id}/reaction`;

      await request(app.getHttpServer())
        .put(url)
        .set('Authorization', `Bearer ${viewer.accessToken}`)
        .send({ type: 'like' });
      const dislike = await request(app.getHttpServer())
        .put(url)
        .set('Authorization', `Bearer ${viewer.accessToken}`)
        .send({ type: 'dislike' });

      expect(dislike.status).toBe(204);
      const rows = await reactionRepository.findBy({
        user_id: viewer.userId,
        comment_id: comment.id,
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].type).toBe(ReactionType.DISLIKE);
    });

    it('should answer 404 COMMENT_NOT_FOUND for an unknown comment', async () => {
      const viewer = await registerConfirmAndLogin();

      const res = await request(app.getHttpServer())
        .put(`/comments/${UNKNOWN_UUID}/reaction`)
        .set('Authorization', `Bearer ${viewer.accessToken}`)
        .send({ type: 'like' });

      expect(res.status).toBe(404);
      expect((res.body as { error: string }).error).toBe('COMMENT_NOT_FOUND');
    });

    it('should answer 400 for an invalid type', async () => {
      const viewer = await registerConfirmAndLogin();
      const author = await registerConfirmAndLogin();
      const comment = await createComment(author);

      const res = await request(app.getHttpServer())
        .put(`/comments/${comment.id}/reaction`)
        .set('Authorization', `Bearer ${viewer.accessToken}`)
        .send({ type: 'love' });

      expect(res.status).toBe(400);
      expect(await reactionRepository.count()).toBe(0);
    });

    it('should answer 401 without a token', async () => {
      const author = await registerConfirmAndLogin();
      const comment = await createComment(author);

      const res = await request(app.getHttpServer())
        .put(`/comments/${comment.id}/reaction`)
        .send({ type: 'like' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /comments/:id/reaction', () => {
    it('should remove the reaction and stay idempotent', async () => {
      const viewer = await registerConfirmAndLogin();
      const author = await registerConfirmAndLogin();
      const comment = await createComment(author);
      const url = `/comments/${comment.id}/reaction`;
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

    it('should answer 404 COMMENT_NOT_FOUND for an unknown comment', async () => {
      const viewer = await registerConfirmAndLogin();

      const res = await request(app.getHttpServer())
        .delete(`/comments/${UNKNOWN_UUID}/reaction`)
        .set('Authorization', `Bearer ${viewer.accessToken}`);

      expect(res.status).toBe(404);
      expect((res.body as { error: string }).error).toBe('COMMENT_NOT_FOUND');
    });

    it('should answer 401 without a token', async () => {
      const author = await registerConfirmAndLogin();
      const comment = await createComment(author);

      const res = await request(app.getHttpServer()).delete(
        `/comments/${comment.id}/reaction`,
      );

      expect(res.status).toBe(401);
    });
  });
});
