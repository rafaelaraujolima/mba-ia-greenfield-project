import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
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
});
