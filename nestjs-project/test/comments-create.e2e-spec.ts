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
  channelName: string;
  nickname: string;
}

interface CommentBody {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  author: { channelName: string; channelNickname: string };
  likeCount: number;
  replyCount: number;
  viewerState: { reaction: string | null } | null;
}

const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000000';

describe('Comments — create (e2e)', () => {
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
    const email = `comments_create_e2e_${++authCounter}@example.com`;
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
      channelName: channel.name,
      nickname: channel.nickname,
    };
  }

  let videoCounter = 0;
  async function createVideo(
    channelId: string,
    overrides: Partial<Video> = {},
  ): Promise<Video> {
    return videoRepository.save(
      videoRepository.create({
        channel_id: channelId,
        title: `Commented video ${++videoCounter}`,
        storage_key: `videos/${channelId}/${videoCounter}.mp4`,
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
      }),
    );
  }

  function postComment(
    token: string,
    videoId: string,
    payload: Record<string, unknown>,
  ) {
    return request(app.getHttpServer())
      .post(`/videos/${videoId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
  }

  it('should create a top-level comment and answer 201 with the item', async () => {
    const owner = await registerConfirmAndLogin();
    const author = await registerConfirmAndLogin();
    const video = await createVideo(owner.channelId);

    const res = await postComment(author.accessToken, video.id, {
      body: 'texto',
    });

    expect(res.status).toBe(201);
    const body = res.body as CommentBody;
    expect(body.body).toBe('texto');
    expect(body.parentId).toBeNull();
    expect(body.likeCount).toBe(0);
    expect(body.replyCount).toBe(0);
    expect(body.author).toEqual({
      channelName: author.channelName,
      channelNickname: author.nickname,
    });
    expect(body.viewerState).toEqual({ reaction: null });
    expect(typeof body.createdAt).toBe('string');
    expect(await commentRepository.countBy({ video_id: video.id })).toBe(1);
  });

  it('should create a reply when parentId is a top-level comment of the same video', async () => {
    const owner = await registerConfirmAndLogin();
    const author = await registerConfirmAndLogin();
    const video = await createVideo(owner.channelId);
    const top = await postComment(author.accessToken, video.id, {
      body: 'topo',
    });

    const res = await postComment(author.accessToken, video.id, {
      body: 'resposta',
      parentId: (top.body as CommentBody).id,
    });

    expect(res.status).toBe(201);
    expect((res.body as CommentBody).parentId).toBe(
      (top.body as CommentBody).id,
    );
  });

  it('should answer 400 COMMENT_DEPTH_EXCEEDED when replying to a reply', async () => {
    const owner = await registerConfirmAndLogin();
    const author = await registerConfirmAndLogin();
    const video = await createVideo(owner.channelId);
    const top = await postComment(author.accessToken, video.id, {
      body: 'topo',
    });
    const reply = await postComment(author.accessToken, video.id, {
      body: 'resposta',
      parentId: (top.body as CommentBody).id,
    });

    const res = await postComment(author.accessToken, video.id, {
      body: 'fundo demais',
      parentId: (reply.body as CommentBody).id,
    });

    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toBe(
      'COMMENT_DEPTH_EXCEEDED',
    );
  });

  it('should answer 404 COMMENT_NOT_FOUND for an unknown parent and for a parent of another video', async () => {
    const owner = await registerConfirmAndLogin();
    const author = await registerConfirmAndLogin();
    const video = await createVideo(owner.channelId);
    const otherVideo = await createVideo(owner.channelId);
    const foreign = await postComment(author.accessToken, otherVideo.id, {
      body: 'em outro vídeo',
    });

    const unknown = await postComment(author.accessToken, video.id, {
      body: 'x',
      parentId: UNKNOWN_UUID,
    });
    const crossVideo = await postComment(author.accessToken, video.id, {
      body: 'x',
      parentId: (foreign.body as CommentBody).id,
    });

    expect(unknown.status).toBe(404);
    expect((unknown.body as { error: string }).error).toBe('COMMENT_NOT_FOUND');
    expect(crossVideo.status).toBe(404);
    expect((crossVideo.body as { error: string }).error).toBe(
      'COMMENT_NOT_FOUND',
    );
  });

  it('should answer 400 when the body is empty or only whitespace', async () => {
    const owner = await registerConfirmAndLogin();
    const author = await registerConfirmAndLogin();
    const video = await createVideo(owner.channelId);

    const empty = await postComment(author.accessToken, video.id, {
      body: '',
    });
    const blank = await postComment(author.accessToken, video.id, {
      body: '   ',
    });

    expect(empty.status).toBe(400);
    expect(blank.status).toBe(400);
    expect(await commentRepository.count()).toBe(0);
  });

  it('should answer 404 VIDEO_NOT_FOUND for an unknown or unpublished video', async () => {
    const owner = await registerConfirmAndLogin();
    const author = await registerConfirmAndLogin();
    const draft = await createVideo(owner.channelId, {
      status: VideoStatus.DRAFT,
      published_at: null,
    });

    const unknown = await postComment(author.accessToken, UNKNOWN_UUID, {
      body: 'olá',
    });
    const hidden = await postComment(author.accessToken, draft.id, {
      body: 'olá',
    });

    expect(unknown.status).toBe(404);
    expect((unknown.body as { error: string }).error).toBe('VIDEO_NOT_FOUND');
    expect(hidden.status).toBe(404);
    expect((hidden.body as { error: string }).error).toBe('VIDEO_NOT_FOUND');
  });

  it('should answer 401 without a token', async () => {
    const owner = await registerConfirmAndLogin();
    const video = await createVideo(owner.channelId);

    const res = await request(app.getHttpServer())
      .post(`/videos/${video.id}/comments`)
      .send({ body: 'olá' });

    expect(res.status).toBe(401);
  });
});
