import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { Category } from '../src/categories/entities/category.entity';
import { Channel } from '../src/channels/entities/channel.entity';
import { DomainExceptionFilter } from '../src/common/filters/domain-exception.filter';
import { ValidationExceptionFilter } from '../src/common/filters/validation-exception.filter';
import { cleanAllTables } from '../src/test/create-test-data-source';
import { Video, VideoStatus } from '../src/videos/entities/video.entity';

describe('Videos (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let categoryRepository: Repository<Category>;
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
    categoryRepository = dataSource.getRepository(Category);
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

  let userCounter = 0;
  async function registerConfirmAndLogin(): Promise<{
    accessToken: string;
    channelId: string;
  }> {
    const email = `videos_e2e_${++userCounter}@example.com`;
    const password = 'password123';
    const authService = app.get(AuthService);
    const mailServiceInstance = (authService as any).mailService;
    let capturedToken = '';
    jest
      .spyOn(mailServiceInstance, 'sendConfirmationEmail')
      .mockImplementationOnce(async (_e: string, _n: string, t: string) => {
        capturedToken = t;
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

    const channel = await channelRepository.findOneByOrFail({
      user_id: registerRes.body.id,
    });

    return { accessToken: loginRes.body.access_token, channelId: channel.id };
  }

  describe('POST /channels/:channelId/videos', () => {
    it('returns 201 with id, status draft and uploadId for a valid request', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();

      const res = await request(app.getHttpServer())
        .post(`/channels/${channelId}/videos`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'My video',
          contentType: 'video/mp4',
          fileSizeBytes: 1024,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe('draft');
      expect(res.body.uploadId).toBeTruthy();
    }, 20000);

    it('returns 403 with CHANNEL_NOT_OWNED for another user channel', async () => {
      const { channelId } = await registerConfirmAndLogin();
      const other = await registerConfirmAndLogin();

      const res = await request(app.getHttpServer())
        .post(`/channels/${channelId}/videos`)
        .set('Authorization', `Bearer ${other.accessToken}`)
        .send({ title: 'x', contentType: 'video/mp4', fileSizeBytes: 1024 })
        .expect(403);

      expect(res.body.error).toBe('CHANNEL_NOT_OWNED');
    }, 20000);

    it('returns 400 with FILE_SIZE_EXCEEDED when fileSizeBytes exceeds 10GB', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();

      const res = await request(app.getHttpServer())
        .post(`/channels/${channelId}/videos`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'x',
          contentType: 'video/mp4',
          fileSizeBytes: 10 * 1024 ** 3 + 1,
        })
        .expect(400);

      expect(res.body.error).toBe('FILE_SIZE_EXCEEDED');
    }, 20000);

    it('returns 401 without a bearer token', async () => {
      const { channelId } = await registerConfirmAndLogin();

      await request(app.getHttpServer())
        .post(`/channels/${channelId}/videos`)
        .send({ title: 'x', contentType: 'video/mp4', fileSizeBytes: 1024 })
        .expect(401);
    }, 20000);
  });

  describe('POST /videos/:id/upload-parts', () => {
    async function createDraftVideo(
      accessToken: string,
      channelId: string,
    ): Promise<string> {
      const res = await request(app.getHttpServer())
        .post(`/channels/${channelId}/videos`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'x', contentType: 'video/mp4', fileSizeBytes: 1024 });
      return res.body.id;
    }

    it('returns 200 with one URL per requested part number', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();
      const videoId = await createDraftVideo(accessToken, channelId);

      const res = await request(app.getHttpServer())
        .post(`/videos/${videoId}/upload-parts`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ partNumbers: [1, 2] })
        .expect(200);

      expect(res.body.parts).toHaveLength(2);
      expect(res.body.parts[0].partNumber).toBe(1);
      expect(res.body.parts[0].url).toBeTruthy();
    }, 20000);

    it('returns 409 with INVALID_VIDEO_STATE when video is not draft', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();
      const videoId = await createDraftVideo(accessToken, channelId);
      await videoRepository.update(videoId, { status: VideoStatus.READY });

      const res = await request(app.getHttpServer())
        .post(`/videos/${videoId}/upload-parts`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ partNumbers: [1] })
        .expect(409);

      expect(res.body.error).toBe('INVALID_VIDEO_STATE');
    }, 20000);

    it('returns 404 with VIDEO_NOT_FOUND for a non-existent video', async () => {
      const { accessToken } = await registerConfirmAndLogin();

      const res = await request(app.getHttpServer())
        .post('/videos/00000000-0000-0000-0000-000000000000/upload-parts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ partNumbers: [1] })
        .expect(404);

      expect(res.body.error).toBe('VIDEO_NOT_FOUND');
    }, 20000);
  });

  describe('POST /videos/:id/complete', () => {
    async function createDraftVideoWithUploadedPart(
      accessToken: string,
      channelId: string,
    ): Promise<{ videoId: string; eTag: string }> {
      const createRes = await request(app.getHttpServer())
        .post(`/channels/${channelId}/videos`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'x', contentType: 'video/mp4', fileSizeBytes: 1024 });
      const videoId = createRes.body.id;

      const partsRes = await request(app.getHttpServer())
        .post(`/videos/${videoId}/upload-parts`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ partNumbers: [1] });

      const uploadRes = await fetch(partsRes.body.parts[0].url, {
        method: 'PUT',
        body: Buffer.from('fake video bytes'),
      });
      const eTag = uploadRes.headers.get('etag')!;

      return { videoId, eTag };
    }

    it('returns 200 with status processing for valid parts', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();
      const { videoId, eTag } = await createDraftVideoWithUploadedPart(
        accessToken,
        channelId,
      );

      const res = await request(app.getHttpServer())
        .post(`/videos/${videoId}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ parts: [{ partNumber: 1, eTag }] })
        .expect(200);

      expect(res.body.id).toBe(videoId);
      expect(res.body.status).toBe('processing');
    }, 20000);

    it('returns 400 with VALIDATION_ERROR for empty parts', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();
      const { videoId } = await createDraftVideoWithUploadedPart(
        accessToken,
        channelId,
      );

      const res = await request(app.getHttpServer())
        .post(`/videos/${videoId}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ parts: [] })
        .expect(400);

      expect(res.body.error).toBe('VALIDATION_ERROR');
    }, 20000);

    it('returns 400 with INVALID_MULTIPART_COMPLETION for a wrong eTag', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();
      const { videoId } = await createDraftVideoWithUploadedPart(
        accessToken,
        channelId,
      );

      const res = await request(app.getHttpServer())
        .post(`/videos/${videoId}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ parts: [{ partNumber: 1, eTag: '"wrong-etag"' }] })
        .expect(400);

      expect(res.body.error).toBe('INVALID_MULTIPART_COMPLETION');
    }, 20000);

    it('returns 409 with INVALID_VIDEO_STATE when video is not draft', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();
      const { videoId, eTag } = await createDraftVideoWithUploadedPart(
        accessToken,
        channelId,
      );
      await videoRepository.update(videoId, { status: VideoStatus.READY });

      const res = await request(app.getHttpServer())
        .post(`/videos/${videoId}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ parts: [{ partNumber: 1, eTag }] })
        .expect(409);

      expect(res.body.error).toBe('INVALID_VIDEO_STATE');
    }, 20000);
  });

  describe('GET /videos/:id', () => {
    async function createVideo(
      channelId: string,
      status: VideoStatus,
    ): Promise<string> {
      const video = await videoRepository.save(
        videoRepository.create({
          channel_id: channelId,
          title: 'My video',
          status,
          storage_key: `videos/${channelId}/original.mp4`,
        }),
      );
      return video.id;
    }

    it('returns 200 with metadata for a ready video, without authentication', async () => {
      const { channelId } = await registerConfirmAndLogin();
      const videoId = await createVideo(channelId, VideoStatus.READY);

      const res = await request(app.getHttpServer())
        .get(`/videos/${videoId}`)
        .expect(200);

      expect(res.body.id).toBe(videoId);
      expect(res.body.status).toBe('ready');
    });

    it('returns 404 for a draft video accessed anonymously', async () => {
      const { channelId } = await registerConfirmAndLogin();
      const videoId = await createVideo(channelId, VideoStatus.DRAFT);

      const res = await request(app.getHttpServer())
        .get(`/videos/${videoId}`)
        .expect(404);

      expect(res.body.error).toBe('VIDEO_NOT_FOUND');
    });

    it('returns 404 for a draft video accessed by a non-owner', async () => {
      const { channelId } = await registerConfirmAndLogin();
      const other = await registerConfirmAndLogin();
      const videoId = await createVideo(channelId, VideoStatus.DRAFT);

      const res = await request(app.getHttpServer())
        .get(`/videos/${videoId}`)
        .set('Authorization', `Bearer ${other.accessToken}`)
        .expect(404);

      expect(res.body.error).toBe('VIDEO_NOT_FOUND');
    });

    it('returns 200 with status draft for the owner', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();
      const videoId = await createVideo(channelId, VideoStatus.DRAFT);

      const res = await request(app.getHttpServer())
        .get(`/videos/${videoId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.status).toBe('draft');
    });
  });

  describe('PATCH /videos/:id', () => {
    async function createVideo(channelId: string): Promise<string> {
      const video = await videoRepository.save(
        videoRepository.create({
          channel_id: channelId,
          title: 'My video',
          storage_key: `videos/${channelId}/original.mp4`,
        }),
      );
      return video.id;
    }

    it('returns 200 with the updated title for the owner', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();
      const videoId = await createVideo(channelId);

      const res = await request(app.getHttpServer())
        .patch(`/videos/${videoId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Updated title' })
        .expect(200);

      expect(res.body.title).toBe('Updated title');
    });

    it('returns 403 when the video belongs to another channel', async () => {
      const { channelId } = await registerConfirmAndLogin();
      const other = await registerConfirmAndLogin();
      const videoId = await createVideo(channelId);

      const res = await request(app.getHttpServer())
        .patch(`/videos/${videoId}`)
        .set('Authorization', `Bearer ${other.accessToken}`)
        .send({ title: 'Hijacked' })
        .expect(403);

      expect(res.body.error).toBe('VIDEO_NOT_OWNED');
    });

    it('returns 404 when categoryId does not match an existing category', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();
      const videoId = await createVideo(channelId);

      const res = await request(app.getHttpServer())
        .patch(`/videos/${videoId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ categoryId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);

      expect(res.body.error).toBe('CATEGORY_NOT_FOUND');
    });

    it('returns 404 when the video does not exist', async () => {
      const { accessToken } = await registerConfirmAndLogin();

      const res = await request(app.getHttpServer())
        .patch('/videos/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Ghost' })
        .expect(404);

      expect(res.body.error).toBe('VIDEO_NOT_FOUND');
    });

    it('updates the category when categoryId matches an existing category', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();
      const videoId = await createVideo(channelId);
      const category = await categoryRepository.save(
        categoryRepository.create({ name: 'Music' }),
      );

      const res = await request(app.getHttpServer())
        .patch(`/videos/${videoId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ categoryId: category.id })
        .expect(200);

      expect(res.body.categoryId).toBe(category.id);
    });
  });

  describe('POST /videos/:id/thumbnail', () => {
    async function createVideo(channelId: string): Promise<string> {
      const video = await videoRepository.save(
        videoRepository.create({
          channel_id: channelId,
          title: 'My video',
          storage_key: `videos/${channelId}/original.mp4`,
        }),
      );
      return video.id;
    }

    it('returns 200 and overwrites thumbnail_key for a valid image', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();
      const videoId = await createVideo(channelId);

      const res = await request(app.getHttpServer())
        .post(`/videos/${videoId}/thumbnail`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('thumbnail', Buffer.from('fake-image-bytes'), {
          filename: 'thumb.png',
          contentType: 'image/png',
        })
        .expect(200);

      expect(res.body.thumbnailKey).toBe(`videos/${videoId}/thumbnail.jpg`);
    }, 20000);

    it('returns 400 with INVALID_FILE_TYPE for a non-image file', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();
      const videoId = await createVideo(channelId);

      const res = await request(app.getHttpServer())
        .post(`/videos/${videoId}/thumbnail`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('thumbnail', Buffer.from('not-an-image'), {
          filename: 'doc.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);

      expect(res.body.error).toBe('INVALID_FILE_TYPE');
    });

    it('returns 403 when the video belongs to another channel', async () => {
      const { channelId } = await registerConfirmAndLogin();
      const other = await registerConfirmAndLogin();
      const videoId = await createVideo(channelId);

      const res = await request(app.getHttpServer())
        .post(`/videos/${videoId}/thumbnail`)
        .set('Authorization', `Bearer ${other.accessToken}`)
        .attach('thumbnail', Buffer.from('fake-image-bytes'), {
          filename: 'thumb.png',
          contentType: 'image/png',
        })
        .expect(403);

      expect(res.body.error).toBe('VIDEO_NOT_OWNED');
    });
  });

  describe('POST /videos/:id/publish', () => {
    async function createVideo(
      channelId: string,
      status: VideoStatus,
      publishedAt: Date | null = null,
    ): Promise<string> {
      const video = await videoRepository.save(
        videoRepository.create({
          channel_id: channelId,
          title: 'My video',
          status,
          published_at: publishedAt,
          storage_key: `videos/${channelId}/original.mp4`,
        }),
      );
      return video.id;
    }

    it('returns 200 with publishedAt for a ready, unpublished video', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();
      const videoId = await createVideo(channelId, VideoStatus.READY);

      const res = await request(app.getHttpServer())
        .post(`/videos/${videoId}/publish`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(videoId);
      expect(res.body.publishedAt).toBeTruthy();
    });

    it('returns 409 with INVALID_VIDEO_STATE when the video is not ready', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();
      const videoId = await createVideo(channelId, VideoStatus.PROCESSING);

      const res = await request(app.getHttpServer())
        .post(`/videos/${videoId}/publish`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);

      expect(res.body.error).toBe('INVALID_VIDEO_STATE');
    });

    it('returns 409 with INVALID_VIDEO_STATE when the video is already published', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();
      const videoId = await createVideo(
        channelId,
        VideoStatus.READY,
        new Date(),
      );

      const res = await request(app.getHttpServer())
        .post(`/videos/${videoId}/publish`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);

      expect(res.body.error).toBe('INVALID_VIDEO_STATE');
    });

    it('returns 403 when the video belongs to another channel', async () => {
      const { channelId } = await registerConfirmAndLogin();
      const other = await registerConfirmAndLogin();
      const videoId = await createVideo(channelId, VideoStatus.READY);

      const res = await request(app.getHttpServer())
        .post(`/videos/${videoId}/publish`)
        .set('Authorization', `Bearer ${other.accessToken}`)
        .expect(403);

      expect(res.body.error).toBe('VIDEO_NOT_OWNED');
    });
  });

  describe('GET /channels/:id/manage/videos', () => {
    async function createVideos(channelId: string, count: number) {
      for (let i = 1; i <= count; i++) {
        await videoRepository.save(
          videoRepository.create({
            channel_id: channelId,
            title: `Video ${i}`,
            storage_key: `videos/${channelId}/${i}.mp4`,
          }),
        );
      }
    }

    it('returns 200 with paginated items and placeholder counters for the owner', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();
      await createVideos(channelId, 3);

      const res = await request(app.getHttpServer())
        .get(`/channels/${channelId}/manage/videos`)
        .query({ page: 1, pageSize: 2 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.total).toBe(3);
      expect(res.body.page).toBe(1);
      expect(res.body.pageSize).toBe(2);
      expect(res.body.items[0]).toMatchObject({
        views: 0,
        likes: 0,
        comments: 0,
      });
    });

    it('returns 403 with CHANNEL_NOT_OWNED for another user channel', async () => {
      const { channelId } = await registerConfirmAndLogin();
      const other = await registerConfirmAndLogin();

      const res = await request(app.getHttpServer())
        .get(`/channels/${channelId}/manage/videos`)
        .set('Authorization', `Bearer ${other.accessToken}`)
        .expect(403);

      expect(res.body.error).toBe('CHANNEL_NOT_OWNED');
    });

    it('returns 401 without a bearer token', async () => {
      const { channelId } = await registerConfirmAndLogin();

      await request(app.getHttpServer())
        .get(`/channels/${channelId}/manage/videos`)
        .expect(401);
    });

    it('returns 400 when pageSize is out of range', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();

      await request(app.getHttpServer())
        .get(`/channels/${channelId}/manage/videos`)
        .query({ pageSize: 0 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('GET /videos/:id/stream', () => {
    it('returns 302 redirecting to a pre-signed URL for a ready video', async () => {
      const { channelId } = await registerConfirmAndLogin();
      const video = await videoRepository.save(
        videoRepository.create({
          channel_id: channelId,
          title: 'x',
          status: VideoStatus.READY,
          storage_key: `videos/${channelId}/original.mp4`,
        }),
      );

      const res = await request(app.getHttpServer())
        .get(`/videos/${video.id}/stream`)
        .expect(302);

      expect(res.headers.location).toContain(video.storage_key);
      expect(res.headers.location).not.toContain(
        'response-content-disposition',
      );
    });

    it('returns 409 with INVALID_VIDEO_STATE for a non-ready video', async () => {
      const { channelId } = await registerConfirmAndLogin();
      const video = await videoRepository.save(
        videoRepository.create({
          channel_id: channelId,
          title: 'x',
          status: VideoStatus.PROCESSING,
          storage_key: `videos/${channelId}/original.mp4`,
        }),
      );

      const res = await request(app.getHttpServer())
        .get(`/videos/${video.id}/stream`)
        .expect(409);

      expect(res.body.error).toBe('INVALID_VIDEO_STATE');
    });
  });

  describe('GET /videos/:id/download', () => {
    it('returns 302 redirecting to a pre-signed attachment URL', async () => {
      const { channelId } = await registerConfirmAndLogin();
      const video = await videoRepository.save(
        videoRepository.create({
          channel_id: channelId,
          title: 'x',
          status: VideoStatus.READY,
          storage_key: `videos/${channelId}/original.mp4`,
        }),
      );

      const res = await request(app.getHttpServer())
        .get(`/videos/${video.id}/download`)
        .expect(302);

      expect(res.headers.location).toContain(
        'response-content-disposition=attachment',
      );
    });

    it('returns 404 with VIDEO_NOT_FOUND for a non-existent video', async () => {
      const res = await request(app.getHttpServer())
        .get('/videos/00000000-0000-0000-0000-000000000000/download')
        .expect(404);

      expect(res.body.error).toBe('VIDEO_NOT_FOUND');
    });
  });
});
